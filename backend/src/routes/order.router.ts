import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        realtime: {
          transport: ws as any
        }
      }
    );
  }
  return supabaseInstance;
}

const router = Router();

// In-memory queue for order processing
interface QueuedOrder {
  id: string;
  data: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class OrderQueue {
  private queue: QueuedOrder[] = [];
  private processing = false;

  async add(orderData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const queuedOrder: QueuedOrder = {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        data: orderData,
        resolve,
        reject
      };
      
      this.queue.push(queuedOrder);
      this.processNext();
    });
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const order = this.queue.shift()!;
    
    try {
      const result = await this.processOrder(order.data);
      order.resolve(result);
    } catch (error) {
      order.reject(error);
    } finally {
      this.processing = false;
      // Process next order in queue
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  private async processOrder(orderData: any) {
    const {
      items,
      voucher_code,
      user_id,
      total_amount,
      discount_amount,
      final_amount
    } = orderData;

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Start transaction
    const { data: order, error: orderError } = await getSupabase()
      .from('guest_orders')
      .insert({
        order_number: orderNumber,
        user_id: user_id || null,
        status: 'pending',
        total_amount_minor: total_amount,
        discount_amount_minor: discount_amount || 0,
        final_amount_minor: final_amount,
        voucher_code_id: voucher_code?.id || null,
        payment_status: 'pending',
        metadata: {
          voucher_code: voucher_code?.code || null,
          items_count: items ? items.length : 0
        }
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      quantity: 1,
      unit_price_minor: item.unit_price_minor,
      total_price_minor: item.unit_price_minor,
      customer_phone: item.customer_phone,
      customer_email: item.customer_email || null,
      status: 'pending',
      metadata: item.metadata || {}
    }));

    const { data: insertedItems, error: itemsError } = await getSupabase()
      .from('guest_order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      // Rollback: delete order
      await getSupabase().from('guest_orders').delete().eq('id', order.id);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    // If voucher was used, record usage
    if (voucher_code?.id) {
      const { error: usageError } = await getSupabase()
        .from('voucher_usage')
        .insert({
          voucher_code_id: voucher_code.id,
          order_id: order.id,
          user_id: user_id || null,
          discount_amount: discount_amount,
          original_amount: total_amount,
          final_amount: final_amount
        });

      if (usageError) {
        console.error('Failed to record voucher usage:', usageError);
        // Don't rollback order, just log the error
      }
    }

    return {
      order,
      items: insertedItems
    };
  }
}

const orderQueue = new OrderQueue();

// Create multi-item order
router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      items,
      voucher_code,
      user_id
    } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.product_id || !item.product_sku || !item.product_name || 
          !item.unit_price_minor || !item.customer_phone) {
        return res.status(400).json({ 
          error: 'Each item must have product_id, product_sku, product_name, unit_price_minor, and customer_phone' 
        });
      }
    }

    // Calculate totals
    const total_amount = items.reduce((sum: number, item: any) => sum + item.unit_price_minor, 0);
    let discount_amount = 0;
    let final_amount = total_amount;

    // Apply voucher if provided
    if (voucher_code?.code) {
      // Validate voucher
      const validateResponse = await fetch(`http://localhost:${process.env.PORT || 3001}/api/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucher_code.code,
          amount: total_amount,
          base_price: voucher_code.base_price,
          reseller_price: voucher_code.reseller_price
        })
      });

      const voucherValidation = await validateResponse.json();
      
      if (!voucherValidation.valid) {
        return res.status(400).json({ 
          error: voucherValidation.error || 'Invalid voucher code' 
        });
      }

      discount_amount = voucherValidation.calculation?.discount_amount || 0;
      final_amount = voucherValidation.calculation?.final_amount || total_amount;
      voucher_code.id = voucherValidation.voucher?.id;
    }

    // Add to queue for processing
    const result = await orderQueue.add({
      items,
      voucher_code,
      user_id,
      total_amount,
      discount_amount,
      final_amount
    });

    return res.json({
      success: true,
      order: result.order,
      items: result.items,
      summary: {
        total_items: items.length,
        total_amount,
        discount_amount,
        final_amount
      }
    });

  } catch (error: any) {
    console.error('Order creation error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to create order'
    });
  }
});

// Get order by ID
router.get('/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const { data: order, error: orderError } = await getSupabase()
      .from('guest_orders')
      .select(`
        *,
        guest_order_items (*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json({ order });

  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get orders list
router.get('/', async (req: Request, res: Response) => {
  try {
    const { user_id, status, limit = 50, offset = 0 } = req.query;

    let query = getSupabase()
      .from('guest_orders')
      .select(`
        *,
        guest_order_items (count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      throw error;
    }

    return res.json({
      orders: orders || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset)
    });

  } catch (error) {
    console.error('List orders error:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
router.put('/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, payment_status } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;

    const { data: order, error } = await getSupabase()
      .from('guest_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({ success: true, order });

  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;


import { Router, Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import {
  voucherValidateSchema,
  voucherApplySchema,
  voucherCreateSchema,
  voucherUpdateSchema,
  zodValidate
} from '../shared/validation';

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

// Validate voucher code
router.post('/validate', zodValidate(voucherValidateSchema), async (req: Request, res: Response) => {
  try {
    const { code, product_id, amount, base_price, reseller_price } = req.body;
    const { data: voucher, error: fetchError } = await getSupabase()
      .from('voucher_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (fetchError || !voucher) {
      return res.status(404).json({ 
        error: 'Voucher code not found',
        valid: false 
      });
    }

    // Validation checks
    const now = new Date();
    const validFrom = voucher.valid_from ? new Date(voucher.valid_from) : null;
    const validUntil = voucher.valid_until ? new Date(voucher.valid_until) : null;

    if (!voucher.is_active) {
      return res.status(400).json({ 
        error: 'Voucher is not active',
        valid: false 
      });
    }

    if (validFrom && now < validFrom) {
      return res.status(400).json({ 
        error: 'Voucher is not yet valid',
        valid: false 
      });
    }

    if (validUntil && now > validUntil) {
      return res.status(400).json({ 
        error: 'Voucher has expired',
        valid: false 
      });
    }

    if (voucher.max_usage && voucher.current_usage >= voucher.max_usage) {
      return res.status(400).json({ 
        error: 'Voucher usage limit reached',
        valid: false 
      });
    }

    // Check applies_to filters
    const appliesTo = voucher.applies_to || {};
    
    if (appliesTo.min_amount && amount < appliesTo.min_amount) {
      return res.status(400).json({ 
        error: `Minimum amount required: Rp ${(appliesTo.min_amount / 100).toLocaleString('id-ID')}`,
        valid: false 
      });
    }

    if (appliesTo.categories && product_id) {
      // TODO: Check if product category matches
      // For now, skip this check
    }

    // Calculate discount
    let discountAmount = 0;
    let maxDiscount = amount; // Default: discount can't exceed total amount
    
    // For reseller vouchers, discount is limited by profit margin
    if (voucher.type === 'reseller') {
      if (!base_price || !reseller_price) {
        return res.status(400).json({
          error: 'Reseller voucher requires base_price and reseller_price',
          valid: false
        });
      }
      
      const profit = reseller_price - base_price;
      if (profit <= 0) {
        return res.status(400).json({
          error: 'Invalid pricing: reseller price must be higher than base price',
          valid: false
        });
      }
      
      // Reseller discount limited to 50% of profit margin
      maxDiscount = Math.floor(profit * 0.5);
    }
    
    if (voucher.discount_type === 'percentage') {
      discountAmount = Math.floor((amount * voucher.discount_value) / 10000); // discount_value in basis points (100 = 1%)
    } else {
      discountAmount = voucher.discount_value;
    }

    // Ensure discount doesn't exceed maximum allowed
    discountAmount = Math.min(discountAmount, maxDiscount);

    const finalAmount = amount - discountAmount;
    
    // Calculate effective discount percentage (what customer sees)
    const effectiveDiscountPercentage = amount > 0 
      ? Math.round((discountAmount / amount) * 10000) / 100 // 2 decimal places
      : 0;

    return res.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        type: voucher.type,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value
      },
      calculation: {
        original_amount: amount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        effective_discount_percentage: effectiveDiscountPercentage,
        ...(voucher.type === 'reseller' && {
          profit_before: reseller_price - base_price,
          profit_after: (reseller_price - base_price) - discountAmount,
          actual_discount_from_profit_percentage: Math.round((discountAmount / (reseller_price - base_price)) * 10000) / 100
        })
      }
    });

  } catch (error) {
    console.error('Voucher validation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      valid: false 
    });
  }
});

// Apply voucher (record usage)
router.post('/apply', zodValidate(voucherApplySchema), async (req: Request, res: Response) => {
  try {
    const { 
      voucher_code_id, 
      order_id, 
      user_id, 
      discount_amount, 
      original_amount, 
      final_amount 
    } = req.body;

    const { data, error } = await getSupabase()
      .from('voucher_usage')
      .insert({
        voucher_code_id,
        order_id,
        user_id,
        discount_amount,
        original_amount,
        final_amount
      })
      .select()
      .single();

    if (error) {
      console.error('Voucher apply error:', error);
      return res.status(500).json({ error: 'Failed to apply voucher' });
    }

    return res.json({ success: true, usage: data });

  } catch (error) {
    console.error('Voucher apply error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create voucher (admin or affiliate)
router.post('/create', zodValidate(voucherCreateSchema), async (req: Request, res: Response) => {
  try {
    const {
      code,
      type,
      created_by,
      discount_type,
      discount_value,
      max_usage,
      valid_from,
      valid_until,
      applies_to,
      metadata
    } = req.body;

    const { data, error } = await getSupabase()
      .from('voucher_codes')
      .insert({
        code: code.toUpperCase(),
        type,
        created_by,
        discount_type,
        discount_value,
        max_usage,
        valid_from,
        valid_until,
        applies_to: applies_to || {},
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Voucher code already exists' });
      }
      console.error('Voucher create error:', error);
      return res.status(500).json({ error: 'Failed to create voucher' });
    }

    return res.json({ success: true, voucher: data });

  } catch (error) {
    console.error('Voucher create error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List vouchers (admin only)
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { type, is_active, created_by } = req.query;

    let query = getSupabase()
      .from('voucher_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Voucher list error:', error);
      return res.status(500).json({ error: 'Failed to fetch vouchers' });
    }

    return res.json({ vouchers: data });

  } catch (error) {
    console.error('Voucher list error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update voucher
router.put('/:id', zodValidate(voucherUpdateSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.code;
    delete updates.current_usage;
    delete updates.created_at;
    delete updates.updated_at;

    const { data, error } = await getSupabase()
      .from('voucher_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Voucher update error:', error);
      return res.status(500).json({ error: 'Failed to update voucher' });
    }

    return res.json({ success: true, voucher: data });

  } catch (error) {
    console.error('Voucher update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete voucher
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await getSupabase()
      .from('voucher_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Voucher delete error:', error);
      return res.status(500).json({ error: 'Failed to delete voucher' });
    }

    return res.json({ success: true });

  } catch (error) {
    console.error('Voucher delete error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get voucher usage stats
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: voucher, error: voucherError } = await getSupabase()
      .from('voucher_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (voucherError || !voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const { data: usages, error: usageError } = await getSupabase()
      .from('voucher_usage')
      .select('*')
      .eq('voucher_code_id', id)
      .order('used_at', { ascending: false });

    if (usageError) {
      console.error('Voucher stats error:', usageError);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    const totalDiscount = usages?.reduce((sum, usage) => sum + usage.discount_amount, 0) || 0;

    return res.json({
      voucher,
      stats: {
        total_usage: voucher.current_usage,
        max_usage: voucher.max_usage,
        total_discount_given: totalDiscount,
        recent_usages: usages?.slice(0, 10) || []
      }
    });

  } catch (error) {
    console.error('Voucher stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


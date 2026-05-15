import { type FulfillmentRepository } from "../fulfillment/fulfillment.repository";
import { type OrderRepository } from "../order/order.repository";
import { type PaymentRepository } from "../payment/payment.repository";
import { type DashboardService, type TransactionHistoryLookup } from "./dashboard.types";

export type { DashboardService };

const MEMBER_HISTORY_LIMIT = 20;
const ADMIN_TRANSACTION_LIMIT = 25;
const ADMIN_WEBHOOK_LIMIT = 25;

type DashboardServiceOptions = Readonly<{
  orderRepository: OrderRepository;
  paymentRepository: PaymentRepository;
  fulfillmentRepository: FulfillmentRepository;
}>;

export function createDashboardService(options: DashboardServiceOptions): DashboardService {
  async function hydrateTransactions(orders: Awaited<ReturnType<OrderRepository["listOrdersByUserId"]>>): Promise<TransactionHistoryLookup[]> {
    return Promise.all(
      orders.map(async (order) => {
        const [payment, fulfillment] = await Promise.all([
          options.paymentRepository.findLatestPaymentByOrderId(order.id),
          options.fulfillmentRepository.findLatestFulfillmentByOrderId(order.id)
        ]);

        return { order, payment, fulfillment };
      })
    );
  }

  return {
    async listMemberTransactions(userId: string) {
      return hydrateTransactions(await options.orderRepository.listOrdersByUserId(userId, MEMBER_HISTORY_LIMIT));
    },

    async getAdminMonitoring() {
      const [transactions, webhooks] = await Promise.all([
        hydrateTransactions(await options.orderRepository.listRecentOrders(ADMIN_TRANSACTION_LIMIT)),
        options.paymentRepository.listRecentWebhookEvents(ADMIN_WEBHOOK_LIMIT)
      ]);

      return { transactions, webhooks };
    }
  };
}

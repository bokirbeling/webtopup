import { type Request, type Response, Router } from "express";

import { readBearerToken, sendUnauthorized } from "../auth/auth.middleware";
import { InvalidAuthTokenError, type AuthService } from "../auth/auth.service";
import { type AuthUserRole } from "../auth/auth.types";
import { CatalogProductInactiveError, CatalogProductNotFoundError } from "../catalog/pricing.service";
import { type OrderService } from "./order.service";
import { type CreateGuestOrderInput } from "./order.types";

import { type OrderRepository } from "./order.repository";
import { createOrderSchema, zodValidate, zodPaginationLimit } from "../../shared/validation";
import { z } from "zod";

const orderListQuerySchema = z.object({
  limit: zodPaginationLimit
});

function sendProductNotFound(response: Response) {
  response.status(404).json({
    error: {
      code: "PRODUCT_NOT_FOUND",
      message: "Product was not found."
    }
  });
}

function sendInactiveProduct(response: Response) {
  response.status(409).json({
    error: {
      code: "PRODUCT_INACTIVE",
      message: "Product is inactive."
    }
  });
}

type OrderRequester = Readonly<{
  userId: string | null;
  roleType: AuthUserRole;
}>;

async function resolveOrderRequester(request: Request, authService: AuthService): Promise<OrderRequester> {
  const authorizationHeader = request.header("authorization");
  if (authorizationHeader === undefined) {
    return {
      userId: null,
      roleType: "pengguna"
    };
  }

  const token = readBearerToken(authorizationHeader);
  if (token === null) {
    throw new InvalidAuthTokenError();
  }

  const user = await authService.getCurrentUser(token);

  return {
    userId: user.id,
    roleType: user.role
  };
}

type OrdersRouterDependencies = Readonly<{
  orderService: OrderService;
  authService: AuthService;
  orderRepository: OrderRepository;
}>;

export function createOrdersRouter(dependencies: OrdersRouterDependencies) {
  const ordersRouter = Router();

  ordersRouter.get("/", zodValidate(orderListQuerySchema, "query"), async (request, response) => {
    try {
      const requester = await resolveOrderRequester(request, dependencies.authService);
      if (requester.userId === null) {
        sendUnauthorized(response);
        return;
      }

      const orders = await dependencies.orderRepository.listOrdersByUserId(requester.userId, request.query.limit as unknown as number);

      response.status(200).json({
        orders: orders.map(order => ({
          id: order.id,
          order_number: order.orderNumber,
          customer_ref: order.customerRef,
          product_code: order.productCode,
          provider: order.provider,
          amount_minor: order.amountMinor,
          currency: order.currency,
          status: order.status,
          metadata: order.metadata,
          created_at: order.createdAt.toISOString(),
          updated_at: order.updatedAt.toISOString()
        }))
      });
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }
      response.status(500).json({
        error: {
          code: "ORDER_LIST_FAILED",
          message: "Failed to fetch order history."
        }
      });
    }
  });

  ordersRouter.post("/", zodValidate(createOrderSchema, "body", "Invalid order payload."), async (request, response) => {
    if ("status" in request.body) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid order payload.",
          details: [
            {
              field: "status",
              message: "status is server-controlled and cannot be provided."
            }
          ]
        }
      });
      return;
    }

    try {
      const requester = await resolveOrderRequester(request, dependencies.authService);
      const body = request.body;
      const createdOrder = await dependencies.orderService.createOrder({
        customerRef: body.customer_ref ?? null,
        productId: body.product_id ?? null,
        productCode: body.product_code,
        provider: body.provider,
        amountMinor: body.amount_minor,
        currency: body.currency,
        referralCode: body.referral_code ?? null,
        discountCode: body.discount_code ?? null,
        metadata: body.metadata,
        userId: requester.userId,
        roleType: requester.roleType
      });

      response.status(201).json({
        order_id: createdOrder.orderId,
        invoice_code: createdOrder.invoiceCode,
        status: createdOrder.status
      });
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }

      if (error instanceof CatalogProductNotFoundError) {
        sendProductNotFound(response);
        return;
      }

      if (error instanceof CatalogProductInactiveError) {
        sendInactiveProduct(response);
        return;
      }

      console.error("[OrderCreate] Error creating order:", error);
      response.status(500).json({
        error: {
          code: "ORDER_CREATE_FAILED",
          message: "Failed to create order."
        }
      });
    }
  });

  return ordersRouter;
}

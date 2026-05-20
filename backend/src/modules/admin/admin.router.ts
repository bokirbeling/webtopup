import { Buffer } from "node:buffer";

import { type Response, Router } from "express";

import { toUserResponse } from "../account/account.router";
import { AdminEmailUnverifiedError, AdminUserNotFoundError, type AdminService } from "./admin.service";
import { type ProductUploadService } from "./product-upload.service";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { adminLimiter } from "../../middleware/rate-limit.middleware";
import { adminProductUploadSchema, zodValidate } from "../../shared/validation";

export type AdminRouterDependencies = Readonly<{
  adminService: AdminService;
  productUploadService?: ProductUploadService;
}>;

function sendNotFound(response: Response) {
  response.status(404).json({
    error: {
      code: "USER_NOT_FOUND",
      message: "User was not found."
    }
  });
}

function handleAdminError(error: unknown, response: Response) {
  if (error instanceof AdminUserNotFoundError) {
    sendNotFound(response);
    return;
  }

  if (error instanceof AdminEmailUnverifiedError) {
    response.status(403).json({
      error: {
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Email verification is required before approving reseller access."
      }
    });
    return;
  }

  throw error;
}

export function createAdminRouter(dependencies: AdminRouterDependencies) {
  const adminRouter = Router();

  adminRouter.post("/products/upload", zodValidate(adminProductUploadSchema), async (request, response) => {
    if (dependencies.productUploadService === undefined) {
      response.status(503).json({
        error: {
          code: "PRODUCT_UPLOAD_UNAVAILABLE",
          message: "Product upload service is not configured."
        }
      });
      return;
    }

    const fileBase64 = request.body.file_base64 as string;
    const result = await dependencies.productUploadService.processProductUpload(Buffer.from(fileBase64, "base64"));
    if (result.errors.length > 0) {
      response.status(400).json({
        error: {
          code: "PRODUCT_UPLOAD_VALIDATION_ERROR",
          message: "Upload produk gagal divalidasi.",
          details: result.errors
        }
      });
      return;
    }

    response.status(200).json(result);
  });

  adminRouter.get("/users", async (_request, response) => {
    const users = await dependencies.adminService.listUsers();
    response.status(200).json({
      users: users.map(toUserResponse)
    });
  });

  adminRouter.get("/users/:userId", async (request, response) => {
    try {
      const user = await dependencies.adminService.getUser(request.params.userId);
      response.status(200).json({
        user: toUserResponse(user)
      });
    } catch (error) {
      handleAdminError(error, response);
    }
  });

  adminRouter.post("/users/:userId/reseller/approve", async (request, response) => {
    try {
      const user = await dependencies.adminService.approveReseller(request.params.userId);
      response.status(200).json({
        user: toUserResponse(user)
      });
    } catch (error) {
      handleAdminError(error, response);
    }
  });

  adminRouter.post("/users/:userId/reseller/demote", async (request, response) => {
    try {
      const user = await dependencies.adminService.demoteSeller(request.params.userId);
      response.status(200).json({
        user: toUserResponse(user)
      });
    } catch (error) {
      handleAdminError(error, response);
    }
  });

  adminRouter.post("/users/:userId/reseller/suspend", async (request, response) => {
    try {
      const user = await dependencies.adminService.suspendSeller(request.params.userId);
      response.status(200).json({
        user: toUserResponse(user)
      });
    } catch (error) {
      handleAdminError(error, response);
    }
  });

  return adminRouter;
}

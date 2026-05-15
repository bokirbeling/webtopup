import { type Response, Router } from "express";

import { toUserResponse } from "../account/account.router";
import { AdminEmailUnverifiedError, AdminUserNotFoundError, type AdminService } from "./admin.service";

export type AdminRouterDependencies = Readonly<{
  adminService: AdminService;
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

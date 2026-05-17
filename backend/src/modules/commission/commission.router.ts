import { type Request, type Response, Router } from "express";
import { type CommissionService } from "./commission.service";
import { type CommissionRepository } from "./commission.types";
import { type AuthenticatedRequest, requireRoles } from "../auth/auth.middleware";

export function createCommissionRouter(options: { 
  commissionService: CommissionService;
  repository: CommissionRepository;
}): Router {
  const router = Router();

  // User Performance Curves
  router.get("/performance", async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUser!.id;
    const role = authReq.authUser!.role;
    const interval = (req.query.interval as "day" | "month") || "day";

    const curves = await options.repository.getPerformanceCurves({
      resellerId: role === "seller" ? userId : undefined,
      interval
    });

    res.json({ curves });
  });

  return router;
}

export function createAdminCommissionRouter(options: { 
  repository: CommissionRepository;
}): Router {
  const router = Router();

  router.get("/performance", requireRoles(["admin"]), async (req, res) => {
    const interval = (req.query.interval as "day" | "month") || "month";
    const resellerId = req.query.reseller_id as string | undefined;

    const curves = await options.repository.getPerformanceCurves({
      resellerId,
      interval
    });

    res.json({ curves });
  });

  return router;
}

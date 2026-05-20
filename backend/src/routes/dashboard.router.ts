import { Router, type Request, type Response } from 'express';
import { type AuthService } from '../modules/auth/auth.service';
import { createAuthenticationMiddleware, requireRoles } from '../modules/auth/auth.middleware';
import type { DashboardContentRepository } from '../modules/dashboard/dashboard-content.repository';
import {
  heroLinkSchema,
  promoSchema,
  dashboardCategorySchema,
  dealSchema,
  statSchema,
  featureSchema,
  zodValidate
} from '../shared/validation';

export type DashboardContentRouterDependencies = Readonly<{
  repository: DashboardContentRepository;
  authService: AuthService;
}>;

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export function createDashboardContentRouter(deps: DashboardContentRouterDependencies): Router {
  const router = Router();
  const authenticate = createAuthenticationMiddleware(deps.authService);
  const requireAdmin = requireRoles(["admin"]);

  // ============================================================================
  // HERO QUICK LINKS
  // ============================================================================

  router.get('/hero', async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.listHeroLinks();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/hero', authenticate, requireAdmin, zodValidate(heroLinkSchema), async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.createHeroLink(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/hero/:id', authenticate, requireAdmin, zodValidate(heroLinkSchema), async (req: Request, res: Response) => {
    try {
      const id = getParamId(req.params.id);
      const data = await deps.repository.updateHeroLink(id, req.body);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/hero/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = getParamId(req.params.id);
      await deps.repository.deleteHeroLink(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PROMO CAROUSEL
  // ============================================================================

  router.get('/promos', async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.listPromos();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/promos', authenticate, requireAdmin, zodValidate(promoSchema), async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.createPromo(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/promos/:id', authenticate, requireAdmin, zodValidate(promoSchema), async (req: Request, res: Response) => {
    try {
      const id = getParamId(req.params.id);
      const data = await deps.repository.updatePromo(id, req.body);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/promos/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = getParamId(req.params.id);
      await deps.repository.deletePromo(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // DASHBOARD CATEGORIES
  // ============================================================================

  router.get('/categories', async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.listCategories();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/categories', authenticate, requireAdmin, zodValidate(dashboardCategorySchema), async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.createCategory(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/categories/:id', authenticate, requireAdmin, zodValidate(dashboardCategorySchema), async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.updateCategory(req.params.id as string, req.body);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/categories/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      await deps.repository.deleteCategory(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // HOT DEALS
  // ============================================================================

  router.get('/deals', async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.listDeals();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/deals', authenticate, requireAdmin, zodValidate(dealSchema), async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.createDeal(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/deals/:id', authenticate, requireAdmin, zodValidate(dealSchema), async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.updateDeal(req.params.id as string, req.body);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/deals/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      await deps.repository.deleteDeal(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // STATS
  // ============================================================================

  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.listStats();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/stats', authenticate, requireAdmin, zodValidate(statSchema), async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.createStat(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/stats/:id', authenticate, requireAdmin, zodValidate(statSchema), async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.updateStat(req.params.id as string, req.body);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/stats/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      await deps.repository.deleteStat(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // FEATURES
  // ============================================================================

  router.get('/features', async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.listFeatures();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/features', authenticate, requireAdmin, zodValidate(featureSchema), async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.createFeature(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/features/:id', authenticate, requireAdmin, zodValidate(featureSchema), async (req: Request, res: Response) => {
    try {
      const data = await deps.repository.updateFeature(req.params.id as string, req.body);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/features/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      await deps.repository.deleteFeature(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

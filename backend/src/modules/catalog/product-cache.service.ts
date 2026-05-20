import { type PricedProduct } from './catalog.types';
import { type CatalogService } from './pricing.service';
import { type AuthUserRole } from '../auth/auth.types';

interface CacheEntry {
  data: PricedProduct[];
  lastFetch: number;
  roleType: AuthUserRole;
}

export class ProductCacheService {
  private cache: Map<AuthUserRole, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private refreshing: Map<AuthUserRole, Promise<PricedProduct[]>> = new Map();

  constructor(private catalogService: CatalogService) {}

  async getProducts(roleType: AuthUserRole): Promise<PricedProduct[]> {
    const now = Date.now();
    const cached = this.cache.get(roleType);

    // Cache hit and fresh
    if (cached && (now - cached.lastFetch) < this.TTL) {
      return cached.data;
    }

    // Cache hit but stale - serve stale, refresh background
    if (cached) {
      this.refreshInBackground(roleType);
      return cached.data;
    }

    // Cache miss - fetch now
    return await this.fetchAndCache(roleType);
  }

  async getPaginatedProducts(
    roleType: AuthUserRole,
    page: number = 1,
    limit: number = 50,
    search?: string,
    category?: string
  ): Promise<{
    products: PricedProduct[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    let products = await this.getProducts(roleType);

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p =>
        p.product.name.toLowerCase().includes(searchLower) ||
        p.product.provider.toLowerCase().includes(searchLower) ||
        p.product.skuDigiflazz.toLowerCase().includes(searchLower)
      );
    }

    if (category) {
      products = products.filter(p => p.product.category === category);
    }

    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedProducts = products.slice(start, end);

    return {
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  private async fetchAndCache(roleType: AuthUserRole): Promise<PricedProduct[]> {
    // Prevent duplicate fetches
    const existing = this.refreshing.get(roleType);
    if (existing) {
      return await existing;
    }

    const promise = this.catalogService.listPricedProducts(roleType);
    this.refreshing.set(roleType, promise);

    try {
      const products = await promise;
      this.cache.set(roleType, {
        data: products,
        lastFetch: Date.now(),
        roleType
      });
      return products;
    } finally {
      this.refreshing.delete(roleType);
    }
  }

  private refreshInBackground(roleType: AuthUserRole): void {
    // Don't await - fire and forget
    this.fetchAndCache(roleType).catch(error => {
      console.error('[ProductCache] Background refresh failed:', error);
    });
  }

  invalidate(roleType?: AuthUserRole): void {
    if (roleType) {
      this.cache.delete(roleType);
    } else {
      this.cache.clear();
    }
  }

  getStats() {
    const stats: Record<string, { size: number; age: number }> = {};
    const now = Date.now();
    
    for (const [role, entry] of this.cache.entries()) {
      stats[role] = {
        size: entry.data.length,
        age: Math.floor((now - entry.lastFetch) / 1000)
      };
    }
    
    return stats;
  }
}

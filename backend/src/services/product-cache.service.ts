import type { CatalogRepository } from "../modules/catalog/catalog.repository";
import type { AuthUserRole } from "../modules/auth/auth.types";

interface CacheEntry {
  products: any[];
  timestamp: number;
  fetching: boolean;
}

export class ProductCacheService {
  private cache: Map<AuthUserRole, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private catalogRepository: CatalogRepository) {}

  async getProducts(role: AuthUserRole = "pengguna"): Promise<any[]> {
    const cached = this.cache.get(role);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.TTL) {
      this.refreshInBackground(role);
      return cached.products;
    }

    if (cached?.fetching) {
      return cached.products;
    }

    return this.fetchAndCache(role);
  }

  async getPaginatedProducts(
    role: AuthUserRole = "pengguna",
    page: number = 1,
    limit: number = 50,
    search?: string,
    category?: string
  ): Promise<{ products: any[]; pagination: any }> {
    let products = await this.getProducts(role);

    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.provider?.toLowerCase().includes(searchLower) ||
        p.sku_digiflazz?.toLowerCase().includes(searchLower)
      );
    }

    if (category) {
      products = products.filter(p => p.category === category);
    }

    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedProducts = products.slice(offset, offset + limit);

    return {
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  private async fetchAndCache(role: AuthUserRole): Promise<any[]> {
    this.cache.set(role, {
      products: this.cache.get(role)?.products || [],
      timestamp: Date.now(),
      fetching: true
    });

    try {
      const products = await this.catalogRepository.listProducts();
      this.cache.set(role, {
        products,
        timestamp: Date.now(),
        fetching: false
      });
      return products;
    } catch (error) {
      const cached = this.cache.get(role);
      if (cached) {
        cached.fetching = false;
      }
      throw error;
    }
  }

  private refreshInBackground(role: AuthUserRole): void {
    const cached = this.cache.get(role);
    if (!cached || cached.fetching) return;

    this.fetchAndCache(role).catch(err => {
      console.error(`Background refresh failed for role ${role}:`, err);
    });
  }

  invalidate(role?: AuthUserRole): void {
    if (role) {
      this.cache.delete(role);
    } else {
      this.cache.clear();
    }
  }

  getStats() {
    const stats: any = {};
    for (const [role, entry] of this.cache.entries()) {
      stats[role] = {
        count: entry.products.length,
        age: Date.now() - entry.timestamp,
        fetching: entry.fetching
      };
    }
    return stats;
  }
}

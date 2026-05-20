import ws from 'ws';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type DashboardContentRepository = {
  // Hero Quick Links
  listHeroLinks(): Promise<any[]>;
  createHeroLink(data: any): Promise<any>;
  updateHeroLink(id: string, data: any): Promise<any>;
  deleteHeroLink(id: string): Promise<void>;
  
  // Promo Carousel
  listPromos(): Promise<any[]>;
  createPromo(data: any): Promise<any>;
  updatePromo(id: string, data: any): Promise<any>;
  deletePromo(id: string): Promise<void>;
  
  // Dashboard Categories
  listCategories(): Promise<any[]>;
  createCategory(data: any): Promise<any>;
  updateCategory(id: string, data: any): Promise<any>;
  deleteCategory(id: string): Promise<void>;
  
  // Hot Deals
  listDeals(): Promise<any[]>;
  createDeal(data: any): Promise<any>;
  updateDeal(id: string, data: any): Promise<any>;
  deleteDeal(id: string): Promise<void>;
  
  // Stats
  listStats(): Promise<any[]>;
  createStat(data: any): Promise<any>;
  updateStat(id: string, data: any): Promise<any>;
  deleteStat(id: string): Promise<void>;
  
  // Features
  listFeatures(): Promise<any[]>;
  createFeature(data: any): Promise<any>;
  updateFeature(id: string, data: any): Promise<any>;
  deleteFeature(id: string): Promise<void>;
};

type SupabaseDashboardRepositoryOptions = Readonly<{
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  tablePrefix?: string;
}>;

export class SupabaseDashboardContentRepository implements DashboardContentRepository {
  private readonly client: SupabaseClient;
  private readonly prefix: string;

  constructor(options: SupabaseDashboardRepositoryOptions) {
    this.client = createClient(options.supabaseUrl, options.supabaseServiceRoleKey, {
      realtime: { transport: ws as any },
      auth: { persistSession: false }
    });
    this.prefix = options.tablePrefix ?? '';
  }

  private table(name: string): string {
    return `${this.prefix}${name}`;
  }

  // Hero Quick Links
  async listHeroLinks(): Promise<any[]> {
    const { data, error } = await this.client
      .from(this.table('hero_quick_links'))
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) throw new Error(`Failed to list hero links: ${error.message}`);
    return data ?? [];
  }

  async createHeroLink(input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('hero_quick_links'))
      .insert(input)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create hero link: ${error.message}`);
    return data;
  }

  async updateHeroLink(id: string, input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('hero_quick_links'))
      .update(input)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update hero link: ${error.message}`);
    return data;
  }

  async deleteHeroLink(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.table('hero_quick_links'))
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete hero link: ${error.message}`);
  }

  // Promo Carousel
  async listPromos(): Promise<any[]> {
    const { data, error } = await this.client
      .from(this.table('promo_carousel'))
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) throw new Error(`Failed to list promos: ${error.message}`);
    return data ?? [];
  }

  async createPromo(input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('promo_carousel'))
      .insert(input)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create promo: ${error.message}`);
    return data;
  }

  async updatePromo(id: string, input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('promo_carousel'))
      .update(input)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update promo: ${error.message}`);
    return data;
  }

  async deletePromo(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.table('promo_carousel'))
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete promo: ${error.message}`);
  }

  // Dashboard Categories
  async listCategories(): Promise<any[]> {
    const { data, error } = await this.client
      .from(this.table('dashboard_categories'))
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) throw new Error(`Failed to list categories: ${error.message}`);
    return data ?? [];
  }

  async createCategory(input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('dashboard_categories'))
      .insert(input)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create category: ${error.message}`);
    return data;
  }

  async updateCategory(id: string, input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('dashboard_categories'))
      .update(input)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update category: ${error.message}`);
    return data;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.table('dashboard_categories'))
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete category: ${error.message}`);
  }

  // Hot Deals
  async listDeals(): Promise<any[]> {
    const { data, error } = await this.client
      .from(this.table('hot_deals'))
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) throw new Error(`Failed to list deals: ${error.message}`);
    return data ?? [];
  }

  async createDeal(input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('hot_deals'))
      .insert(input)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create deal: ${error.message}`);
    return data;
  }

  async updateDeal(id: string, input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('hot_deals'))
      .update(input)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update deal: ${error.message}`);
    return data;
  }

  async deleteDeal(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.table('hot_deals'))
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete deal: ${error.message}`);
  }

  // Stats
  async listStats(): Promise<any[]> {
    const { data, error } = await this.client
      .from(this.table('stats'))
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) throw new Error(`Failed to list stats: ${error.message}`);
    return data ?? [];
  }

  async createStat(input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('stats'))
      .insert(input)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create stat: ${error.message}`);
    return data;
  }

  async updateStat(id: string, input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('stats'))
      .update(input)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update stat: ${error.message}`);
    return data;
  }

  async deleteStat(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.table('stats'))
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete stat: ${error.message}`);
  }

  // Features
  async listFeatures(): Promise<any[]> {
    const { data, error } = await this.client
      .from(this.table('features'))
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) throw new Error(`Failed to list features: ${error.message}`);
    return data ?? [];
  }

  async createFeature(input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('features'))
      .insert(input)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create feature: ${error.message}`);
    return data;
  }

  async updateFeature(id: string, input: any): Promise<any> {
    const { data, error } = await this.client
      .from(this.table('features'))
      .update(input)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update feature: ${error.message}`);
    return data;
  }

  async deleteFeature(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.table('features'))
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete feature: ${error.message}`);
  }
}

/**
 * Brand image mapping for consistent product images
 * Uses local assets from /product-assets/brands/
 * Downloaded from Digiflazz CDN and stored locally
 */

export const BRAND_IMAGES: Record<string, string> = {
  // Pulsa & Data operators (1,740 - 396 products)
  'TELKOMSEL': '/product-assets/brands/telkomsel.png',
  'INDOSAT': '/product-assets/brands/indosat.png',
  'TRI': '/product-assets/brands/tri.png',
  'AXIS': '/product-assets/brands/axis.png',
  'XL': '/product-assets/brands/xl.png',
  'SMARTFREN': '/product-assets/brands/smartfren.png',
  'by.U': '/product-assets/brands/byu.jpg',
  
  // E-Wallet (576 - 50 products)
  'GO PAY': '/product-assets/brands/go-pay.jpg',
  'DANA': '/product-assets/brands/dana.jpg',
  'OVO': '/product-assets/brands/ovo.jpg',
  'SHOPEE PAY': '/product-assets/brands/shopee-pay.jpg',
  'MAXIM': '/product-assets/brands/maxim.jpg',
  'LinkAja': '/product-assets/brands/linkaja.jpg',
  'GRAB': '/product-assets/brands/grab.jpg',
  
  // Games (909 - 47 products)
  'MOBILE LEGENDS': '/product-assets/brands/mobile-legends.jpg',
  'FREE FIRE': '/product-assets/brands/free-fire.jpg',
  'PUBG MOBILE': '/product-assets/brands/pubg-mobile.jpg',
  'Magic Chess': '/product-assets/brands/magic-chess.jpg',
  'Genshin Impact': '/product-assets/brands/genshin-impact.jpg',
  'Free Fire Max': '/product-assets/brands/free-fire-max.jpg',
  'Rainbow Six Mobile': '/product-assets/brands/rainbow-six-mobile.jpg',
  'Valorant': '/product-assets/brands/valorant.jpg',
  'Zenless Zone Zero': '/product-assets/brands/zenless-zone-zero.jpg',
  'Call of Duty MOBILE': '/product-assets/brands/call-of-duty-mobile.jpg',
  'Honkai Star Rail': '/product-assets/brands/honkai-star-rail.jpg',
};

/**
 * Get brand image URL with fallback
 * @param provider - Provider/brand name from database
 * @param metadata - Product metadata (optional, not used)
 * @returns Local image path from /product-assets/brands/
 */
export function getBrandImage(provider: string, metadata?: { image_url?: string }): string {
  // Try exact match first
  if (BRAND_IMAGES[provider]) {
    return BRAND_IMAGES[provider];
  }
  
  // Try case-insensitive match
  const providerLower = provider.toLowerCase();
  const matchedKey = Object.keys(BRAND_IMAGES).find(
    key => key.toLowerCase() === providerLower
  );
  
  if (matchedKey) {
    return BRAND_IMAGES[matchedKey];
  }
  
  // Fallback: try to construct filename from provider name
  const sanitized = provider.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\./g, '')
    .replace(/&/g, 'and');
  
  // Try common extensions
  const possiblePaths = [
    `/product-assets/brands/${sanitized}.jpg`,
    `/product-assets/brands/${sanitized}.png`,
  ];
  
  // Return first possible path (Next.js will handle 404)
  return possiblePaths[0];
}

/**
 * Get all available brand images
 * @returns Array of [provider, imagePath] tuples
 */
export function getAllBrandImages(): [string, string][] {
  return Object.entries(BRAND_IMAGES);
}

/**
 * Check if a brand has a local image
 * @param provider - Provider/brand name
 * @returns true if brand has local image
 */
export function hasBrandImage(provider: string): boolean {
  return provider in BRAND_IMAGES || 
         Object.keys(BRAND_IMAGES).some(key => key.toLowerCase() === provider.toLowerCase());
}

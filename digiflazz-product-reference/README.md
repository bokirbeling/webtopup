# Digiflazz Product Reference

Product catalog scraped from Digiflazz public API for reference purposes.

## ⚠️ CRITICAL: Development API Limitation

**The Digiflazz Development API only supports 5 products:**
- `gopay10` - GoPay 10.000
- `gopay20` - GoPay 20.000
- `gopay25` - GoPay 25.000
- `gopay50` - GoPay 50.000
- `telkomsel5` - Telkomsel 5.000

**This means:**
- ✅ These 8000+ products are real and available in production
- ❌ Most products will fail in development/testing environment
- ✅ Use these files as reference for UI/catalog display
- ❌ Only test checkout/fulfillment with the 5 dev products above

**Testing Strategy:**
1. Display full catalog in UI (all 8000+ products)
2. Only allow checkout for the 5 dev products
3. Show "Demo Mode" warning for other products
4. Test payment/fulfillment flows only with dev products

## Data Source

All data fetched from Digiflazz public API endpoints:
- Categories: `https://id.digiflazz.com/api/v1/category`
- Products: `https://id.digiflazz.com/api/v1/product?type=prepaid&category_id=<id>`
- Pascabayar: `https://id.digiflazz.com/api/v1/brandPasca`

## Files

### Pulsa (7 brands)
- `pulsa-telkomsel.json` - Telkomsel products
- `pulsa-xl.json` - XL products
- `pulsa-indosat.json` - Indosat products
- `pulsa-tri.json` - Tri products
- `pulsa-smartfren.json` - Smartfren products
- `pulsa-axis.json` - Axis products
- `pulsa-byu.json` - by.U products

### Other Categories (6 files)
- `data.json` - Data packages (all brands)
- `games.json` - Game vouchers (Mobile Legends, Free Fire, PUBG, etc.)
- `voucher.json` - Digital vouchers (Google Play, iTunes, Steam, etc.)
- `emoney.json` - E-money top-ups (GoPay, OVO, DANA, ShopeePay, etc.)
- `pln.json` - PLN token listrik
- `pascabayar.json` - Pascabayar brands (PLN, PDAM, HP, Internet, BPJS)

### Metadata
- `categories.json` - All available categories with IDs

## Data Format

Each product file contains an array of objects with this structure:

```json
{
  "name": "Telkomsel 5.000",
  "price": 5190,
  "category": "Pulsa",
  "brand": "TELKOMSEL",
  "type": "Umum",
  "desc": "Reguler",
  "image_url": "https://cdn.mobilepulsa.net/img/logo/pulsa/small/telkomsel.png"
}
```

**Fields:**
- `name` - Product display name
- `price` - Price in IDR (integer, minor units for some)
- `category` - Category name (Pulsa, Data, Games, etc.)
- `brand` - Brand name (TELKOMSEL, XL, GOPAY, etc.)
- `type` - Product type (Umum, Promo, etc.)
- `desc` - Product description
- `image_url` - Brand logo URL

## Usage

### Load All Products
```javascript
import telkomsel from './digiflazz-product-reference/pulsa-telkomsel.json';
import xl from './digiflazz-product-reference/pulsa-xl.json';
// ... load other files

const allProducts = [
  ...telkomsel,
  ...xl,
  // ... spread other arrays
];
```

### Filter by Category
```javascript
const pulsaProducts = allProducts.filter(p => p.category === 'Pulsa');
const gameProducts = allProducts.filter(p => p.category === 'Games');
```

### Filter by Brand
```javascript
const telkomselProducts = allProducts.filter(p => p.brand === 'TELKOMSEL');
const gopayProducts = allProducts.filter(p => p.brand === 'GOPAY');
```

### Search by Name
```javascript
const searchResults = allProducts.filter(p => 
  p.name.toLowerCase().includes(query.toLowerCase())
);
```

## Statistics

Total products: ~8000+
- Pulsa: ~500 products across 7 brands
- Data: ~3400 products
- Games: ~3800 products
- Voucher: ~200 products
- E-Money: ~100 products
- PLN: ~50 products
- Pascabayar: ~20 brands

## Notes

1. **Prices are in IDR** - Some products use minor units (multiply by 100 for actual price)
2. **Filtered products** - Only products with valid prices (not null, 0, or "-")
3. **Image URLs** - All images hosted on `cdn.mobilepulsa.net`
4. **Pascabayar** - Only brand list, not individual products (requires inquiry API)
5. **Development API** - Remember only 5 products work in dev environment!

## Last Updated

2026-05-17

## License

Data sourced from Digiflazz public API for reference purposes only.

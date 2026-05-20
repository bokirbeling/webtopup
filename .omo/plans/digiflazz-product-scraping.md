# Digiflazz Product Reference Scraping

## TL;DR
> **Summary**: Fetch semua kategori produk dari Digiflazz public API dan simpan sebagai referensi untuk development/testing
> **Deliverables**: 
> - Folder `digiflazz-product-reference/` dengan 13 JSON files
> - README.md dengan dokumentasi lengkap
> - Data dari API endpoints (bukan web scraping)
> **Effort**: Quick
> **Parallel**: NO - sequential fetching per kategori

## Context

### Original Request
User: "sdh ada list semua produk dari api development digiflaz?"
- Digiflazz development API hanya return 5 produk (sangat terbatas)
- User request scraping dari website: https://id.digiflazz.com/daftar-harga

User: "scraping list produk dari https://id.digiflazz.com/daftar-harga ,buatkan folder sendiri sebagai aset referensi"
- Folder `digiflazz-product-reference/` sudah dibuat

User: "ambil semua kategori juga"
- Request scraping SEMUA kategori, tidak hanya Telkomsel

### Discovery
Build agent menemukan public API endpoints yang lebih baik:
- `https://id.digiflazz.com/api/v1/category` - list kategori dengan IDs
- `https://id.digiflazz.com/api/v1/product?type=prepaid&category_id=<id>` - produk per kategori
- `https://id.digiflazz.com/api/v1/brandPasca` - brand pascabayar

Category IDs verified:
- `KWy9W4` = Pulsa (518 products total)
- `1o6yg8` = Data (3456 products)
- `VDzZDM` = Games (3893 products)
- `8gKlob` = Voucher
- `1D7Vod` = E-Money
- `bg4dgB` = PLN

Pulsa brand breakdown:
- TELKOMSEL: 273 products
- XL: 17 products
- INDOSAT: 38 products
- TRI: 28 products
- SMARTFREN: 42 products
- AXIS: 18 products
- by.U: 102 products

### Current State
- ✓ Folder `digiflazz-product-reference/` exists
- ✓ API endpoints discovered and verified
- ✗ Belum ada JSON files
- ✗ Belum ada README.md

## Work Objectives

### Core Objective
Fetch semua kategori produk dari Digiflazz public API dan simpan sebagai referensi terstruktur untuk development/testing.

### Deliverables
1. `digiflazz-product-reference/README.md` - Dokumentasi lengkap
2. `digiflazz-product-reference/telkomsel.json` - 270+ produk Telkomsel
3. `digiflazz-product-reference/xl.json` - 17+ produk XL
4. `digiflazz-product-reference/indosat.json` - 38+ produk Indosat
5. `digiflazz-product-reference/tri.json` - 28+ produk Tri
6. `digiflazz-product-reference/smartfren.json` - 42+ produk Smartfren
7. `digiflazz-product-reference/axis.json` - 18+ produk Axis
8. `digiflazz-product-reference/byu.json` - 102+ produk by.U
9. `digiflazz-product-reference/games.json` - 3000+ produk Games
10. `digiflazz-product-reference/emoney.json` - E-Money products
11. `digiflazz-product-reference/pln.json` - Token PLN
12. `digiflazz-product-reference/voucher.json` - Voucher products
13. `digiflazz-product-reference/data.json` - 3000+ paket data
14. `digiflazz-product-reference/pascabayar.json` - Brand list pascabayar

### Definition of Done
- [ ] Semua 13 JSON files tersimpan dengan format konsisten
- [ ] README.md berisi dokumentasi lengkap (source, format, usage, limitations)
- [ ] Setiap JSON file berisi data sesuai jumlah yang diverifikasi
- [ ] Data format: `[{name, price, category, brand, type, desc, image_url}]`
- [ ] Verified: File dapat di-parse sebagai valid JSON

### Must Have
- Use public API endpoints (no authentication needed)
- Clean data format (price as integer from `lowest_price`)
- Category classification per file
- Brand extraction for Pulsa category
- All fields from API response preserved

### Must NOT Have
- No web scraping (use API only)
- No SKU codes (tidak tersedia di public API)
- No stock status (tidak tersedia di public API)
- No authentication (public endpoints only)

## Verification Strategy
- Manual: Open each JSON file, verify valid JSON format
- Manual: Check README.md completeness
- Manual: Verify product counts match expected ranges

## TODOs

- [ ] 1. Fetch products from Digiflazz API and create JSON files

  **What to do**:
  1. Use `webfetch` tool to call Digiflazz public API endpoints:
     - `https://id.digiflazz.com/api/v1/category` - get category IDs
     - `https://id.digiflazz.com/api/v1/product?type=prepaid&category_id=<id>` - get products per category
     - `https://id.digiflazz.com/api/v1/brandPasca` - get pascabayar brands
  2. Category IDs verified:
     - `KWy9W4` = Pulsa (518 products)
     - `1o6yg8` = Data (3456 products)
     - `VDzZDM` = Games (3893 products)
     - `8gKlob` = Voucher
     - `1D7Vod` = E-Money
     - `bg4dgB` = PLN
  3. For Pulsa category, filter by brand and create 7 files:
     - `telkomsel.json` - filter brand=TELKOMSEL (273 products)
     - `xl.json` - filter brand=XL (17 products)
     - `indosat.json` - filter brand=INDOSAT (38 products)
     - `tri.json` - filter brand=TRI (28 products)
     - `smartfren.json` - filter brand=SMARTFREN (42 products)
     - `axis.json` - filter brand=AXIS (18 products)
     - `byu.json` - filter brand=by.U (102 products)
  4. For other categories, save as single files:
     - `data.json`, `games.json`, `voucher.json`, `emoney.json`, `pln.json`
  5. For pascabayar, save brand list as `pascabayar.json`
  6. Transform API response to target format:
     ```json
     {
       "name": "<item.name>",
       "price": <item.lowest_price>,
       "category": "<category_name>",
       "brand": "<item.brand>",
       "type": "<item.type>",
       "desc": "<item.desc>",
       "image_url": "<item.image_url>"
     }
     ```
  7. Filter: Skip if `lowest_price` is null, undefined, 0, or "-"
  8. Save all files to `digiflazz-product-reference/` folder

  **Must NOT do**:
  - Do not use Playwright (API endpoints are public, no browser needed)
  - Do not include products with invalid prices
  - Do not modify API response structure (keep all fields)

  **Recommended Agent Profile**:
  - Category: `quick` - Simple API fetching and file writing
  - Skills: `[]` - No special skills needed
  - Omitted: All skills - straightforward webfetch + write operations

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2] | Blocked By: []

  **References**:
  - API Base: `https://id.digiflazz.com/api/v1/`
  - Endpoints verified by build agent exploration
  - Sample response shape:
    ```json
    {
      "name": "Telkomsel 5.000",
      "brand": "TELKOMSEL",
      "type": "Umum",
      "image_url": "https://cdn.mobilepulsa.net/img/logo/pulsa/small/telkomsel.png",
      "desc": "Reguler",
      "lowest_price": 4000,
      "lowest_price_fp": 5190
    }
    ```

  **Acceptance Criteria**:
  - [ ] All 13 JSON files created in `digiflazz-product-reference/`
  - [ ] Each file contains valid JSON array
  - [ ] Telkomsel file has 270+ products
  - [ ] Data file has 3000+ products
  - [ ] Games file has 3000+ products
  - [ ] All files use consistent format with price, category, brand, type, desc, image_url

  **QA Scenarios**:
  ```
  Scenario: Verify JSON files created
    Tool: Bash
    Steps: (Get-ChildItem digiflazz-product-reference/*.json).Count
    Expected: 13 files
    Evidence: .sisyphus/evidence/digiflazz-scraping-files.txt

  Scenario: Verify JSON validity
    Tool: Bash
    Steps: Get-Content digiflazz-product-reference/telkomsel.json | ConvertFrom-Json | Measure-Object
    Expected: 270+ products, no parse errors
    Evidence: .sisyphus/evidence/digiflazz-json-validity.txt

  Scenario: Verify data format
    Tool: Bash
    Steps: (Get-Content digiflazz-product-reference/telkomsel.json | ConvertFrom-Json)[0] | ConvertTo-Json
    Expected: Has fields: name, price, category, brand, type, desc, image_url
    Evidence: .sisyphus/evidence/digiflazz-data-format.txt
  ```

  **Commit**: NO

- [ ] 2. Create README.md documentation

  **What to do**:
  1. Create `digiflazz-product-reference/README.md`
  2. Include sections:
     - **Source**: API endpoints used, fetch date, method
     - **Files**: List all 13 JSON files with descriptions and product counts
     - **Data Format**: Example JSON structure with field descriptions
     - **API Response Fields**: Explain `lowest_price`, `lowest_price_fp`, etc.
     - **Categories**: Explain category breakdown (Pulsa split by brand, others as-is)
     - **Usage**: Demo/testing vs production guidance
     - **⚠️ CRITICAL - Development API Limitation**: 
       - Public API returns 8000+ products
       - Development API only has 5 products (4 GoPay + 1 Telkomsel)
       - For testing checkout/fulfillment, ONLY use these 5 products
       - Other products will return empty/error response from dev API
       - List the 5 dev products with SKUs: gopay10, gopay20, gopay25, gopay50, telkomsel5
     - **Limitations**: No SKU, no stock, public reference only, not real-time
     - **Integration**: Example code for loading and using the data
     - **Next Steps**: How to integrate with actual Digiflazz Buyer API

  **Must NOT do**:
  - Do not include sensitive credentials
  - Do not promise real-time data (this is static reference)
  - Do not claim this replaces actual API integration

  **Recommended Agent Profile**:
  - Category: `writing` - Documentation task
  - Skills: `[]` - No special skills needed
  - Omitted: All skills - straightforward markdown writing

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [] | Blocked By: [1]

  **References**:
  - API endpoints from task 1
  - Product counts from task 1
  - Sample data format from task 1

  **Acceptance Criteria**:
  - [ ] README.md exists in `digiflazz-product-reference/`
  - [ ] All sections present and complete
  - [ ] Example JSON structure matches actual files
  - [ ] Usage instructions clear for demo vs production
  - [ ] Limitations clearly stated

  **QA Scenarios**:
  ```
  Scenario: Verify README exists
    Tool: Bash
    Steps: Test-Path digiflazz-product-reference/README.md
    Expected: True
    Evidence: .sisyphus/evidence/digiflazz-readme-exists.txt

  Scenario: Verify README completeness
    Tool: Bash
    Steps: Get-Content digiflazz-product-reference/README.md | Select-String "## Source|## Files|## Usage|## Limitations"
    Expected: All sections found
    Evidence: .sisyphus/evidence/digiflazz-readme-sections.txt
  ```

  **Commit**: YES | Message: `docs: add Digiflazz product reference from public API` | Files: [digiflazz-product-reference/*]

## Important Notes

### Testing with Development API
**CRITICAL**: Saat testing checkout/fulfillment, HANYA gunakan produk yang ada di Digiflazz Development API.

**Development API Products** (verified working):
- GoPay 10.000 (SKU: gopay10)
- GoPay 20.000 (SKU: gopay20)
- GoPay 25.000 (SKU: gopay25)
- GoPay 50.000 (SKU: gopay50)
- Telkomsel 5.000 (SKU: telkomsel5)

**Why This Matters**:
- Development API hanya punya 5 produk aktif
- Produk lain dari public API mungkin tidak ada di development environment
- Testing dengan produk yang tidak ada = API response kosong/error
- Bisa menyebabkan false negative dalam testing

**Recommendation**:
1. Gunakan product reference ini untuk UI/catalog display
2. Untuk testing checkout/fulfillment, filter hanya 5 produk development
3. Tambahkan flag `is_dev_available: true/false` di product reference
4. Frontend bisa show semua produk, tapi disable checkout untuk non-dev products
5. Production nanti bisa enable semua produk setelah switch ke production API

## Success Criteria
- All 13 JSON files created with valid data
- README.md complete and informative
- Data can be used as reference for demo/testing
- Clear distinction between static reference vs real-time API integration
- Product counts match verified ranges from API exploration
- README includes warning about development API limitations

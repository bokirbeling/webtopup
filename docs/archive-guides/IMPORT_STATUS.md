# Import Status dan Instruksi

## Status Saat Ini
- **Database**: 115 products
- **Target**: 11,247 products  
- **Remaining**: 11,132 products (50 mini-batches)

## File yang Sudah Disiapkan

### Mini-Batches (READY TO EXECUTE)
- **Location**: `digiflazz-product-reference/mini-batches/`
- **Files**: `mini-batch-001.sql` to `mini-batch-050.sql`
- **Size**: 44-68 KB per file (~250 products each)
- **Total**: 50 batches

### Scripts yang Tersedia
1. `backend/src/scripts/execute-all-batches.ts` - Auto-execute via pg client (requires credentials)
2. `backend/src/scripts/execute-mini-batch.ts` - Execute single batch via pg client
3. `backend/src/scripts/batch-execution-plan.ts` - Show detailed execution plan
4. `backend/src/scripts/print-batch.js` - Print SQL for manual copy-paste

## Cara Import

### Option 1: Automated (RECOMMENDED)
Gunakan script dengan Supabase credentials:

```bash
cd backend
npx tsx src/scripts/execute-all-batches.ts <supabase-url> <service-role-key>
```

**Example**:
```bash
npx tsx src/scripts/execute-all-batches.ts https://xxx.supabase.co eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Features**:
- Auto-execute all 50 batches sequentially
- Progress tracking every 10 batches
- Error handling and retry logic
- Final verification

### Option 2: Manual via MCP (CURRENT APPROACH)
Execute each batch via `adnanpay-supabase_execute_sql`:

```bash
# Read batch file
Get-Content "digiflazz-product-reference\mini-batches\mini-batch-001.sql" -Raw

# Execute via MCP tool: adnanpay-supabase_execute_sql
# Repeat for batches 002-050
```

**Progress Checkpoints**:
- After batch 10: ~2,615 products
- After batch 20: ~5,115 products
- After batch 30: ~7,615 products
- After batch 40: ~10,115 products
- After batch 50: ~11,247 products ✅

### Option 3: Direct Postgres Connection
Jika punya akses direct ke Postgres:

```bash
cd backend
npx tsx src/scripts/execute-mini-batch.ts 1 <supabase-url> <service-role-key>
```

## Verification Commands

### Check Current Count
```sql
SELECT COUNT(*) as count FROM demo_products;
```

### Check by Category
```sql
SELECT category, COUNT(*) as count 
FROM demo_products 
GROUP BY category 
ORDER BY count DESC;
```

### Check Latest Imports
```sql
SELECT * FROM demo_products 
ORDER BY created_at DESC 
LIMIT 10;
```

## Next Steps

1. **Pilih metode import** (Option 1 recommended)
2. **Execute batches** (manual atau automated)
3. **Verify count** setiap 10 batches
4. **Final verification** setelah batch 50

## Troubleshooting

### Issue: "Invalid API key"
- Check `.env` file has correct `SUPABASE_SERVICE_ROLE_KEY`
- Or provide credentials via command line argument

### Issue: "File too large for MCP"
- Use Option 1 (automated script) instead
- Script uses direct Postgres connection, no size limit

### Issue: Import fails mid-way
- Check which batch failed
- Resume from that batch number
- Use `execute-mini-batch.ts` for single batch retry

## Files Reference

### SQL Batches
```
digiflazz-product-reference/
├── mini-batches/
│   ├── mini-batch-001.sql (250 products)
│   ├── mini-batch-002.sql (250 products)
│   ├── ...
│   └── mini-batch-050.sql (~247 products)
```

### Import Scripts
```
backend/src/scripts/
├── execute-all-batches.ts      # Auto-execute all batches
├── execute-mini-batch.ts       # Execute single batch
├── batch-execution-plan.ts     # Show execution plan
├── generate-import-sql.ts      # Generate SQL from JSON
├── split-sql-batches.ts        # Split into chunks
└── print-batch.js              # Print SQL for copy-paste
```

## Expected Final State

```
Total Products: 11,247
Categories:
- Data: ~3,446
- Games: ~3,893
- Voucher: ~1,844
- E-Money: ~1,517
- Pulsa: ~518
- PLN: ~11
- Others: ~18
```

# Admin Product Upload Template from Digiflazz Excel

## TL;DR

Implement admin feature to upload Digiflazz product template Excel (`daftar-produk-buyer.xlsx`), automatically match existing products by SKU, create new products if SKU not found, and allow admin to edit/delete products via UI.

## Context

User has Digiflazz product template Excel file at `D:\coding\1.PPOB PAYMENT\contoh template\daftar-produk-buyer.xlsx`. Admin needs ability to:
1. Upload Excel file
2. System auto-matches products by SKU (sku_digiflazz)
3. If SKU exists → update product data
4. If SKU not found → create new product
5. Admin can edit product details via UI
6. Admin can delete products via UI

## Non-Negotiable Decisions

- Excel parsing must be server-side (security)
- SKU matching is case-insensitive
- Duplicate SKUs in upload file → reject entire upload with error
- Product updates preserve existing pricing rules
- Product deletion cascades to pricing rules (ON DELETE CASCADE already in schema)
- Upload must be transactional (all or nothing)
- Admin-only feature (role check required)

## Tasks

### T1. Analyze Excel Template Structure

**What to do**:
- Read `contoh template/daftar-produk-buyer.xlsx`
- Document column structure and data types
- Identify required vs optional fields
- Map Excel columns to `products` table schema
- Create evidence file with sample data

**Must do**:
- Use `xlsx` or `exceljs` library for parsing
- Handle both `.xlsx` and `.xls` formats
- Validate column headers match expected format

**Must not**:
- Do not assume column order
- Do not skip validation of required fields

**Acceptance Criteria**:
- [ ] Excel structure documented in evidence file
- [ ] Column mapping defined: Excel → products table
- [ ] Required fields identified
- [ ] Sample data extracted (first 5 rows)

**Evidence**: `.sisyphus/evidence/excel-template-structure.md`

---

### T2. Create Backend Product Upload Service

**What to do**:
- Create `backend/src/modules/admin/product-upload.service.ts`
- Implement `parseExcelFile(buffer: Buffer): ProductUploadRow[]`
- Implement `validateUploadData(rows: ProductUploadRow[]): ValidationResult`
- Implement `processProductUpload(rows: ProductUploadRow[], adminId: string): UploadResult`
- Add types to `backend/src/modules/admin/product-upload.types.ts`

**Must do**:
- Validate Excel structure (required columns present)
- Check for duplicate SKUs within upload file
- Match existing products by `sku_digiflazz` (case-insensitive)
- Use database transaction for all updates/inserts
- Return detailed result: {created: number, updated: number, errors: string[]}
- Log all upload operations to audit trail

**Must not**:
- Do not allow partial uploads (transaction must rollback on any error)
- Do not expose database errors to client
- Do not skip SKU validation

**Acceptance Criteria**:
- [ ] Service parses Excel correctly
- [ ] Duplicate SKU detection works
- [ ] Transaction rollback on error
- [ ] Audit logging implemented
- [ ] Type-safe interfaces

**Evidence**: `.sisyphus/evidence/product-upload-service.md`

---

### T3. Create Admin Product Upload API Endpoint

**What to do**:
- Add `POST /api/admin/products/upload` to `backend/src/modules/admin/admin.router.ts`
- Use `multer` for file upload handling
- Validate file type (only .xlsx, .xls)
- Validate file size (max 5MB)
- Call product upload service
- Return upload result with statistics

**Must do**:
- Require admin authentication
- Validate Content-Type: multipart/form-data
- Clean up uploaded file after processing
- Return detailed error messages for validation failures
- Include upload statistics in response

**Must not**:
- Do not store uploaded files permanently
- Do not allow non-admin users
- Do not skip file validation

**Acceptance Criteria**:
- [ ] Endpoint accepts Excel file upload
- [ ] Admin-only access enforced
- [ ] File validation works (type, size)
- [ ] Returns upload statistics
- [ ] Temporary files cleaned up

**Evidence**: `.sisyphus/evidence/product-upload-api.md`

---

### T4. Create Admin Product Management UI

**What to do**:
- Create `Frontend/src/components/AdminProductUpload.tsx`
- Add file upload form with drag-and-drop
- Show upload progress
- Display upload results (created, updated, errors)
- Create `Frontend/src/components/AdminProductList.tsx`
- Show paginated product list with search/filter
- Add edit button → modal with product form
- Add delete button → confirmation dialog

**Must do**:
- Show upload progress indicator
- Display detailed error messages
- Implement search by SKU, name, category
- Implement filter by category, provider, is_active
- Implement pagination (50 products per page)
- Confirm before delete
- Refresh list after upload/edit/delete

**Must not**:
- Do not allow upload without file selection
- Do not skip confirmation on delete
- Do not show raw error messages

**Acceptance Criteria**:
- [ ] Upload form with drag-and-drop works
- [ ] Progress indicator shows during upload
- [ ] Upload results displayed clearly
- [ ] Product list shows all products
- [ ] Search and filter work
- [ ] Edit modal saves changes
- [ ] Delete confirmation works

**Evidence**: `.sisyphus/evidence/product-management-ui.md`

---

### T5. Create Admin Product Edit/Delete API Endpoints

**What to do**:
- Add `PUT /api/admin/products/:id` to admin router
- Add `DELETE /api/admin/products/:id` to admin router
- Implement validation for product updates
- Implement soft delete or hard delete (based on schema)
- Return updated product data

**Must do**:
- Require admin authentication
- Validate product ID exists
- Validate update payload (required fields, data types)
- Log edit/delete operations to audit trail
- Return 404 if product not found

**Must not**:
- Do not allow editing system-critical fields without validation
- Do not skip audit logging
- Do not expose database errors

**Acceptance Criteria**:
- [ ] PUT endpoint updates product
- [ ] DELETE endpoint removes product
- [ ] Admin-only access enforced
- [ ] Validation works
- [ ] Audit logging implemented

**Evidence**: `.sisyphus/evidence/product-edit-delete-api.md`

---

### T6. Add Product Upload to Admin Dashboard

**What to do**:
- Add "Upload Products" button to admin dashboard
- Add "Manage Products" link to admin navigation
- Create route `/admin/products` in Frontend
- Integrate AdminProductUpload and AdminProductList components

**Must do**:
- Show upload button prominently
- Add navigation to product management page
- Show product count on dashboard
- Add breadcrumb navigation

**Must not**:
- Do not hide upload feature
- Do not skip navigation updates

**Acceptance Criteria**:
- [ ] Upload button visible on dashboard
- [ ] Product management page accessible
- [ ] Navigation works
- [ ] Breadcrumbs show current location

**Evidence**: `.sisyphus/evidence/admin-dashboard-integration.md`

---

### T7. Install Dependencies and Build

**What to do**:
- Install `xlsx` or `exceljs` for Excel parsing
- Install `multer` and `@types/multer` for file uploads
- Install `@types/node` if missing
- Build backend: `npm run build`
- Build frontend: `npm run build`
- Verify no TypeScript errors

**Must do**:
- Use exact versions for dependencies
- Verify build succeeds
- Check for type errors

**Must not**:
- Do not skip dependency installation
- Do not ignore build errors

**Acceptance Criteria**:
- [ ] Dependencies installed
- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] No TypeScript errors

**Evidence**: `.sisyphus/evidence/product-upload-build.txt`

---

### T8. Deploy to Server and Test

**What to do**:
- Package backend with new modules
- Upload to Natanetwork server
- Restart backend
- Test upload with sample Excel file
- Test edit product
- Test delete product
- Verify audit logs

**Must do**:
- Backup before deployment
- Test all endpoints
- Verify file upload works
- Check audit logs created

**Must not**:
- Do not skip backup
- Do not deploy without testing locally first

**Acceptance Criteria**:
- [ ] Backend deployed successfully
- [ ] Upload endpoint works
- [ ] Edit endpoint works
- [ ] Delete endpoint works
- [ ] Audit logs verified

**Evidence**: `.sisyphus/evidence/product-upload-deployment.md`

---

## Final Verification (F1-F4)

### F1. Upload Validation Tests

**Scenarios**:
1. Upload valid Excel → all products created/updated
2. Upload Excel with duplicate SKUs → rejected with error
3. Upload Excel with missing required fields → rejected with error
4. Upload non-Excel file → rejected with error
5. Upload file > 5MB → rejected with error

**Evidence**: `.sisyphus/evidence/product-upload-validation-tests.md`

---

### F2. Product Management Tests

**Scenarios**:
1. Search product by SKU → found
2. Filter products by category → correct results
3. Edit product name → saved successfully
4. Edit product price → saved successfully
5. Delete product → removed from list
6. Delete product with pricing rules → cascades correctly

**Evidence**: `.sisyphus/evidence/product-management-tests.md`

---

### F3. Security Tests

**Scenarios**:
1. Non-admin user tries upload → 403 Forbidden
2. Non-admin user tries edit → 403 Forbidden
3. Non-admin user tries delete → 403 Forbidden
4. Upload malicious file → rejected
5. SQL injection in product name → sanitized

**Evidence**: `.sisyphus/evidence/product-upload-security-tests.md`

---

### F4. Audit Trail Verification

**Scenarios**:
1. Upload products → audit log created with admin ID, timestamp, count
2. Edit product → audit log created with old/new values
3. Delete product → audit log created with product details

**Evidence**: `.sisyphus/evidence/product-upload-audit-verification.md`

---

## Deliverables

1. Backend modules:
   - `backend/src/modules/admin/product-upload.service.ts`
   - `backend/src/modules/admin/product-upload.types.ts`
   - Updated `backend/src/modules/admin/admin.router.ts`

2. Frontend components:
   - `Frontend/src/components/AdminProductUpload.tsx`
   - `Frontend/src/components/AdminProductList.tsx`
   - Updated `Frontend/src/pages/Admin.tsx`

3. Dependencies:
   - `xlsx` or `exceljs`
   - `multer` + `@types/multer`

4. Evidence files:
   - Excel template structure analysis
   - Service implementation details
   - API endpoint documentation
   - UI component screenshots
   - Test results
   - Deployment verification

5. Git commit:
   - Message: "feat: add admin product upload from Digiflazz Excel template"
   - No push (as requested)

---

## Effort Estimate

- T1: 15 min (Excel analysis)
- T2: 45 min (Backend service)
- T3: 30 min (API endpoint)
- T4: 60 min (UI components)
- T5: 30 min (Edit/delete endpoints)
- T6: 15 min (Dashboard integration)
- T7: 15 min (Dependencies and build)
- T8: 30 min (Deployment and testing)
- F1-F4: 30 min (Final verification)

**Total**: ~4 hours

---

## Dependencies

- Requires: Admin authentication working
- Requires: Products table schema with sku_digiflazz column
- Requires: Audit logging infrastructure
- Blocks: None

---

## Risks

1. **Excel format changes**: Digiflazz may update template format
   - Mitigation: Validate column headers, show clear error if format mismatch

2. **Large file uploads**: 5MB limit may be too small for large catalogs
   - Mitigation: Make limit configurable, add streaming parser if needed

3. **Concurrent uploads**: Multiple admins uploading simultaneously
   - Mitigation: Use database transactions, show warning if upload in progress

4. **SKU conflicts**: Same SKU in different categories
   - Mitigation: SKU should be unique across all categories (already enforced by unique index)

---

## Notes

- Excel template location: `D:\coding\1.PPOB PAYMENT\contoh template\daftar-produk-buyer.xlsx`
- Current products table has unique index on `sku_digiflazz`
- Pricing rules have foreign key to products with ON DELETE CASCADE
- Admin role check already implemented in auth middleware
- Audit logging infrastructure exists in `backend/src/modules/audit/`

# Admin Email Management and Comprehensive Testing Plan

## TL;DR

Add admin email management panel, run comprehensive testing per PRD, prepare for production deployment after legal setup.

## User Request

> "tambahakan ,dan lakukan test lengkap sesuai prd update ,kemudian jika semua lengkap demo berjalan normal maka update prodution code ,env nti saya siapkan jika saya sdh urus legal digiflaz dan midtrans"

## Scope

1. Add admin email management panel
2. Run comprehensive testing per PRD
3. Prepare production deployment (wait for legal + env)

## Tasks

### Phase 1: Admin Email Management (8 tasks)

#### T1: Backend - Email History/Log
- Create `email_logs` table migration
- Fields: id, to, from, subject, body, template_type, status, sent_at, error_message
- Add `backend/src/modules/email/email-log.repository.ts`
- Add logging to all email send methods

#### T2: Backend - Manual Send Email API
- Add `POST /api/admin/email/send` endpoint
- Input: to, subject, body, template_type (optional)
- Validation: email format, required fields
- Log all sends

#### T3: Backend - Bulk Email API
- Add `POST /api/admin/email/bulk-send` endpoint
- Input: recipients[], subject, body, template_type
- Batch processing with rate limiting
- Progress tracking

#### T4: Backend - Email Templates CRUD
- Add `email_templates` table migration
- Fields: id, name, subject, body_html, body_text, variables, is_active
- Add CRUD endpoints: GET, POST, PUT, DELETE /api/admin/email/templates

#### T5: Frontend - Email Management Page
- Create `Frontend/src/components/AdminEmailManagement.tsx`
- Tabs: Send Email, Email History, Templates, Bulk Send
- Integrate into AdminDashboard.tsx

#### T6: Frontend - Manual Send Form
- Form: To, Subject, Body (rich text editor)
- Template selector (optional)
- Preview before send
- Send button with confirmation

#### T7: Frontend - Email History Table
- Columns: Date, To, Subject, Status, Actions
- Filters: Date range, Status, Recipient
- Pagination
- View details modal

#### T8: Frontend - Bulk Send Interface
- Upload CSV (email, name columns)
- Or manual textarea (one email per line)
- Template selector
- Variable mapping
- Preview and send

### Phase 2: Comprehensive Testing (12 tasks)

#### T9: Test Guest Checkout Flow
- Test all 5 dev products (gopay10, gopay20, gopay25, gopay50, telkomsel5)
- Verify order creation
- Verify payment initialization
- Verify email confirmation sent
- Take screenshots

#### T10: Test Order Tracking
- Track order by invoice code
- Verify status updates
- Verify fulfillment callback
- Take screenshots

#### T11: Test Reseller Registration
- Register new reseller
- Verify email verification sent
- Verify email verification link works
- Verify dashboard access after verification

#### T12: Test Reseller Transaction
- Login as reseller
- View product catalog with reseller pricing
- Create order
- Verify commission calculation
- Verify transaction history

#### T13: Test Reseller Payout
- Request payout
- Verify balance reservation
- Verify payout request email sent
- Admin approve payout
- Verify balance updated

#### T14: Test Admin Product Management
- Upload Excel template
- Verify SKU matching
- Verify new products created
- Edit product
- Delete product
- Verify catalog updated

#### T15: Test Admin Email Management
- Send manual email
- Send bulk email
- View email history
- Create email template
- Edit email template

#### T16: Test Backend APIs
- Health check
- Catalog API
- Order API
- Payment API
- Admin APIs
- All return correct status codes

#### T17: Test Email Notifications
- Order confirmation email
- Payment success email
- Fulfillment success email
- Payout request email
- Admin alert email
- Email verification email

#### T18: Test Security
- RLS policies enforced
- Admin-only endpoints protected
- User isolation working
- No SQL injection
- No XSS vulnerabilities

#### T19: Test Performance
- Page load times < 3s
- API response times < 500ms
- Database queries optimized
- No N+1 queries
- Frontend bundle size reasonable

#### T20: Create Test Report
- Summary of all tests
- Pass/fail status
- Screenshots
- Bug reports (if any)
- Performance metrics

### Phase 3: Production Preparation (5 tasks)

#### T21: Create Production Deployment Checklist
- Environment variables needed
- Database migrations to apply
- Backend deployment steps
- Frontend deployment steps
- Verification steps

#### T22: Create Production Environment Template
- `.env.production.template` with all required vars
- Comments explaining each variable
- Placeholder values
- Security notes

#### T23: Document Legal Requirements
- Digiflazz production credentials needed
- Midtrans production credentials needed
- Email SMTP for production
- Domain SSL certificate
- Terms of service
- Privacy policy

#### T24: Create Production Deployment Script
- Backup current production
- Apply migrations
- Deploy backend
- Deploy frontend
- Verify deployment
- Rollback if needed

#### T25: Create Production Monitoring Plan
- Error logging
- Performance monitoring
- Email delivery monitoring
- Payment success rate
- Fulfillment success rate
- User activity tracking

## Deliverables

### Phase 1
- Email logs table and repository
- Manual send email API
- Bulk send email API
- Email templates CRUD
- Admin email management UI
- All integrated and working

### Phase 2
- Test report with all scenarios
- Screenshots of all flows
- Bug reports (if any)
- Performance metrics
- Security audit results

### Phase 3
- Production deployment checklist
- Environment template
- Legal requirements doc
- Deployment script
- Monitoring plan

## Acceptance Criteria

### Phase 1
- [ ] Admin can send manual email
- [ ] Admin can send bulk email
- [ ] Admin can view email history
- [ ] Admin can create/edit email templates
- [ ] All emails logged to database

### Phase 2
- [ ] All 5 dev products work in checkout
- [ ] Order tracking works
- [ ] Reseller registration works
- [ ] Reseller transactions work
- [ ] Reseller payout works
- [ ] Admin product upload works
- [ ] Admin email management works
- [ ] All backend APIs work
- [ ] All email notifications sent
- [ ] Security tests pass
- [ ] Performance tests pass
- [ ] Test report created

### Phase 3
- [ ] Production checklist complete
- [ ] Environment template created
- [ ] Legal requirements documented
- [ ] Deployment script ready
- [ ] Monitoring plan documented

## Timeline

- Phase 1: 4-6 hours
- Phase 2: 6-8 hours
- Phase 3: 2-3 hours
- **Total**: 12-17 hours

## Dependencies

- Phase 2 depends on Phase 1 completion
- Phase 3 can run in parallel with Phase 2
- Production deployment waits for user's legal setup

## Notes

- Use existing email service as foundation
- Follow existing code patterns
- Maintain 10/10 quality standard
- Document everything
- Create evidence files for all tests

## Status

- [ ] Phase 1: Admin Email Management
- [ ] Phase 2: Comprehensive Testing
- [ ] Phase 3: Production Preparation
- [ ] Ready for Production Deployment (after legal)

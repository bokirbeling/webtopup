# Email Setup and System Integration

## TL;DR
> **Summary**: Setup email system via cPanel/SSH, create official email accounts, configure SMTP for backend, integrate email verification and notifications across all systems.
> **Deliverables**:
> - Email accounts created (mail@adnanpay.com, noreply@adnanpay.com, admin@adnanpay.com)
> - SMTP configuration in backend
> - Email verification for users/resellers
> - Email notifications for transactions
> - Email templates for all scenarios
> **Effort**: Medium
> **Parallel**: NO - Sequential setup and testing
> **Critical Path**: Create emails → Configure SMTP → Test sending → Integrate verification → Integrate notifications

## Context
### Original Request
User has cPanel email management access and wants:
1. Setup email via SSH/cPanel
2. Connect all systems that use email
3. Official format: `mail@adnanpay.com` for resmi/official communications

### Current State
- cPanel email features available: Accounts, Forwarders, Autoresponders, Filters, etc.
- Backend has email verification fields in database (migration `20260515110000_email_verification_fields.sql`)
- Backend has `email-verification.sender.ts` interface but no implementation
- No SMTP configuration in `.env.production` yet
- Email verification status tracked but not sent

### Email Requirements
**Official Email Accounts Needed**:
1. `mail@adnanpay.com` - Official/resmi communications, customer support
2. `noreply@adnanpay.com` - Automated emails (verification, notifications)
3. `admin@adnanpay.com` - Admin notifications, alerts

**Email Use Cases**:
1. **User/Reseller Registration**: Email verification link
2. **Order Confirmation**: Invoice details, payment instructions
3. **Payment Success**: Receipt, transaction details
4. **Fulfillment Success**: Product delivery confirmation
5. **Payout Request**: Confirmation, status updates
6. **Admin Alerts**: New reseller requests, high-value transactions

## Work Objectives
### Core Objective
Setup complete email system with SMTP configuration, create official email accounts, and integrate email sending across all backend modules.

### Deliverables
1. Email accounts created in cPanel
2. SMTP credentials configured in backend
3. Nodemailer service implementation
4. Email templates for all scenarios
5. Email verification flow working
6. Email notifications for transactions
7. Test results and evidence

### Definition of Done
- [ ] All 3 email accounts created and accessible
- [ ] SMTP configuration working in backend
- [ ] Email verification sends successfully
- [ ] Order confirmation emails send
- [ ] Payment/fulfillment emails send
- [ ] Payout emails send
- [ ] All email templates professional and branded
- [ ] Email deliverability verified (not spam)

### Must Have
- Professional email templates with Adnanpay branding
- HTML + plain text versions
- Unsubscribe links where required
- SPF/DKIM verification (if possible via cPanel)
- Error handling for failed sends
- Email logs for debugging

### Must NOT Have
- Spam-like content
- Unencrypted password transmission
- Hardcoded credentials in code
- Missing error handling

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: Manual testing with real email accounts
- QA policy: Send test emails for each scenario
- Evidence: .sisyphus/evidence/email-*.txt

## Execution Strategy
### Parallel Execution Waves

**Wave 1: Email Account Setup** (Sequential)
- T1: Create email accounts via cPanel/SSH
- T2: Verify email accounts and get SMTP credentials
- T3: Configure SPF/DKIM if available

**Wave 2: Backend Integration** (Sequential)
- T4: Implement nodemailer service
- T5: Create email templates
- T6: Integrate email verification
- T7: Integrate order/payment notifications

**Wave 3: Testing** (Sequential)
- T8: Test email sending
- T9: Test email deliverability
- T10: Fix issues and re-test

## TODOs

- [ ] 1. Create email accounts via cPanel/SSH

  **What to do**:
  - SSH to Natanetwork server
  - Check existing email accounts: `uapi --user=adnanpay Email list_pops`
  - Create 3 email accounts via cPanel API:
    - `mail@adnanpay.com` - Password: Strong random (save to evidence)
    - `noreply@adnanpay.com` - Password: Strong random (save to evidence)
    - `admin@adnanpay.com` - Password: Strong random (save to evidence)
  - Command: `uapi --user=adnanpay Email add_pop email=mail@adnanpay.com password=<strong-password> quota=250`
  - Verify accounts created: `uapi --user=adnanpay Email list_pops`
  
  **Must NOT do**:
  - Do not use weak passwords
  - Do not expose passwords in logs
  - Do not skip quota setting

  **Recommended Agent Profile**:
  - Category: `quick` - Simple cPanel operations
  - Skills: [`adnanpay-natanetwork`] - SSH access required
  - Omitted: All others - Basic cPanel API

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [T2] | Blocked By: []

  **References**:
  - cPanel API: https://api.docs.cpanel.net/openapi/cpanel/operation/add_pop/
  - Server: 103.164.173.46:31988, user: adnanpay

  **Acceptance Criteria**:
  - [ ] All 3 email accounts created
  - [ ] Passwords saved securely to evidence file
  - [ ] Accounts verified via list_pops

  **QA Scenarios**:
  ```
  Scenario: Verify email accounts created
    Tool: adnanpay-natanetwork_exec
    Steps: uapi --user=adnanpay Email list_pops | grep -E "mail@|noreply@|admin@"
    Expected: All 3 emails listed
    Evidence: .sisyphus/evidence/email-accounts-created.txt

  Scenario: Verify account details
    Tool: adnanpay-natanetwork_exec
    Steps: uapi --user=adnanpay Email list_pops_with_disk
    Expected: Quota and disk usage shown
    Evidence: .sisyphus/evidence/email-accounts-details.txt
  ```

  **Commit**: NO

- [ ] 2. Configure SMTP and test connection

  **What to do**:
  - SMTP credentials already obtained from cPanel:
    - Host: `mail.adnanpay.com`
    - Port: 465 (SSL/TLS)
    - Username: `mail@adnanpay.com`
    - Password: `jVIcC2L?B=ecJ0#?`
    - Authentication: Required
  - Test SMTP connection from server:
    ```bash
    openssl s_client -connect mail.adnanpay.com:465 -crlf
    ```
  - Document SMTP test results in evidence file
  - Create `.env.production` backup
  - Add SMTP config to `.env.production` (production):
    ```
    SMTP_HOST=mail.adnanpay.com
    SMTP_PORT=465
    SMTP_SECURE=true
    SMTP_USER=mail@adnanpay.com
    SMTP_PASS=jVIcC2L?B=ecJ0#?
    SMTP_FROM_NAME=Adnanpay
    SMTP_FROM_EMAIL=mail@adnanpay.com
    ```
  - For demo environment, use separate credentials:
    ```
    SMTP_HOST=mail.adnanpay.com
    SMTP_PORT=465
    SMTP_SECURE=true
    SMTP_USER=demo.mail@adnanpay.com
    SMTP_PASS=Zp5ph%eFzfp(Wuox
    SMTP_FROM_NAME=Adnanpay Demo
    SMTP_FROM_EMAIL=demo.mail@adnanpay.com
    ```
  
  **Must NOT do**:
  - Do not commit passwords to git
  - Do not use unencrypted connection
  - Do not skip connection test

  **Recommended Agent Profile**:
  - Category: `quick` - Configuration and testing
  - Skills: [`adnanpay-natanetwork`] - SSH access required
  - Omitted: All others - Basic network testing

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [T4] | Blocked By: [T1]

  **References**:
  - cPanel SMTP docs: https://docs.cpanel.net/knowledge-base/email/how-to-configure-your-email-client/
  - Backend env: `/home/adnanpay/ppob-backend/.env.production`

  **Acceptance Criteria**:
  - [ ] SMTP server details documented
  - [ ] Connection test successful
  - [ ] `.env.production` updated with SMTP config
  - [ ] Backup created

  **QA Scenarios**:
  ```
  Scenario: Test SMTP connection
    Tool: adnanpay-natanetwork_exec
    Steps: timeout 5 telnet mail.adnanpay.com 587
    Expected: Connection established
    Evidence: .sisyphus/evidence/email-smtp-connection.txt

  Scenario: Verify env updated
    Tool: adnanpay-natanetwork_exec
    Steps: grep SMTP_HOST /home/adnanpay/ppob-backend/.env.production
    Expected: SMTP_HOST=mail.adnanpay.com
    Evidence: .sisyphus/evidence/email-env-config.txt
  ```

  **Commit**: NO

- [ ] 3. Configure SPF/DKIM records (if available)

  **What to do**:
  - Check if cPanel has Email Deliverability section
  - SSH: Check DNS records: `dig adnanpay.com TXT`
  - If SPF not set, document required SPF record:
    ```
    v=spf1 a mx ip4:<server-ip> ~all
    ```
  - If DKIM available in cPanel, enable it
  - Document current state and recommendations
  - Note: DNS changes may require domain registrar access
  
  **Must NOT do**:
  - Do not modify DNS without user confirmation
  - Do not skip documentation
  - Do not assume DNS access

  **Recommended Agent Profile**:
  - Category: `quick` - Check and document
  - Skills: [`adnanpay-natanetwork`] - SSH access required
  - Omitted: All others - Basic DNS checking

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [] | Blocked By: [T1]

  **References**:
  - SPF: https://www.spf-record.com/
  - DKIM: https://docs.cpanel.net/cpanel/email/email-deliverability/

  **Acceptance Criteria**:
  - [ ] Current DNS records documented
  - [ ] SPF/DKIM status checked
  - [ ] Recommendations provided

  **QA Scenarios**:
  ```
  Scenario: Check SPF record
    Tool: adnanpay-natanetwork_exec
    Steps: dig adnanpay.com TXT | grep spf
    Expected: SPF record shown or not found
    Evidence: .sisyphus/evidence/email-spf-check.txt

  Scenario: Check DKIM
    Tool: adnanpay-natanetwork_exec
    Steps: dig default._domainkey.adnanpay.com TXT
    Expected: DKIM record shown or not found
    Evidence: .sisyphus/evidence/email-dkim-check.txt
  ```

  **Commit**: NO

- [ ] 4. Implement nodemailer email service

  **What to do**:
  - Create `backend/src/services/email.service.ts`
  - Implement EmailService interface:
    ```typescript
    interface EmailService {
      sendVerificationEmail(to: string, token: string): Promise<void>;
      sendOrderConfirmation(to: string, order: Order): Promise<void>;
      sendPaymentSuccess(to: string, payment: Payment): Promise<void>;
      sendFulfillmentSuccess(to: string, fulfillment: Fulfillment): Promise<void>;
      sendPayoutRequest(to: string, payout: PayoutRequest): Promise<void>;
    }
    ```
  - Use nodemailer with SMTP config from env
  - Add error handling and logging
  - Add retry logic for failed sends
  - Export factory function: `createEmailService(config)`
  
  **Must NOT do**:
  - Do not hardcode credentials
  - Do not skip error handling
  - Do not send without validation

  **Recommended Agent Profile**:
  - Category: `quick` - Single file implementation
  - Skills: [] - Standard TypeScript
  - Omitted: All - Basic service implementation

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [T6,T7] | Blocked By: [T2]

  **References**:
  - Nodemailer: https://nodemailer.com/
  - Existing interface: `backend/src/modules/auth/email-verification.sender.ts`
  - SMTP config: `.env.production` SMTP_* variables

  **Acceptance Criteria**:
  - [ ] `email.service.ts` created
  - [ ] All 5 methods implemented
  - [ ] Error handling included
  - [ ] Retry logic added
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Verify service compiles
    Tool: Bash
    Steps: cd backend && npm run build
    Expected: 0 errors
    Evidence: .sisyphus/evidence/email-service-build.txt

  Scenario: Verify exports
    Tool: Bash
    Steps: grep "export.*createEmailService" backend/src/services/email.service.ts
    Expected: Export found
    Evidence: .sisyphus/evidence/email-service-exports.txt
  ```

  **Commit**: NO

- [ ] 5. Create email templates

  **What to do**:
  - Create `backend/src/templates/` directory
  - Create HTML templates:
    - `verification-email.html` - Email verification with token link
    - `order-confirmation.html` - Order details, payment instructions
    - `payment-success.html` - Receipt, transaction details
    - `fulfillment-success.html` - Product delivery confirmation
    - `payout-request.html` - Payout confirmation, status
  - Create plain text versions for each
  - Use Adnanpay branding (colors, logo)
  - Include unsubscribe footer where required
  - Use template variables: `{{token}}`, `{{orderNumber}}`, etc.
  
  **Must NOT do**:
  - Do not use spam-like language
  - Do not skip plain text versions
  - Do not hardcode URLs (use env variables)

  **Recommended Agent Profile**:
  - Category: `quick` - Template creation
  - Skills: [] - Basic HTML/CSS
  - Omitted: All - Standard templates

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [T6,T7] | Blocked By: []

  **References**:
  - Branding: Adnanpay colors, logo from frontend
  - Email best practices: https://www.campaignmonitor.com/resources/guides/email-marketing-best-practices/

  **Acceptance Criteria**:
  - [ ] All 5 HTML templates created
  - [ ] All 5 plain text templates created
  - [ ] Templates use variables
  - [ ] Branding consistent

  **QA Scenarios**:
  ```
  Scenario: Verify templates exist
    Tool: Bash
    Steps: (Get-ChildItem backend/src/templates/*.html).Count
    Expected: 5 files
    Evidence: .sisyphus/evidence/email-templates-count.txt

  Scenario: Verify template variables
    Tool: Bash
    Steps: Get-Content backend/src/templates/verification-email.html | Select-String "{{.*}}"
    Expected: Variables found
    Evidence: .sisyphus/evidence/email-templates-variables.txt
  ```

  **Commit**: NO

- [ ] 6. Integrate email verification

  **What to do**:
  - Update `backend/src/modules/auth/auth.service.ts`
  - Inject EmailService into AuthService
  - In `requestEmailVerification()`:
    - Generate verification token
    - Save to database
    - Call `emailService.sendVerificationEmail(email, token)`
  - In `verifyEmail()`:
    - Validate token
    - Mark email as verified
    - Update database
  - Add error handling for email send failures
  - Log email send attempts
  
  **Must NOT do**:
  - Do not block registration on email send failure
  - Do not expose email service errors to user
  - Do not skip database updates

  **Recommended Agent Profile**:
  - Category: `quick` - Service integration
  - Skills: [] - Standard TypeScript
  - Omitted: All - Basic integration

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [T8] | Blocked By: [T4,T5]

  **References**:
  - Auth service: `backend/src/modules/auth/auth.service.ts`
  - Email service: `backend/src/services/email.service.ts`
  - Templates: `backend/src/templates/verification-email.html`

  **Acceptance Criteria**:
  - [ ] AuthService updated
  - [ ] Email verification sends
  - [ ] Error handling added
  - [ ] Logs included
  - [ ] TypeScript compiles

  **QA Scenarios**:
  ```
  Scenario: Verify integration compiles
    Tool: Bash
    Steps: cd backend && npm run build
    Expected: 0 errors
    Evidence: .sisyphus/evidence/email-verification-build.txt

  Scenario: Verify email service injected
    Tool: Bash
    Steps: grep "emailService" backend/src/modules/auth/auth.service.ts
    Expected: EmailService used
    Evidence: .sisyphus/evidence/email-verification-integration.txt
  ```

  **Commit**: NO

- [ ] 7. Integrate order/payment/fulfillment notifications

  **What to do**:
  - Update order service to send confirmation email after order creation
  - Update payment service to send success email after payment verified
  - Update fulfillment service to send delivery email after fulfillment success
  - Update payout service to send confirmation email after payout request
  - All emails should:
    - Include relevant details (order number, amount, status)
    - Use professional templates
    - Handle send failures gracefully
    - Log send attempts
  
  **Must NOT do**:
  - Do not block order flow on email failure
  - Do not send duplicate emails
  - Do not expose sensitive data in emails

  **Recommended Agent Profile**:
  - Category: `quick` - Multiple service updates
  - Skills: [] - Standard TypeScript
  - Omitted: All - Basic integration

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [T8] | Blocked By: [T4,T5]

  **References**:
  - Order service: `backend/src/modules/order/order.service.ts`
  - Payment service: `backend/src/modules/payment/payment.service.ts`
  - Fulfillment service: `backend/src/modules/fulfillment/fulfillment.service.ts`
  - Payout service: `backend/src/modules/payout/payout.service.ts`

  **Acceptance Criteria**:
  - [ ] All 4 services updated
  - [ ] Email notifications integrated
  - [ ] Error handling added
  - [ ] TypeScript compiles

  **QA Scenarios**:
  ```
  Scenario: Verify all services compile
    Tool: Bash
    Steps: cd backend && npm run build
    Expected: 0 errors
    Evidence: .sisyphus/evidence/email-notifications-build.txt

  Scenario: Verify email service usage
    Tool: Bash
    Steps: grep -r "emailService.send" backend/src/modules/
    Expected: Multiple matches
    Evidence: .sisyphus/evidence/email-notifications-usage.txt
  ```

  **Commit**: NO

- [ ] 8. Test email sending

  **What to do**:
  - Build backend: `npm run build`
  - Deploy to Natanetwork server
  - Restart backend
  - Test email verification:
    - Register new user via API
    - Check email received at test email
    - Verify email content and links
  - Test order confirmation:
    - Create test order via API
    - Check email received
  - Test payment success:
    - Simulate payment webhook
    - Check email received
  - Document all test results
  
  **Must NOT do**:
  - Do not skip any test scenario
  - Do not ignore failures
  - Do not test with production data

  **Recommended Agent Profile**:
  - Category: `quick` - Testing and verification
  - Skills: [`adnanpay-natanetwork`] - Deployment required
  - Omitted: All others - Basic testing

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [T9] | Blocked By: [T6,T7]

  **References**:
  - Backend API: https://adnanpay.com/ppob-api/
  - Test email: Use one of the created accounts
  - Demo mode: SUPABASE_TABLE_PREFIX=demo_

  **Acceptance Criteria**:
  - [ ] Backend deployed with email service
  - [ ] All email scenarios tested
  - [ ] Test results documented
  - [ ] All emails received successfully

  **QA Scenarios**:
  ```
  Scenario: Test verification email
    Tool: Bash + API
    Steps: POST /api/auth/register with test email
    Expected: Email received with verification link
    Evidence: .sisyphus/evidence/email-test-verification.txt

  Scenario: Test order confirmation
    Tool: Bash + API
    Steps: POST /api/orders with test data
    Expected: Email received with order details
    Evidence: .sisyphus/evidence/email-test-order.txt
  ```

  **Commit**: YES | Message: `feat: add email service with SMTP integration and notifications` | Files: [backend/src/services/email.service.ts, backend/src/templates/*, backend/src/modules/*/]

- [ ] 9. Test email deliverability

  **What to do**:
  - Check if emails land in inbox (not spam)
  - Test with multiple email providers:
    - Gmail
    - Yahoo
    - Outlook
  - Use mail-tester.com to check spam score
  - Check email headers for SPF/DKIM
  - Document deliverability results
  - If spam issues, document recommendations
  
  **Must NOT do**:
  - Do not skip deliverability testing
  - Do not ignore spam warnings
  - Do not proceed if emails go to spam

  **Recommended Agent Profile**:
  - Category: `quick` - Testing and documentation
  - Skills: [] - Basic email testing
  - Omitted: All - Standard testing

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [T10] | Blocked By: [T8]

  **References**:
  - Mail tester: https://www.mail-tester.com/
  - Email headers: Check SPF/DKIM pass/fail

  **Acceptance Criteria**:
  - [ ] Emails tested with 3 providers
  - [ ] Spam score checked
  - [ ] Deliverability documented
  - [ ] Recommendations provided if needed

  **QA Scenarios**:
  ```
  Scenario: Check spam score
    Tool: Manual
    Steps: Send test email to mail-tester.com
    Expected: Score > 7/10
    Evidence: .sisyphus/evidence/email-spam-score.txt

  Scenario: Check inbox delivery
    Tool: Manual
    Steps: Send to Gmail/Yahoo/Outlook
    Expected: All land in inbox
    Evidence: .sisyphus/evidence/email-deliverability.txt
  ```

  **Commit**: NO

- [ ] 10. Fix issues and re-test

  **What to do**:
  - Review all test results from T8 and T9
  - Fix any issues found:
    - Email not sending → Check SMTP config
    - Emails go to spam → Improve SPF/DKIM, content
    - Template errors → Fix HTML/variables
    - Service errors → Fix error handling
  - Re-test all scenarios
  - Document final results
  - Create summary report
  
  **Must NOT do**:
  - Do not skip fixes
  - Do not ignore minor issues
  - Do not proceed with known bugs

  **Recommended Agent Profile**:
  - Category: `quick` - Bug fixes and re-testing
  - Skills: [`adnanpay-natanetwork`] - May need deployment
  - Omitted: All others - Standard debugging

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [] | Blocked By: [T9]

  **References**:
  - Test results: Evidence files from T8, T9
  - Backend: All email-related files

  **Acceptance Criteria**:
  - [ ] All issues fixed
  - [ ] All tests passing
  - [ ] Summary report created
  - [ ] Email system production-ready

  **QA Scenarios**:
  ```
  Scenario: Verify all tests pass
    Tool: Bash
    Steps: Review all evidence files
    Expected: No failures
    Evidence: .sisyphus/evidence/email-final-summary.txt

  Scenario: Verify email system ready
    Tool: Manual
    Steps: Send test emails for all scenarios
    Expected: All received in inbox
    Evidence: .sisyphus/evidence/email-production-ready.txt
  ```

  **Commit**: YES | Message: `fix: email deliverability improvements and bug fixes` | Files: [backend/src/services/email.service.ts, backend/src/templates/*, .env.production]

## Final Verification Wave
> Not required - verification happens in T8, T9, T10

## Commit Strategy
- Commit after T8 with email service implementation
- Commit after T10 with fixes

## Success Criteria
- All 10 tasks completed
- Email system fully functional
- All email scenarios tested
- Deliverability verified
- Production-ready

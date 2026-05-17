# Demo Account Credentials

## Demo Environment

**URL**: https://adnanpay.com/demo/

## Test Accounts

### Guest Checkout (No Login Required)
- **Flow**: Select product → Enter customer details → Pay
- **No registration needed**
- **Available products**: 5 development products only
  - GoPay 10.000 (gopay10)
  - GoPay 20.000 (gopay20)
  - GoPay 25.000 (gopay25)
  - GoPay 50.000 (gopay50)
  - Telkomsel 5.000 (telkomsel5)

### Reseller Account
**Status**: Can be created via registration

**How to create**:
1. Go to https://adnanpay.com/demo/dashboard
2. Click "Daftar" (Register)
3. Enter email and password (min 8 characters)
4. Click "Buat akun member"
5. Login with created credentials

**Features**:
- View own transactions
- Request reseller status
- View commission (if approved)
- Request payout

### Admin Account
**Status**: Not yet created in demo database

**Required for**:
- Product management
- Price markup configuration
- User management (approve/reject resellers)
- Transaction monitoring
- Email management
- Bulk product upload

**To create admin account**:
```sql
-- Run in Supabase SQL Editor
INSERT INTO demo_users (email, password_hash, role, is_reseller_active, reseller_status)
VALUES (
  'admin@adnanpay.com',
  '$2a$10$YourBcryptHashHere', -- Use bcrypt to hash password
  'admin',
  false,
  'none'
);
```

**Or via backend API** (if auth endpoint allows):
```bash
POST https://adnanpay.com/ppob-api/api/auth/register
{
  "email": "admin@adnanpay.com",
  "password": "YourSecurePassword123",
  "role": "admin"
}
```

## Development API Limitations

**IMPORTANT**: Demo environment uses Digiflazz Development API which only supports 5 products:
- gopay10
- gopay20
- gopay25
- gopay50
- telkomsel5

**Other products** (from 7,794 scraped products) will appear in catalog but **will fail** during checkout/fulfillment because they don't exist in development API.

## Production Credentials (Pending)

Production environment requires:
1. **Midtrans Production Credentials**
   - Server Key
   - Client Key
   - Merchant ID

2. **Digiflazz Production Credentials**
   - Username
   - API Key
   - Production API Base URL

3. **Legal Documentation**
   - Business registration
   - Tax registration (NPWP)
   - API agreements signed

**Status**: Waiting for user to complete legal requirements

## Testing Recommendations

### For Guest Flow
1. Go to https://adnanpay.com/demo/
2. Select "GoPay 10.000"
3. Enter customer details:
   - Customer ID: 081234567890 (any phone number)
   - Email: test@example.com (optional)
4. Click "Bayar Sekarang"
5. Complete Midtrans sandbox payment
6. Track order via invoice code

### For Reseller Flow
1. Register new account at /dashboard
2. Login with created credentials
3. View dashboard (transactions, commission)
4. Request reseller status (requires admin approval)
5. After approval: View commission, request payout

### For Admin Flow
1. Create admin account (see above)
2. Login at /admin
3. Test features:
   - Product management
   - Price markup
   - User management
   - Transaction monitoring
   - Email management

## Security Notes

- All demo accounts use `demo_` prefixed tables
- Demo data is isolated from production
- Demo uses Midtrans sandbox (no real money)
- Demo uses Digiflazz development API (limited products)
- Email notifications use demo.mail@adnanpay.com

## Support

For issues or questions:
- Check logs: Backend logs at /home/adnanpay/ppob-backend/logs/
- Check database: Supabase project `wprbrqmimwwukrhuawms`
- Check frontend: Browser console at https://adnanpay.com/demo/

## Next Steps

1. Create admin account in demo database
2. Test all flows (guest, reseller, admin)
3. Fix any bugs found
4. Prepare production credentials
5. Deploy to production after legal completion

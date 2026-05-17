# Code Structure Cleanup and Environment Organization Plan

## TL;DR

Reorganize local code structure, clean up environment files, create comprehensive documentation, commit all changes.

## User Requests

1. "juga,update dalam plan, juga buat sumary code+ comit update"
2. "terakhir rapikan sterukur folder code lokal agar tersusun dengan rapi sesui dokumentasi dan env yang tepat, rapikan env jika masih ada yng belum tersusun dengan tepat ,semu terstrukur dengan baik."

## Current Structure Issues

### Environment Files
- ❌ Multiple .env files scattered
- ❌ No .env.example templates
- ❌ Inconsistent variable naming
- ❌ Missing documentation for each variable

### Code Organization
- ❌ Test files mixed with source
- ❌ Evidence files not organized
- ❌ Plans not archived properly
- ❌ No clear separation of demo vs production

### Documentation
- ❌ No central README
- ❌ API documentation incomplete
- ❌ Deployment guide scattered
- ❌ No architecture diagram

## Tasks

### T1: Reorganize Environment Files

**Backend Environment**:
```
backend/
├── .env.example              # Template with all variables
├── .env.development          # Local development
├── .env.production.example   # Production template
└── docs/
    └── environment-variables.md  # Documentation
```

**Frontend Environment**:
```
Frontend/
├── .env.example              # Template
├── .env.development          # Local dev
├── .env.production           # Production (already exists)
└── docs/
    └── environment-setup.md
```

**Variables to document**:
- `NODE_ENV`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TABLE_PREFIX`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_API_BASE_URL`
- `DIGIFLAZZ_USERNAME`
- `DIGIFLAZZ_API_KEY`
- `DIGIFLAZZ_API_BASE_URL`
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_NAME`
- `SMTP_FROM_EMAIL`

### T2: Reorganize Code Structure

**Root Level**:
```
D:\coding\1.PPOB PAYMENT\
├── backend/                  # Express backend
├── Frontend/                 # Vite frontend
├── next-frontend/            # Next.js frontend (archive?)
├── supabase/                 # Database migrations
├── mcp/                      # MCP servers
├── scripts/                  # Deployment scripts
├── docs/                     # All documentation
├── .sisyphus/                # Plans and evidence
├── digiflazz-product-reference/  # Product data
├── README.md                 # Main readme
├── ARCHITECTURE.md           # System architecture
├── DEPLOYMENT.md             # Deployment guide
└── CONTRIBUTING.md           # Development guide
```

**Backend Structure**:
```
backend/
├── src/
│   ├── modules/              # Feature modules
│   │   ├── account/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── catalog/
│   │   ├── commission/
│   │   ├── dashboard/
│   │   ├── digiflazz/
│   │   ├── email/
│   │   ├── fulfillment/
│   │   ├── invoice-status/
│   │   ├── order/
│   │   ├── payment/
│   │   ├── payout/
│   │   ├── postpaid/
│   │   ├── reconcile/
│   │   ├── regression/
│   │   └── tax/
│   ├── security/             # Security utilities
│   ├── app.ts                # Express app
│   └── server.ts             # Server entry
├── test-fixtures/            # Test data
├── playwright-tests/         # E2E tests
├── dist/                     # Build output
├── docs/                     # Backend docs
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

**Frontend Structure**:
```
Frontend/
├── src/
│   ├── components/           # React components
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminEmailManagement.tsx
│   │   ├── AdminProductUpload.tsx
│   │   ├── AuthDashboard.tsx
│   │   ├── Footer.tsx
│   │   ├── GameTopUp.tsx
│   │   ├── Header.tsx
│   │   ├── HotDeals.tsx
│   │   └── ProductCatalog.tsx
│   ├── lib/                  # Utilities
│   │   └── api.ts
│   ├── App.tsx
│   └── main.tsx
├── dist/                     # Build output
├── public/                   # Static assets
├── docs/                     # Frontend docs
├── .env.example
├── .env.production
├── package.json
├── vite.config.ts
└── README.md
```

**Documentation Structure**:
```
docs/
├── api/                      # API documentation
│   ├── admin.md
│   ├── auth.md
│   ├── catalog.md
│   ├── order.md
│   ├── payment.md
│   └── payout.md
├── deployment/               # Deployment guides
│   ├── backend-deployment.md
│   ├── frontend-deployment.md
│   ├── database-migrations.md
│   └── nextjs-static-deployment.md
├── digiflazz-buyer/          # Digiflazz docs
├── payment-integrity/        # Payment/security docs
├── architecture.md           # System architecture
├── development.md            # Development guide
├── testing.md                # Testing guide
└── troubleshooting.md        # Common issues
```

**Evidence Structure**:
```
.sisyphus/
├── plans/                    # Active plans
│   ├── admin-email-and-comprehensive-testing.md
│   └── completed-plans-archive.md
├── evidence/                 # Test results
│   ├── bugs/                 # Bug reports
│   ├── screenshots/          # Test screenshots
│   ├── session-summaries/    # Daily summaries
│   └── test-reports/         # Test results
└── archive/                  # Old plans
```

### T3: Create Central Documentation

**README.md** (root):
- Project overview
- Tech stack
- Quick start
- Directory structure
- Links to detailed docs

**ARCHITECTURE.md**:
- System architecture diagram
- Database schema
- API flow
- Security model
- Integration points

**DEPLOYMENT.md**:
- Prerequisites
- Environment setup
- Database migrations
- Backend deployment
- Frontend deployment
- Verification steps
- Rollback procedure

**CONTRIBUTING.md**:
- Development setup
- Code standards
- Git workflow
- Testing requirements
- PR process

### T4: Clean Up Test Files

Move test files to proper locations:
```
backend/test-fixtures/        # Test data
backend/playwright-tests/     # E2E tests
backend/src/**/*.test.ts      # Unit tests (keep with source)
```

### T5: Archive Unused Code

Move to archive:
```
archive/
├── next-frontend/            # If not used
├── old-migrations/           # If superseded
└── deprecated-scripts/       # Old scripts
```

### T6: Create Environment Templates

**backend/.env.example**:
```bash
# Server
NODE_ENV=development
PORT=3001

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_TABLE_PREFIX=demo_

# Payment Gateway
MIDTRANS_SERVER_KEY=your-midtrans-server-key
MIDTRANS_API_BASE_URL=https://app.sandbox.midtrans.com

# Product Provider
DIGIFLAZZ_USERNAME=your-username
DIGIFLAZZ_API_KEY=your-api-key
DIGIFLAZZ_API_BASE_URL=https://api.digiflazz.com/v1

# Authentication
JWT_SECRET=your-jwt-secret-min-32-chars

# Email (Production)
SMTP_HOST=mail.adnanpay.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=mail@adnanpay.com
SMTP_PASS=your-smtp-password
SMTP_FROM_NAME=Adnanpay
SMTP_FROM_EMAIL=mail@adnanpay.com
```

**Frontend/.env.example**:
```bash
# API Base URL
VITE_API_BASE_URL=/ppob-api
```

### T7: Create Code Summary Document

**docs/code-summary.md**:
- Total files count
- Lines of code
- Modules breakdown
- Dependencies list
- Recent changes
- Known issues
- Future improvements

### T8: Git Commit Strategy

**Commit 1: Environment cleanup**
```
feat: reorganize environment files and add templates

- Add .env.example for backend and frontend
- Create environment-variables.md documentation
- Move .env files to proper locations
- Add security notes for sensitive variables
```

**Commit 2: Code structure cleanup**
```
refactor: reorganize code structure and documentation

- Reorganize backend modules
- Reorganize frontend components
- Move test files to proper locations
- Archive unused code
- Create central documentation
```

**Commit 3: Documentation**
```
docs: add comprehensive project documentation

- Add README.md with project overview
- Add ARCHITECTURE.md with system design
- Add DEPLOYMENT.md with deployment guide
- Add CONTRIBUTING.md with development guide
- Add code-summary.md with codebase stats
```

## Deliverables

1. Clean environment file structure
2. Organized code directories
3. Comprehensive documentation
4. Environment templates
5. Code summary document
6. 3 git commits with clear messages
7. Updated .gitignore

## Acceptance Criteria

- [ ] All .env files have .example templates
- [ ] All environment variables documented
- [ ] Code structure follows best practices
- [ ] All documentation complete
- [ ] Test files properly organized
- [ ] Unused code archived
- [ ] Git commits clean and descriptive
- [ ] .gitignore updated

## Timeline

- T1-T2: 2 hours (environment + structure)
- T3-T4: 2 hours (documentation + cleanup)
- T5-T8: 1 hour (archive + commits)
- **Total**: 5 hours

## Status

- [ ] T1: Reorganize environment files
- [ ] T2: Reorganize code structure
- [ ] T3: Create central documentation
- [ ] T4: Clean up test files
- [ ] T5: Archive unused code
- [ ] T6: Create environment templates
- [ ] T7: Create code summary
- [ ] T8: Git commits

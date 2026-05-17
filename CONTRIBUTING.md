# Contributing to Adnanpay PPOB Platform

## Development Setup

### Prerequisites
- Node.js 20+
- Git
- Code editor (VS Code recommended)
- PostgreSQL client (optional)

### Clone Repository

```bash
git clone [repository-url]
cd "1.PPOB PAYMENT"
```

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env.development
# Edit .env.development with your credentials
npm run dev
```

Backend runs at `http://localhost:3001`

### Frontend Setup

```bash
cd Frontend
npm install
cp .env.example .env.development
# Edit .env.development
npm run dev
```

Frontend runs at `http://localhost:5173`

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- No `any` types (use `unknown` if needed)
- Prefer `interface` over `type` for object shapes
- Use `readonly` for immutable data

### Naming Conventions

- **Files**: kebab-case (`user-service.ts`)
- **Classes**: PascalCase (`UserService`)
- **Functions**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Interfaces**: PascalCase (`UserRecord`)
- **Types**: PascalCase (`UserId`)

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use double quotes for strings
- Max line length: 100 characters
- Use trailing commas in multiline objects/arrays

### Comments

- Add comments for complex logic
- Use JSDoc for public functions
- Avoid obvious comments
- Keep comments up to date

Example:
```typescript
/**
 * Calculates commission based on transaction amount and user tier.
 * @param amountMinor - Transaction amount in minor units
 * @param userTier - User tier (bronze, silver, gold)
 * @returns Commission amount in minor units
 */
function calculateCommission(amountMinor: number, userTier: string): number {
  // Implementation
}
```

## Git Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates

Examples:
- `feature/admin-email-management`
- `fix/localhost-api-base-url`
- `refactor/payment-service`

### Commit Messages

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation
- `test` - Tests
- `chore` - Maintenance

**Examples**:
```
feat(admin): add email management panel

- Add email logs table
- Add manual send email API
- Add bulk send email API
- Add email templates CRUD

Closes #123
```

```
fix(frontend): resolve localhost:3001 API base URL

- Create .env.production with VITE_API_BASE_URL=/ppob-api
- Rebuild frontend with NODE_ENV=production
- Deploy to production

Fixes #456
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with clear commits
3. Test locally
4. Push to remote
5. Create pull request
6. Wait for review
7. Address feedback
8. Merge after approval

## Testing

### Backend Tests

```bash
cd backend
npm run test:feature          # All tests
npm run test:feature:guest    # Guest flow
npm run test:feature:reseller # Reseller flow
npm run test:feature:admin    # Admin flow
```

### Frontend Tests

```bash
cd Frontend
npm run test  # (if configured)
```

### Manual Testing

1. Test guest checkout flow
2. Test reseller registration
3. Test admin panel
4. Test payment integration
5. Test email notifications

## Module Structure

### Backend Module Template

```
backend/src/modules/[module-name]/
├── [module].types.ts      # TypeScript types
├── [module].service.ts    # Business logic
├── [module].repository.ts # Data access
├── [module].router.ts     # API routes
└── [module].test.ts       # Tests (optional)
```

### Frontend Component Template

```
Frontend/src/components/
├── [Component].tsx        # React component
└── [Component].test.tsx   # Tests (optional)
```

## Adding New Features

### Backend Feature

1. Create module directory
2. Define types in `[module].types.ts`
3. Implement service in `[module].service.ts`
4. Implement repository in `[module].repository.ts`
5. Create router in `[module].router.ts`
6. Register router in `app.ts`
7. Add tests
8. Update documentation

### Frontend Feature

1. Create component in `src/components/`
2. Add to appropriate page
3. Update routing if needed
4. Add tests
5. Update documentation

### Database Changes

1. Create migration file in `supabase/migrations/`
2. Name: `YYYYMMDDHHMMSS_description.sql`
3. Include up and down migrations
4. Test locally
5. Document in `ARCHITECTURE.md`

## Code Review Guidelines

### As Author

- Keep PRs small and focused
- Write clear commit messages
- Add tests for new features
- Update documentation
- Self-review before requesting review

### As Reviewer

- Be constructive and respectful
- Focus on code quality and maintainability
- Check for security issues
- Verify tests pass
- Approve only when satisfied

## Security Guidelines

### Sensitive Data

- Never commit `.env` files
- Never commit API keys or secrets
- Use environment variables
- Encrypt sensitive data at rest
- Use HTTPS for all external requests

### Authentication

- Always verify JWT tokens
- Use bcrypt for password hashing
- Implement rate limiting
- Log authentication attempts
- Use secure session management

### Input Validation

- Validate all user input
- Sanitize data before database queries
- Use parameterized queries
- Prevent SQL injection
- Prevent XSS attacks

### API Security

- Verify Midtrans signatures
- Verify Digiflazz HMAC
- Use HTTPS only
- Implement CORS properly
- Rate limit API endpoints

## Performance Guidelines

### Database

- Use indexes on frequently queried columns
- Avoid N+1 queries
- Use connection pooling
- Optimize complex queries
- Monitor query performance

### API

- Keep response times under 200ms
- Use pagination for large datasets
- Cache frequently accessed data
- Minimize database queries
- Use async/await properly

### Frontend

- Lazy load components
- Optimize images
- Minimize bundle size
- Use code splitting
- Avoid unnecessary re-renders

## Documentation

### Code Documentation

- Document all public APIs
- Use JSDoc for functions
- Add inline comments for complex logic
- Keep README up to date

### API Documentation

- Document all endpoints
- Include request/response examples
- Document error codes
- Keep OpenAPI spec updated (if exists)

### Architecture Documentation

- Update `ARCHITECTURE.md` for major changes
- Document design decisions
- Include diagrams for complex flows
- Keep deployment guide updated

## Common Tasks

### Add New Product Category

1. Update `products` table schema if needed
2. Add category to `catalog.service.ts`
3. Update frontend product catalog
4. Add category images
5. Test end-to-end

### Add New Payment Method

1. Create payment provider module
2. Implement webhook handler
3. Add signature verification
4. Update payment service
5. Add tests
6. Document integration

### Add New Email Template

1. Create template in `email.service.ts`
2. Add template variables
3. Test email rendering
4. Update documentation

## Troubleshooting

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Type Errors

```bash
# Regenerate types
npm run build
```

### Database Connection Issues

- Check Supabase credentials
- Verify network connectivity
- Check RLS policies

### Frontend Not Loading

- Check API base URL
- Clear browser cache
- Check console for errors

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Getting Help

- Check existing documentation
- Search closed issues
- Ask in team chat
- Email: mail@adnanpay.com

## License

Proprietary - All rights reserved

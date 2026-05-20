# URL Security & Access Control Enhancement Plan

## TL;DR

Implementasi multi-layer security untuk mencegah URL bypass dan unauthorized access.

## Current Security Issues

### 1. URL Bypass Vulnerabilities
- ❌ User bisa akses `/demo/admin` langsung tanpa login
- ❌ User bisa akses `/demo/dashboard` tanpa authentication
- ❌ Backend API endpoint bisa diakses langsung tanpa token
- ❌ Tidak ada route guard di frontend
- ❌ Tidak ada middleware check di backend

### 2. Missing Security Layers
- ❌ No frontend route protection
- ❌ No backend middleware validation
- ❌ No role-based access control (RBAC) enforcement
- ❌ No session validation
- ❌ No CSRF protection

## Security Solutions

### Layer 1: Frontend Route Guards (React Router)

**Implementation**: Protected Routes Component

```typescript
// Frontend/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'seller' | 'pengguna';
  redirectTo?: string;
};

export function ProtectedRoute({ 
  children, 
  requiredRole,
  redirectTo = '/demo/dashboard' 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role if required
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/demo/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

**Usage**:
```typescript
// Frontend/src/App.tsx
<Routes>
  <Route path="/demo/" element={<HomePage />} />
  
  <Route path="/demo/dashboard" element={
    <ProtectedRoute>
      <AuthDashboard />
    </ProtectedRoute>
  } />
  
  <Route path="/demo/admin" element={
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  } />
</Routes>
```

### Layer 2: Backend Middleware (Express)

**Implementation**: Auth & RBAC Middleware

```typescript
// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
}
```

**Usage**:
```typescript
// backend/src/modules/admin/admin.router.ts
router.get('/api/admin/users', 
  requireAuth, 
  requireRole('admin'), 
  adminController.getUsers
);

router.post('/api/admin/products/upload',
  requireAuth,
  requireRole('admin'),
  adminController.uploadProducts
);
```

### Layer 3: Session Validation

**Implementation**: Session Store with Redis (Optional)

```typescript
// backend/src/middleware/session.middleware.ts
import { Request, Response, NextFunction } from 'express';

export async function validateSession(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({
      error: {
        code: 'NO_SESSION',
        message: 'Session required'
      }
    });
  }

  // Check if session exists and is valid
  const session = await getSession(sessionId);
  
  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Session expired, please login again'
      }
    });
  }

  req.session = session;
  next();
}
```

### Layer 4: CSRF Protection

**Implementation**: CSRF Token

```typescript
// backend/src/middleware/csrf.middleware.ts
import crypto from 'crypto';

export function generateCsrfToken(req: Request): string {
  const token = crypto.randomBytes(32).toString('hex');
  req.session.csrfToken = token;
  return token;
}

export function validateCsrfToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: {
        code: 'INVALID_CSRF_TOKEN',
        message: 'Invalid CSRF token'
      }
    });
  }

  next();
}
```

### Layer 5: Rate Limiting

**Implementation**: Express Rate Limit

```typescript
// backend/src/middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit each IP to 5 login attempts per 15 minutes
  message: {
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Too many login attempts, please try again later'
    }
  }
});
```

### Layer 6: URL Encryption (Optional - Advanced)

**Implementation**: Encrypted URL Parameters

```typescript
// backend/src/utils/url-encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.URL_ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encryptUrlParam(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptUrlParam(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Usage**:
```typescript
// Generate encrypted invoice URL
const invoiceCode = 'INV-12345';
const encrypted = encryptUrlParam(invoiceCode);
const url = `https://adnanpay.com/demo/invoice?code=${encodeURIComponent(encrypted)}`;

// Decrypt on server
const encryptedCode = req.query.code;
const invoiceCode = decryptUrlParam(decodeURIComponent(encryptedCode));
```

## Recommended Implementation Priority

### Phase 1: Critical (Implement Now)
1. ✅ Backend middleware: `requireAuth` + `requireRole`
2. ✅ Frontend route guards: `ProtectedRoute` component
3. ✅ Rate limiting on auth endpoints

### Phase 2: Important (Next Week)
4. ⚠️ Session validation
5. ⚠️ CSRF protection
6. ⚠️ Rate limiting on all API endpoints

### Phase 3: Advanced (Optional)
7. 🔒 URL encryption for sensitive parameters
8. 🔒 Redis session store
9. 🔒 IP whitelisting for admin

## Implementation Tasks

### T1: Backend Auth Middleware (2 hours)
- Create `auth.middleware.ts`
- Add `requireAuth` function
- Add `requireRole` function
- Apply to all protected routes
- Test with Postman

### T2: Frontend Route Guards (2 hours)
- Install `react-router-dom` if not installed
- Create `ProtectedRoute.tsx` component
- Create `useAuth` hook
- Wrap protected routes
- Test navigation

### T3: Rate Limiting (1 hour)
- Install `express-rate-limit`
- Create rate limit configs
- Apply to auth routes
- Apply to API routes
- Test with multiple requests

### T4: Session Validation (3 hours)
- Create session middleware
- Add session storage (in-memory or Redis)
- Add session expiry logic
- Test session timeout

### T5: CSRF Protection (2 hours)
- Generate CSRF tokens
- Add CSRF middleware
- Send token to frontend
- Validate on POST/PUT/DELETE
- Test CSRF attacks

### T6: URL Encryption (Optional, 3 hours)
- Create encryption utilities
- Encrypt sensitive URL params
- Decrypt on backend
- Test encryption/decryption

## Security Best Practices

### DO ✅
- Always validate JWT on backend
- Check user role on every protected endpoint
- Use HTTPS in production
- Store JWT in httpOnly cookies (not localStorage)
- Implement rate limiting
- Log all authentication attempts
- Use strong JWT secrets (min 32 chars)
- Set JWT expiry (e.g., 1 hour)
- Implement refresh tokens
- Validate all user inputs

### DON'T ❌
- Don't trust frontend validation only
- Don't store sensitive data in JWT
- Don't use weak JWT secrets
- Don't skip backend validation
- Don't expose error details to users
- Don't allow unlimited login attempts
- Don't use GET for sensitive operations
- Don't trust URL parameters without validation

## Testing Checklist

### Frontend Tests
- [ ] Try accessing `/demo/admin` without login → Should redirect
- [ ] Try accessing `/demo/dashboard` without login → Should redirect
- [ ] Login as reseller, try accessing `/demo/admin` → Should show unauthorized
- [ ] Login as admin, access `/demo/admin` → Should work

### Backend Tests
- [ ] Call admin API without token → Should return 401
- [ ] Call admin API with invalid token → Should return 401
- [ ] Call admin API with reseller token → Should return 403
- [ ] Call admin API with admin token → Should work
- [ ] Try 10 login attempts in 1 minute → Should rate limit

### Security Tests
- [ ] Try SQL injection in login → Should be sanitized
- [ ] Try XSS in form inputs → Should be escaped
- [ ] Try CSRF attack → Should be blocked
- [ ] Try session hijacking → Should fail
- [ ] Try brute force login → Should rate limit

## Estimated Timeline

- **Phase 1 (Critical)**: 5 hours
- **Phase 2 (Important)**: 7 hours
- **Phase 3 (Advanced)**: 6 hours
- **Total**: 18 hours

## Deliverables

1. Auth middleware (backend)
2. Route guards (frontend)
3. Rate limiting
4. Session validation
5. CSRF protection
6. URL encryption (optional)
7. Security documentation
8. Test results

## Status

- [ ] T1: Backend auth middleware
- [ ] T2: Frontend route guards
- [ ] T3: Rate limiting
- [ ] T4: Session validation
- [ ] T5: CSRF protection
- [ ] T6: URL encryption (optional)

---

**Priority**: HIGH  
**Estimated Effort**: 12-18 hours  
**Security Impact**: CRITICAL

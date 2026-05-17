# URL Security + Navigation Enhancement Plan

## User Requirements

1. "jika url diamankan berikan menu kembali pada semua piliha menu agar user bsa kembali ke menu sebelumnya"
2. "kerjakan plan, selalu kerjakan tugas sub agent dikerjakan sendiri di main agent"

## Combined Implementation

### Part 1: URL Security (from previous plan)
- Backend auth middleware
- Frontend route guards
- Rate limiting

### Part 2: Navigation Enhancement (NEW)
- Add back button to all pages
- Add breadcrumb navigation
- Add menu navigation on protected pages

## Tasks

### T1: Backend Auth Middleware (1 hour)
- Create auth middleware with JWT validation
- Create role-based access control
- Apply to all protected routes

### T2: Frontend Route Guards (1 hour)
- Create ProtectedRoute component
- Wrap admin and dashboard routes
- Add unauthorized page

### T3: Rate Limiting (30 min)
- Install express-rate-limit
- Apply to auth endpoints
- Apply to API endpoints

### T4: Navigation Components (1 hour)
- Create BackButton component
- Create Breadcrumb component
- Create NavigationMenu component
- Add to all protected pages

### T5: Integration & Testing (30 min)
- Test auth flow
- Test navigation
- Test rate limiting
- Deploy to server

## Total Time: 4 hours

## Status
- [ ] T1: Backend auth middleware
- [ ] T2: Frontend route guards
- [ ] T3: Rate limiting
- [ ] T4: Navigation components
- [ ] T5: Integration & testing

# Role System Migration Guide

## Overview

The role system has been refactored with:
- **Role codes** (TECHNICIAN, FRONT_DESK, LOGISTICS, FINANCE, MANAGER, ADMIN)
- **Technician levels** (JUNIOR, SENIOR, EXPERT, MASTER)
- **Role-specific dashboards**
- **ADMIN** can access all dashboards for testing

## Migration Steps

### 1. Database Sync & Seed

```bash
cd backend
npm run db:sync
npm run db:seed-roles
```

This adds:
- `roles.code` column
- `users.technician_level` and `users.technician_level_display`
- `users.commission_rate` now nullable (0 for non-technicians)

### 2. Update Existing Users

If you have existing users with the old "admin" role:

1. Get the new ADMIN role ID: `role_admin` (from seed)
2. Update your admin user: `UPDATE users SET role_id = 'role_admin' WHERE email = 'your@admin.email';`
3. Or use the Users page in the app to edit the user and assign the "HQ Access (ADMIN)" role

### 3. Technician Users

For users with TECHNICIAN role:
- Set `commission_rate` (e.g. 0.2 for 20%)
- Set `technician_level` (JUNIOR, SENIOR, EXPERT, MASTER)
- `technician_level_display` is set automatically (e.g. SENIOR → "Repair Sergeant")

### 4. API Endpoints

| Endpoint | Roles |
|----------|-------|
| GET /api/dashboard/technician | TECHNICIAN, ADMIN |
| GET /api/dashboard/front-desk | FRONT_DESK, ADMIN |
| GET /api/dashboard/logistics | LOGISTICS, ADMIN |
| GET /api/dashboard/finance | FINANCE, ADMIN |
| GET /api/dashboard/manager | MANAGER, ADMIN |
| GET /api/dashboard/admin | ADMIN only |
| POST /api/inventory/assign-to-repair | LOGISTICS, ADMIN |

### 5. Frontend Routes

- `/` → Redirects to role-specific dashboard
- `/dashboard/technician` → Technician dashboard
- `/dashboard/front-desk` → Front desk dashboard
- `/dashboard/logistics` → Logistics dashboard
- `/dashboard/finance` → Finance dashboard
- `/dashboard/manager` → Manager dashboard
- `/dashboard/admin` → Admin dashboard

**ADMIN** users see navigation to all dashboards in the sidebar.

## Commission Rate Logic

- **Technician only**: `commission_rate` applies when the repair is assigned to that technician and the bill is locked
- **Payment lock**: Staff share is calculated using the **assigned technician's** commission rate, not the person receiving payment
- Non-technician users have `commission_rate = 0` and it is not shown in the UI

## Restore Accidental Admin Demotion

If an admin was accidentally changed to another role:

```bash
cd backend
node src/scripts/fix-admin.js your@email.com
```

Or: `npm run fix-admin -- your@email.com`

## Admin Safeguards

- **Admins cannot demote themselves** – an admin cannot change their own role to non-admin
- **Last admin cannot be demoted** – the system always keeps at least one admin
- **Last admin cannot be deleted** – delete is disabled for the sole admin in the UI; API also blocks it

## Testing Checklist

- [ ] TECHNICIAN can view only assigned repairs
- [ ] TECHNICIAN sees earnings and level badge
- [ ] FRONT_DESK can create repairs and collect payments
- [ ] LOGISTICS can manage inventory and assign to repairs
- [ ] FINANCE can view all billing
- [ ] MANAGER can view operations overview
- [ ] ADMIN can navigate to ALL dashboards from sidebar
- [ ] Non-technician users don't see commission_rate in UI
- [ ] ADMIN dashboard has quick-access cards to all role views

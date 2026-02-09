# Prisma to Sequelize v6 Migration Guide

## Overview

The Lab448 Repair Shop Automation system has been **completely migrated from Prisma ORM to Sequelize v6**. This document explains the changes and how to work with the new setup.

## Why Sequelize v6?

- More flexible query API
- Better transaction handling
- Mature ecosystem with extensive documentation
- No version conflicts with local/global CLI tools
- Direct control over migrations and schema changes

## What Changed

### Package Dependencies

**Removed:**
- `@prisma/client`
- `prisma` (CLI)

**Added:**
- `sequelize` v6.35.2
- `pg` and `pg-hstore` (PostgreSQL drivers)
- `@paralleldrive/cuid2` (for unique IDs, replacing Prisma's cuid)
- `sequelize-cli` (dev dependency)

### File Structure

**Removed:**
- `backend/prisma/` directory (entire folder)
- `backend/src/prisma.js`

**Added:**
- `backend/src/models/` directory with all model definitions:
  - `index.js` (initializes Sequelize and all models)
  - `Role.js`, `User.js`, `Customer.js`, `DeviceCategory.js`
  - `Device.js`, `Repair.js`, `Inventory.js`
  - `InventoryUsage.js`, `RepairCharge.js`, `Payment.js`, `AuditLog.js`
- `backend/src/db.js` (exports sequelize instance and models)
- `backend/src/scripts/db-sync.js` (database schema sync script)
- `backend/.sequelizerc` (Sequelize CLI configuration)

### Code Changes

#### Import Changes

**Before (Prisma):**
```javascript
import { prisma } from "../prisma.js";

const user = await prisma.user.findUnique({
  where: { email },
  include: { role: true },
});
```

**After (Sequelize):**
```javascript
import db from "../db.js";

const user = await db.User.findOne({
  where: { email },
  include: [{ model: db.Role, as: "role" }],
});
```

#### Transaction Changes

**Before (Prisma):**
```javascript
const result = await prisma.$transaction(async (tx) => {
  const customer = await tx.customer.create({ data: {...} });
  const device = await tx.device.create({ data: {...} });
  return { customer, device };
});
```

**After (Sequelize):**
```javascript
import { sequelize } from "../db.js";

const result = await sequelize.transaction(async (t) => {
  const customer = await db.Customer.create({...}, { transaction: t });
  const device = await db.Device.create({...}, { transaction: t });
  return { customer, device };
});
```

#### Query Changes

| Operation | Prisma | Sequelize |
|-----------|--------|-----------|
| Find by PK | `prisma.user.findUnique({ where: { id } })` | `db.User.findByPk(id)` |
| Find one | `prisma.user.findUnique({ where: { email } })` | `db.User.findOne({ where: { email } })` |
| Find many | `prisma.user.findMany({ where: {...} })` | `db.User.findAll({ where: {...} })` |
| Create | `prisma.user.create({ data: {...} })` | `db.User.create({...})` |
| Update | `prisma.user.update({ where: {id}, data: {...} })` | `user.update({...})` or `db.User.update({...}, { where: {id} })` |
| Delete | `prisma.user.delete({ where: {id} })` | `user.destroy()` or `db.User.destroy({ where: {id} })` |
| Count | `prisma.user.count()` | `db.User.count()` |
| Aggregate | `prisma.repair.aggregate({ _sum: { totalCharges: true } })` | `db.Repair.sum('totalCharges')` |

#### Include (Join) Changes

**Before (Prisma):**
```javascript
const repair = await prisma.repair.findUnique({
  where: { id },
  include: {
    customer: true,
    device: true,
    charges: true,
  },
});
```

**After (Sequelize):**
```javascript
const repair = await db.Repair.findByPk(id, {
  include: [
    { model: db.Customer, as: "customer" },
    { model: db.Device, as: "device" },
    { model: db.RepairCharge, as: "charges" },
  ],
});
```

#### Where Clause Changes

**Before (Prisma):**
```javascript
where: {
  status: { in: ["INTAKE", "TO_REPAIR"] }
}
```

**After (Sequelize):**
```javascript
import { Op } from "sequelize";

where: {
  status: { [Op.in]: ["INTAKE", "TO_REPAIR"] }
}
```

## Database Setup

### Fresh Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure database:**
   Create `backend/.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/lab448_repair"
   JWT_SECRET="your-strong-secret-here"
   PORT=4000
   ```

3. **Create database:**
   ```bash
   psql -U postgres
   CREATE DATABASE lab448_repair;
   \q
   ```

4. **Sync schema:**
   ```bash
   npm run db:sync
   ```

   This runs `sequelize.sync({ alter: true })` which:
   - Creates all tables if they don't exist
   - Alters existing tables to match the models
   - Preserves existing data

5. **Start server:**
   ```bash
   npm run dev
   ```

6. **Create admin user:**
   ```powershell
   Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/bootstrap-admin" -ContentType "application/json" -Body '{"email":"admin@lab448.com","password":"admin123","name":"Admin"}'
   ```

### Existing Prisma Installation

If you have an existing database with Prisma migrations:

**Option 1: Keep existing data (recommended)**

The Sequelize models are designed to match the Prisma schema exactly. Run:

```bash
npm run db:sync
```

Sequelize will detect existing tables and adapt to them.

**Option 2: Fresh start**

1. Drop the database:
   ```sql
   DROP DATABASE lab448_repair;
   CREATE DATABASE lab448_repair;
   ```

2. Run the sync script:
   ```bash
   npm run db:sync
   ```

## Model Definitions

All models are in `backend/src/models/`:

- **index.js**: Initializes Sequelize and all models, defines associations
- Each model file exports a function that defines the model
- Associations are defined in the `associate` method of each model

## Transaction Pattern

All complex operations use Sequelize transactions:

```javascript
import { sequelize } from "../db.js";

const result = await sequelize.transaction(async (t) => {
  // All operations here are atomic
  const item = await db.Inventory.create({...}, { transaction: t });
  await db.Repair.update({...}, { where: {...}, transaction: t });
  
  // If any operation fails, entire transaction rolls back
  return item;
});
```

## Audit Logging

Updated to support Sequelize transactions:

```javascript
await logAudit({
  userId: req.user.id,
  entityType: "Repair",
  entityId: repair.id,
  action: "STATUS_CHANGED",
  metadata: { ... },
}, transaction); // Pass transaction as second param
```

## Key Differences

### 1. Model Naming
- **Prisma**: lowercase (e.g., `prisma.user`)
- **Sequelize**: PascalCase (e.g., `db.User`)

### 2. Method Names
- **Prisma**: `findUnique`, `findMany`, `create({ data: {...} })`
- **Sequelize**: `findByPk`, `findOne`, `findAll`, `create({...})`

### 3. Relationships
- **Prisma**: `include: { role: true }`
- **Sequelize**: `include: [{ model: db.Role, as: "role" }]`

### 4. Enums
- **Prisma**: Defined in schema with `enum` keyword
- **Sequelize**: `DataTypes.ENUM('VALUE1', 'VALUE2', ...)`

### 5. Timestamps
- Both Prisma and Sequelize auto-manage `createdAt` and `updatedAt`
- Sequelize uses snake_case column names (`created_at`, `updated_at`) with `underscored: true`

## Testing the Migration

After migration, test these key workflows:

1. **Auth**: Login with admin credentials
2. **Intake**: Create a new repair
3. **Queue**: View TO_REPAIR queue
4. **Inventory**: Add inventory, use it on a repair
5. **Billing**: Add charges, record payments
6. **Users**: Create/edit/delete users (admin only)

All features should work identically to the Prisma version.

## Troubleshooting

### "Cannot find module '@prisma/client'"

Run `npm install` in the backend directory to get the new dependencies.

### "Table already exists"

If you have Prisma tables already, `npm run db:sync` will adapt to them. If you want fresh tables, drop and recreate the database.

### "Relation does not exist"

Ensure you ran `npm run db:sync` to create all tables and relationships.

### "JSONB type not found"

Make sure you're using PostgreSQL (not MySQL or SQLite). The schema uses JSONB for permissions and metadata.

## Performance Notes

Sequelize v6 offers:
- Eager loading optimization
- Connection pooling (configured in models/index.js)
- Query logging (disabled by default, enable with `logging: console.log`)

## Migration Complete ✓

The entire application now uses Sequelize v6. All 11 models, relationships, and business logic have been converted and tested.

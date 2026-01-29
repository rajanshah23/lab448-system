## Lab448 Repair Shop Automation

End-to-end repair shop automation PWA built with **React**, **Node.js/Express**, **PostgreSQL**, **Prisma**, and **JWT auth**.

### Backend (Express + Prisma)

- **Location**: `backend`
- **Key tech**: Node.js (ES modules), Express, Prisma ORM, PostgreSQL, JWT, bcrypt
- **Core domain rules**:
  - One repair = one QR token
  - Repair status lifecycle enforced:
    - INTAKE → TO_REPAIR → IN_REPAIR → (REPAIRED | UNREPAIRABLE) → DELIVERED
  - Inventory stock cannot go negative (guarded in a transaction)
  - Using inventory auto-adds a charge on the repair
  - All billing data lives on the `repairs` and `repair_charges`/`payments` tables
  - Bill locks after full payment, and staff/shop split is calculated at lock time

#### Database schema (Prisma)

Defined in `backend/prisma/schema.prisma`:

- `users` (with `commissionRate` for staff share) and `roles` (permissions as JSON)
- `customers`, `device_categories`, `devices`
- `repairs` (core table with QR token, lifecycle timestamps, totals and splits)
- `inventory`, `inventory_usage`
- `repair_charges`, `payments`
- `audit_logs`

#### Backend setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create `.env` in `backend`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/lab448_repair?schema=public"
JWT_SECRET="change-this-secret"
PORT=4000
```

3. Run Prisma migrations and generate client:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

4. Start the API:

```bash
npm run dev
```

The API will be available at `http://localhost:4000`.

#### Initial admin user

Once the server is running, create an admin:

```bash
curl -X POST http://localhost:4000/api/auth/bootstrap-admin ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"admin123\",\"name\":\"Admin\"}"
```

This admin role has all permissions and can be used to log in from the PWA.

### Frontend (React PWA)

- **Location**: `frontend`
- **Key tech**: React 18, React Router, Axios, Vite, `react-qr-reader`
- **Screens**:
  - **Login**: JWT-based login against `/api/auth/login`
  - **Dashboard**: High-level stats (total/open repairs, total and today revenue)
  - **Intake**: Create customer + device + repair with optional flat charge; QR token displayed
  - **To-Repair queue**: Shows `TO_REPAIR` repairs, allows moving to `IN_REPAIR`
  - **QR scan**: Camera-based QR scanner + manual token entry to open a repair
  - **Repair workspace**:
    - See customer/device details and current status
    - Transition status (`IN_REPAIR` → `REPAIRED`/`UNREPAIRABLE` → `DELIVERED`)
    - View and add inventory usage (auto-adds charges)
  - **Inventory**: Manage inventory items (name, SKU, quantity, unit price, active flag)
  - **Billing & payment**:
    - View charges and payments for a repair
    - Add manual charges
    - Record payments; when fully paid, bill locks and staff/shop split is stored

Role-based access control is enforced both **server-side (middleware)** and **client-side (UI hides unauthorized navigation/actions)**.

#### Frontend setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Run the PWA in development:

```bash
npm run dev
```

The app will be served at `http://localhost:5173` and proxies `/api` to the backend at `http://localhost:4000`.

3. Build for production:

```bash
npm run build
```

### PWA behaviour

- `frontend/public/manifest.webmanifest` defines app name, icons, and theme.
- `frontend/public/sw.js` is a simple service worker that:
  - Caches the shell (`/`, `/index.html`, manifest) for offline load
  - Leaves `/api` network traffic uncached to keep data fresh
- `main.jsx` registers the service worker on load.

### Workflows overview

- **Intake**:
  - Intake form → `POST /api/repairs/intake`
  - Creates customer, device, repair, QR token, and optional flat charge
  - Audit log records `INTAKE_CREATED`

- **Repair tracking**:
  - Queue (`GET /api/repairs/queue?status=TO_REPAIR`) shows items waiting for repair
  - Status transitions via `POST /api/repairs/:id/transition` respect:
    - INTAKE → TO_REPAIR → IN_REPAIR → (REPAIRED | UNREPAIRABLE) → DELIVERED
  - All transitions are logged to `audit_logs`

- **Inventory & billing**:
  - Inventory managed via `/api/inventory` (list/create/update)
  - Using inventory:
    - `POST /api/repairs/:id/use-inventory`
    - Transaction: decrements stock, creates `inventory_usage`, creates corresponding `repair_charge`
    - Stock cannot go negative; errors are returned if insufficient
  - Manual charges:
    - `POST /api/repairs/:id/add-charge`
    - Recalculates `repair.totalCharges`

- **Payments & revenue split**:
  - `POST /api/repairs/:id/pay`:
    - Prevents overpayment
    - When fully paid:
      - Locks the bill (`isLocked = true`)
      - Calculates `staffShareAmount` using the current user's `commissionRate`
      - Sets `shopShareAmount = totalCharges - staffShareAmount`
  - Billing summary available at `GET /api/repairs/:id/billing`.

### Notes

- All important actions (intake, status transitions, inventory usage, charges, payments) are written to `audit_logs`.
- JWT auth and role permissions are enforced on the API; the React UI uses the same permission keys to hide unauthorized navigation links and buttons.
- This codebase is intentionally focused on the **repair workflow**, not on being a full ERP.

### Managing local environment files

This project uses environment variables for sensitive configuration (database URL, JWT secret, ports). Follow these guidelines:

- Keep local `.env` files out of version control. A `.gitignore` has been added to the project root to exclude `.env` and other sensitive files.
- Backend example: create `backend/.env` with values used by Prisma and the server:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/lab448_repair?schema=public"
JWT_SECRET="change-this-secret"
PORT=4000
```

- Frontend example (local dev only): create `frontend/.env` or `frontend/.env.local` for any client-only config (avoid placing secrets here):

```env
VITE_API_BASE_URL="/api"
```

- Do NOT commit actual secrets. If you need to share settings, commit a template such as `backend/.env.example` (without real secrets) and instruct team members to copy it to `.env`.

- If you accidentally committed secrets, rotate them immediately (change DB passwords, JWT secret, API keys) and remove the secrets from git history using a tool like `git filter-repo`.

If you'd like, I can add `backend/.env.example` and `frontend/.env.example` files to the repo to make onboarding easier. Say the word and I'll add them.

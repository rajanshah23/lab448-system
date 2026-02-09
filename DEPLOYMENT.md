# Lab448 Repair Shop – Deployment (Docker + Cloudflare Tunnel)

This guide walks you through running the app with **Docker** and exposing it via **Cloudflare Tunnel** so you can test on your laptop before deploying to a server.

---

## 1. Prerequisites

- **Docker** and **Docker Compose** installed ([Docker Desktop](https://www.docker.com/products/docker-desktop/) on Windows is enough).
- **Cloudflare Tunnel** already set up and connected to your network (you only add an application route below).

---

## 2. Run the app with Docker (on your laptop)

**You get a database automatically.** Docker Compose starts **PostgreSQL in a container** — you do **not** need to install PostgreSQL on your PC. The `postgres` service in `docker-compose.yml` is the database.

**Two different .env files:**

| File | Purpose |
|------|--------|
| **Project root `.env`** (next to `docker-compose.yml`) | Used only by Docker Compose: DB password, JWT secret, port. Create this from `.env.docker.example` for Docker. |
| **`backend/.env`** | Used when you run the backend **locally** (e.g. `npm run dev`). Not used when running with Docker. |

### 2.1 Environment file (for Docker)

In the **project root** (same folder as `docker-compose.yml` and `Dockerfile`), create `.env` from the example:

```powershell
# Windows (PowerShell) — run from project root (E:\Web-Devs\lab448-system)
Copy-Item .env.docker.example .env
```

Edit the **root** `.env` and set at least:

- `POSTGRES_PASSWORD` – strong password for the DB.
- `JWT_SECRET` – strong secret for JWT (production).
- `HTTP_PORT` – port where the app will listen (default **8080**).

Example:

```env
POSTGRES_USER=lab448
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=lab448_repair
JWT_SECRET=your_secure_jwt_secret
HTTP_PORT=8080
```

### 2.2 Build and start

From the **project root** (where `docker-compose.yml` is):

```powershell
docker compose up -d --build
```

You can run this even without a root `.env` — Compose will use default DB and port. For production or to change the DB password, create the root `.env` as in 2.1 first.

This will:

- Start **PostgreSQL** in a container (your database — no separate install).
- Build and start the **backend** (Node/Express + built frontend) in another container, connected to that database.
- Expose the app on your machine at port `HTTP_PORT` (default **8080**).

**Database data persistence:** The database uses a Docker **named volume** (`lab448_postgres_data`). The Docker’s volume is backed by an external folder on the host (default `./data/postgres`; override with `POSTGRES_DATA_DIR` in root `.env`). Create that directory if needed. The `data/` directory is in `.gitignore`. When you run `docker compose down`, the containers are removed but the volume (and your data) stays. To remove the database as well, run `docker compose down -v`.

### 2.3 First-time database setup

After the stack is up, run the DB sync and seeds **once**:

```powershell
# Sync schema (creates/updates tables)
docker compose exec backend npm run db:sync

# Seed roles and repair categories (optional but recommended)
docker compose exec backend node src/scripts/seed-roles.js
docker compose exec backend node src/scripts/seed-repair-categories.js
```

**Create the first admin user** (there is no default admin or password):

Call the bootstrap endpoint **once** with the email, password, and name you want for the first admin. The app runs on **port 8080** by default.

**PowerShell:**

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/auth/bootstrap-admin" -Method POST -ContentType "application/json" -Body '{"email":"admin@example.com","password":"YourSecurePassword","name":"Admin"}'
```

Replace `admin@example.com`, `YourSecurePassword`, and `Admin` with your chosen email, password, and display name.

**WSL / Git Bash (curl):**

```bash
curl -X POST http://localhost:8080/api/auth/bootstrap-admin -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"YourSecurePassword","name":"Admin"}'
```

Then open **http://localhost:8080** (or your tunnel URL), go to the login page, and sign in with that **email** and **password**.

**If the API returns "Internal server error"**, create the admin from inside the container (you’ll see the real error in the terminal):

```bash
docker compose exec backend node src/scripts/create-admin.js admin@example.com YourSecurePassword Administrator
```

Replace email, password, and name with your choice. Then log in with that email and password.  
*(The `fix-admin.js` script only promotes an *existing* user to admin; it does not create a user or set a password.)*

### 2.4 Check that it works — use the Docker port, not 5173

**Do not use port 5173** for the deployed app. Port **5173** is the **Vite dev server** (earlier/dev version). The **Docker** app runs on **port 8080** by default.

| Where you're opening the app | URL to use |
|-----------------------------|------------|
| Same PC (localhost) | **http://localhost:8080** |
| Another device on your network | **http://YOUR_PC_IP:8080** (e.g. **http://192.168.0.110:8080**) |

Once this works, add the Cloudflare Tunnel route (Section 3).

---

## 2.5 Docker in WSL2 or “inside” another layer – network access

If Docker runs **inside WSL2** or in another container, the app may be reachable on **localhost:8080** on that machine but **not** on your PC’s LAN IP (e.g. 192.168.0.110:8080) from other devices or from a Cloudflare tunnel on another device.

**Option A – Easiest: run the tunnel on the same machine as Docker**

- Install and run the **Cloudflare Tunnel connector (cloudflared)** on the **same PC** where you run `docker compose` (e.g. in WSL2 or Windows).
- In the tunnel config, set **URL:** `localhost`, **Port:** `8080`.
- The tunnel then talks to the app over localhost; no LAN or firewall changes needed.

**Option B – Expose the app on your LAN (so another device or tunnel can reach it)**

1. **Allow port 8080 through Windows Firewall** (so the host accepts connections from the LAN):
   - Open **Windows Defender Firewall** → **Advanced settings** → **Inbound Rules** → **New Rule**.
   - Rule type: **Port** → **TCP** → **Specific local ports:** `8080`.
   - Action: **Allow the connection**.
   - Profile: **Domain**, **Private** (and **Public** only if you need it).
   - Name: e.g. `Lab448 app (8080)`.

2. **Confirm Docker is binding on all interfaces**  
   Your `docker-compose.yml` already uses `0.0.0.0:${HTTP_PORT:-8080}:4000`, so the container is published on all interfaces. With Docker Desktop on Windows, that usually means the Windows host listens on `0.0.0.0:8080` and forwards to WSL2. If it only listens on `127.0.0.1`, other devices still can’t connect.

3. **Check from another device**  
   From a phone or another PC on the same Wi‑Fi, open **http://YOUR_PC_IP:8080** (e.g. `http://192.168.0.110:8080`). If it loads, the tunnel on another device can use **URL:** `YOUR_PC_IP`, **Port:** `8080` in the tunnel’s public hostname.

4. **If it still doesn’t work**  
   Run the tunnel on the same machine as Docker (Option A) and use **localhost:8080** in the tunnel config.

---

## 3. Cloudflare Tunnel – add application route (laptop)

You already have a **Cloudflare Tunnel** set up and connected to your network. You only need to add an **application route** (public hostname) so that traffic to your chosen URL is sent to the app (port **8080**).

**Important:** The tunnel must be able to reach the app. If the tunnel runs on **another device**, that device must reach your app (e.g. **http://YOUR_PC_IP:8080**); see Section 2.5. If the tunnel runs on the **same machine** as Docker, use **localhost** and **8080** below.

### 3.1 Open the tunnel in Cloudflare

1. Log in to the **Cloudflare Dashboard**: https://dash.cloudflare.com  
2. In the left sidebar, go to **Zero Trust** (or **Networks** in the new UI).  
3. Open **Networks** → **Tunnels**.  
4. Click the **tunnel** that is running on your laptop / network (the one you already set up).

### 3.2 Add a Public Hostname (application route)

1. In the tunnel’s page, find the **Public Hostname** (or **Routes** / **Application**) section.  
2. Click **Add a hostname** (or **Add public hostname**).  
3. Fill in:

   | Field | Value |
   |-------|--------|
   | **Subdomain** | e.g. `lab448` or `repair` (you’ll get `lab448.yourdomain.com`) |
   | **Domain** | The domain you use for this tunnel (your Cloudflare zone, e.g. `yourdomain.com`) |
   | **Service type** | **HTTP** |
   | **URL** | `localhost` (or `127.0.0.1`) |
   | **Port** | **8080** |

4. Save.

Result: traffic to **https://lab448.yourdomain.com** (or whatever subdomain you chose) is sent to **http://localhost:8080** on the machine where the tunnel connector is running (your laptop).

### 3.3 If you use a config file (cloudflared)

If you run `cloudflared` with a **config file** (e.g. `config.yml`) instead of the dashboard:

1. Open the config file.  
2. Under `ingress`, add a rule for your app **before** the catch-all `http_status:404`:

```yaml
ingress:
  - hostname: lab448.yourdomain.com   # your public URL (subdomain + domain)
    service: http://localhost:8080
  - service: http_status:404          # required: catch-all must be last
```

3. Restart the tunnel connector (e.g. restart the `cloudflared` process or the service).

### 3.4 Verify

1. Ensure Docker is running and the app is up: `docker compose ps` (backend should be Up).  
2. Open **https://lab448.yourdomain.com** (or the hostname you set) in a browser.  
3. You should see the Lab448 login page; sign in with the admin account you created in 2.3. All traffic goes through the tunnel to your laptop on port 8080.

---

## 4. Do I need a root `.env`?

**No.** Docker Compose uses defaults if there is no `.env` in the project root:

- `POSTGRES_USER=lab448`, `POSTGRES_PASSWORD=lab448_secret`, `POSTGRES_DB=lab448_repair`
- `JWT_SECRET=change-this-secret`
- `HTTP_PORT=8080`

Create a root `.env` (from `.env.docker.example`) when you want to **set your own** database password, database name, JWT secret, or port.

---

## 5. Changing database password / name or other env

1. **Create or edit the root `.env`** (same folder as `docker-compose.yml`):
   ```powershell
   Copy-Item .env.docker.example .env   # if you don’t have .env yet
   ```
   Then set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, `HTTP_PORT` as you like.

2. **Remove the old database** (PostgreSQL only applies user/password when the volume is first created, so you need a fresh volume):
   ```powershell
   docker compose down -v
   ```
   `-v` deletes the `postgres_data` volume, so **all current DB data is lost**.

3. **Start again and re-run one-time setup:**
   ```powershell
   docker compose up -d --build
   docker compose exec backend npm run db:sync
   docker compose exec backend node src/scripts/seed-roles.js
   docker compose exec backend node src/scripts/seed-repair-categories.js
   ```

**Only changing env (e.g. JWT_SECRET or HTTP_PORT), keeping the same DB:**  
Edit root `.env`, then `docker compose down` and `docker compose up -d` **without** `-v`. The database is kept.

---

## 6. Useful Docker commands

| Task | Command |
|------|--------|
| View logs | `docker compose logs -f` |
| Stop (keep DB) | `docker compose down` |
| Stop and delete DB data | `docker compose down -v` |
| Rebuild after code changes | `docker compose up -d --build` |
| Restart with new .env (same DB) | `docker compose down` then `docker compose up -d` |
| Backend shell | `docker compose exec backend sh` |
| DB sync again | `docker compose exec backend npm run db:sync` |

---

## 7. Deploying to a server later

When you move to a real server:

1. **Copy the same setup:** repo + `.env` (with production values for `POSTGRES_PASSWORD`, `JWT_SECRET`, etc.).
2. **On the server:** run `docker compose up -d --build` and the same first-time DB commands (sync + seeds).
3. **Cloudflare Tunnel on the server:**  
   - Install and run `cloudflared` on the server (or use the same tunnel and point it to the server’s IP/port).  
   - Use the same kind of **Public Hostname** or **ingress** rule, with `service: http://localhost:8080` (or the port the app listens on on the server).

No need to change the Docker or app code; only the environment (and optionally `HTTP_PORT`) and where the tunnel runs.

---

## 8. Troubleshooting

- **“Port 8080 already in use”**  
  Set a different `HTTP_PORT` in root `.env` (e.g. `8081`), then use that port in the Cloudflare Tunnel and when opening the app.

- **Tunnel shows “Connection refused” or no response**  
  Ensure the app is up: `docker compose ps` and `docker compose logs backend`.  
  Ensure the tunnel’s **Port** is **8080** (same as `HTTP_PORT`).

- **API or login fails through the tunnel**  
  The frontend uses relative `/api` URLs; the same backend serves the UI and the API, so one hostname is enough. Check `docker compose logs backend` for errors.

- **Database errors on first start**  
  Run the first-time DB setup (sync + seeds) as in **2.3**.

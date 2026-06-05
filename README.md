# Tasty Bytes SPCS

> **Live app:** https://nzamyoub-se58322-snowflake-containers-adrianm.snowflakecomputing.app — Analytics Dashboard

Full-stack analytics dashboard for Tasty Bytes franchisees, deployed on Snowpark Container Services (SPCS). Built by Hakkoda as the foundation for **Consulting Skills Capstone 3: Technical Code Review**.

---

## For Facilitators

Everything is managed through GitHub Actions — no Snowflake access required for day-to-day operations.

### Before the Capstone — Resume the App

1. Go to **Actions** → **Resume Tasty Bytes App**
2. Click **Run workflow** → **Run workflow**
3. Wait ~2 minutes — the URL prints at the end of the run

### After the Capstone — Suspend the App

1. Go to **Actions** → **Suspend Tasty Bytes App**
2. Click **Run workflow** → **Run workflow**

### Intern Credentials

| User | Password |
|---|---|
| intern_group1 | Hakkoda2024! |
| intern_group2 | Hakkoda2024! |
| intern_group3 | Hakkoda2024! |
| intern_group4 | Hakkoda2024! |
| intern_group5 | Hakkoda2024! |
| intern_group6 | Hakkoda2024! |

> **Note:** Interns log in through Snowflake SSO — they will be prompted for MFA on first login. Users are pre-configured with `DISABLE_MFA = TRUE` to skip this.

---

## Architecture

```
Browser
  └── SPCS Public Endpoint (port 8000)
        └── router (nginx)
              ├── /api/* → backend (Node.js, port 3000)
              │              └── Snowflake (FROSTBYTE_TASTY_BYTES__PAMELA_GUERRERO)
              └── /* → frontend (React, port 4000)
```

All three containers run in a single SPCS service on `TASTY_APP_BACKEND_COMPUTE_POOL__PAMELA_GUERRERO`.

### Key Files

```
src/
├── backend/              # Node.js + Express API
│   ├── app.js            # Server entrypoint
│   ├── auth.js           # SPCS OAuth + JWT auth
│   ├── connect.js        # Snowflake connection
│   └── routes/           # API endpoints
├── frontend/
│   ├── frontend/         # React app
│   │   └── src/
│   │       ├── pages/    # Home, Details, Cities, Login
│   │       └── components/ # Navbar, ServiceStatus
│   └── router/           # nginx reverse proxy
│       └── nginx.conf.template
```

### API Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Service health check |
| `GET /authorize` | SPCS OAuth token exchange |
| `GET /franchise/:id` | Franchise summary |
| `GET /franchise/:id/countries` | Revenue by country |
| `GET /franchise/:id/trucks` | Revenue by truck brand |
| `GET /franchise/:id/ytd-revenue` | YTD revenue by country/month |
| `GET /franchise/:id/brand/:brand/dow` | Sales by day of week |
| `GET /franchise/:id/brand/:brand/items` | Top menu items |
| `GET /franchise/:id/cities` | Revenue by city |
| `GET /franchise/:id/cities/:city/trend` | Monthly trend for a city |

---

## CI/CD

Three GitHub Actions workflows:

| Workflow | Trigger | What it does |
|---|---|---|
| **Deploy Tasty Bytes SPCS** | Push to `main` (src changes) or manual | Build → push images → DROP/CREATE service |
| **Resume Tasty Bytes App** | Manual | `ALTER SERVICE RESUME` + prints URL |
| **Suspend Tasty Bytes App** | Manual | `ALTER SERVICE SUSPEND` |

### Required GitHub Secrets

| Secret | Value |
|---|---|
| `SNOWFLAKE_ACCOUNT` | `VEB81086.us-east-1` |
| `SNOWFLAKE_USER` | `PGUERRERO` |
| `SNOWFLAKE_PRIVATE_KEY` | Contents of `rsa_key.p8` |

---

## Local Development

```bash
# Install dependencies
cd src/backend && npm install
cd src/frontend/frontend && npm install

# Run backend locally
cd src/backend
CLIENT_VALIDATION=Dev node app.js

# Run frontend locally
cd src/frontend/frontend
REACT_APP_BACKEND_URL=http://localhost:3000 npm start
```

### Deploy to SPCS

```bash
# Deploy all containers
bash deploy.sh

# Deploy only what changed
bash deploy.sh frontend
bash deploy.sh backend
bash deploy.sh router
```

---

## Snowflake Resources

| Resource | Name |
|---|---|
| Database | `FROSTBYTE_TASTY_BYTES__PAMELA_GUERRERO` |
| Schema | `APP` |
| Service | `FRONTEND_SERVICE__PAMELA_GUERRERO` |
| Compute Pool | `TASTY_APP_BACKEND_COMPUTE_POOL__PAMELA_GUERRERO` |
| Warehouse | `TASTY_APP_WAREHOUSE__PAMELA_GUERRERO` |
| Role | `TASTY_APP_ADMIN_ROLE__PAMELA_GUERRERO` |
| Image Registry | `novacart_db/app/novacart_repository` |
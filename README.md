# Tasty Bytes Analytics — SPCS
### Hakkoda Capstone Reference Implementation

A full-stack data analytics dashboard for the Tasty Bytes food truck franchise, deployed entirely within Snowflake using **Snowpark Container Services (SPCS)**.

> This codebase is the reference implementation for the Hakkoda Consulting Skills Capstone. It extends the original Snowflake quickstart with additional features and a cleaner codebase.

---

## What's Inside
├── src/
│   ├── backend/          Node.js + Express API
│   │   ├── routes/       franchise, trucks, cities, login, health
│   │   ├── queries/      All SQL queries (parameterized)
│   │   ├── auth.js       Authentication middleware (Dev / JWT / SPCS)
│   │   └── connect.js    Snowflake connection (local keypair + SPCS OAuth)
│   └── frontend/
│       ├── frontend/     React 18 app (Home, Details, Cities pages)
│       └── router/       NGINX reverse proxy (solves CORS in SPCS)
├── sql/
│   └── setup.sql         Full Snowflake setup — run this first
├── docs/
│   └── ARCHITECTURE.md   Design decisions explained
└── build-and-push.sh     Builds all images and pushes to Snowflake registry

## What's New vs. the Snowflake Quickstart

- 🏙️ **City Analytics view** — Top 15 cities by revenue + monthly trend per city
- 📊 **Order volume charts** — Not just revenue, but order count by day of week
- 🔍 **Truck brand filter** — Selectable in the frontend UI
- 🟢 **`/health` endpoint** — Structured health check with Snowflake connectivity status
- 🟢 **Service status indicator** — Live in the navbar, polls `/health` every 30s
- 🌙 **Dark mode** — Persisted via localStorage

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for SPCS deployment)
- A Snowflake account with SPCS enabled

### 1. Snowflake Setup
Open `sql/setup.sql`, replace all `[user]` with your username (no dots — use underscores, e.g. `_jane_doe`), and run it in a Snowflake worksheet as ACCOUNTADMIN.

### 2. Generate Keypair (required if your account has MFA)

```bash
# Generate private key
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt

# Generate public key
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub

# Register public key in Snowflake (run in Snowsight as ACCOUNTADMIN)
ALTER USER YOUR_USERNAME SET RSA_PUBLIC_KEY='<paste contents of rsa_key.pub>';
```

### 3. Local Development

```bash
# Backend
cd src/backend
cp .env.example .env
# Fill in your Snowflake credentials and private key path
node app.js

# Test it:
curl http://localhost:3000/franchise/1
curl http://localhost:3000/health

# Frontend (new terminal)
cd src/frontend/frontend
cp .env.example .env
npm install
npm start
# Open: http://localhost:3001
```

### 4. Deploy to SPCS

> ⚠️ Requires SNOWSERVICES_INGRESS enabled on your Snowflake account.
> Contact Snowflake Support if CREATE SECURITY INTEGRATION fails.

```bash
export REPO_URL=<your_account>.registry.snowflakecomputing.com/<db>/app/<repo>
export ADMIN_USER=<your_snowflake_username>
bash build-and-push.sh
# Then run Step 13 of sql/setup.sql to CREATE SERVICE
```

---

## Troubleshooting

### Account identifier format
Use `<locator>.<region>` format in your `.env`. Find yours with:
```sql
SELECT CURRENT_ACCOUNT(), CURRENT_REGION();
-- Example result: VEB81086 | PUBLIC.AWS_US_EAST_1
-- Use: VEB81086.us-east-1
```

### MFA is required error
If you see `MFA with TOTP is required`, your account enforces MFA and password auth won't work. Use keypair authentication instead (see Step 2 above).

### Find your Snowflake username
```sql
SELECT CURRENT_USER();
```
Your username may differ from your email address.

### CORS error on localhost
The frontend runs on port 3001 locally. Make sure `app.js` has:
```javascript
const corsOrigin = process.env.CLIENT_VALIDATION === 'Dev'
  ? 'http://localhost:3001'
  : false;
```

### Object name errors with dots
Snowflake treats dots as object separators. Use underscores in all object names:
- ✅ `tasty_app_admin_role__jane_doe`
- ❌ `tasty_app_admin_role__jane.doe`

### CREATE SECURITY INTEGRATION fails
Requires ACCOUNTADMIN and SNOWSERVICES_INGRESS enabled on your account.
Contact Snowflake Support to enable SPCS ingress if needed.

---

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a full explanation of all design decisions.

---

## Test User Accounts

| Username | Password | Franchise |
|---|---|---|
| `intern_group1` | `Hakkoda2024!` | 1 |
| `intern_group2` | `Hakkoda2024!` | 120 |
| `intern_group3` | `Hakkoda2024!` | 271 |
| `intern_group4` | `Hakkoda2024!` | 1 |
| `intern_group5` | `Hakkoda2024!` | 120 |
| `intern_group6` | `Hakkoda2024!` | 271 |

---

*Built by Hakkoda — hakkoda.io*
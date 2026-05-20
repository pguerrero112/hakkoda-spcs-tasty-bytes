# Tasty Bytes Analytics — SPCS
### Hakkoda Capstone Reference Implementation

A full-stack data analytics dashboard for the Tasty Bytes food truck franchise, deployed entirely within Snowflake using **Snowpark Container Services (SPCS)**.

> This codebase is the reference implementation for the Hakkoda Consulting Skills Capstone. It extends the original Snowflake quickstart with additional features and a cleaner codebase.

---

## What's Inside

```
├── src/
│   ├── backend/          Node.js + Express API
│   │   ├── routes/       franchise, trucks, cities, login, health
│   │   ├── queries/      All SQL queries (parameterized)
│   │   ├── auth.js       Authentication middleware (Dev / JWT / SPCS)
│   │   └── connect.js    Snowflake connection (local + SPCS OAuth)
│   └── frontend/
│       ├── frontend/     React 18 app (Home, Details, Cities pages)
│       └── router/       NGINX reverse proxy (solves CORS in SPCS)
├── sql/
│   └── setup.sql         Full Snowflake setup — run this first
├── docs/
│   └── ARCHITECTURE.md   Design decisions explained
└── build-and-push.sh     Builds all images and pushes to Snowflake registry
```

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
- Docker
- Node.js 18+
- A Snowflake Enterprise account with SPCS enabled

### 1. Snowflake Setup
Open `sql/setup.sql`, replace all `[user]` with your username, and run it in a Snowflake worksheet.

### 2. Local Development
```bash
# Backend
cd src/backend
cp .env.example .env        # fill in your Snowflake credentials
docker compose up

# In another terminal — test it:
curl http://localhost:3000/franchise/1
curl http://localhost:3000/health

# Frontend
cd src/frontend
docker compose up
# Open: http://localhost:8888
```

### 3. Deploy to SPCS
```bash
# Set your repo URL (from: SHOW IMAGE REPOSITORIES in Snowflake)
export REPO_URL=<your_account>.registry.snowflakecomputing.com/<db>/app/<repo>
export ADMIN_USER=<your_snowflake_username>

bash build-and-push.sh

# Then run Step 13 of sql/setup.sql to CREATE SERVICE
```

---

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a full explanation of:
- Why two Compute Pools?
- Why the NGINX router exists (CORS in SPCS)
- How authentication changes from JWT to SPCS OAuth
- How the backend connects to Snowflake without credentials
- What changed from the original quickstart

---

## User Accounts (for testing)

| Username | Password | Franchise |
|---|---|---|
| `user1_[user]` | `password1` | 1 |
| `user2_[user]` | `password120` | 120 |
| `user3_[user]` | `password271` | 271 |

---

*Built by Hakkoda — hakkoda.io*

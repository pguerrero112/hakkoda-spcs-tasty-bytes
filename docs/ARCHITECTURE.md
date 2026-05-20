# Architecture — Tasty Bytes SPCS
## Hakkoda Capstone Reference Implementation

---

## Overview

This application is a three-tier analytics dashboard for Tasty Bytes food truck franchisees, deployed entirely within Snowflake using Snowpark Container Services (SPCS). No data leaves the Snowflake environment during processing.

```
Browser
  └─► Public Ingress (SPCS OAuth)
        └─► frontend_service (port 8000)
              ├─► Container: router (NGINX)
              │     ├─► /api/* → backend-service:3000
              │     └─► /*     → localhost:4000
              └─► Container: frontend (React, port 4000)

backend_service (port 3000)
  └─► Node.js Express API
        └─► Snowflake (OAuth token at /snowflake/session/token)
              └─► ORDERS table (frostbyte_tasty_bytes_[user].app)
```

---

## Services

### backend_service
- **Image:** `backend_service_image`
- **Runtime:** Node.js 18 + Express
- **Compute Pool:** `tasty_app_backend_compute_pool` (CPU_X64_S)
- **Port:** 3000 (public endpoint exposed)
- **Connects to Snowflake:** via OAuth token at `/snowflake/session/token` — no credentials in environment

### frontend_service
- **Containers:** two containers in a single SPCS service spec
- **Container 1 — frontend:** React 18 app, port 4000 (internal only)
- **Container 2 — router:** NGINX reverse proxy, port 8000 (public endpoint)
- **Compute Pool:** `tasty_app_frontend_compute_pool` (CPU_X64_XS)

---

## Key Design Decisions

### 1. Why two Compute Pools?
The backend does SQL query execution and business logic — it benefits from a larger instance (CPU_X64_S). The frontend serves mostly static React files and has minimal CPU needs (CPU_X64_XS). Separating the pools allows independent scaling and cost control.

### 2. Why is the NGINX router in the frontend service?
SPCS strips custom headers from inbound requests, which means CORS headers cannot be added to the backend's public endpoint. The browser's CORS policy would block cross-origin API calls from the React app. The router solves this by acting as a single origin: `/api/*` calls are proxied internally to the backend service (a service-to-service call, no CORS), and everything else goes to the React container.

### 3. Why does authentication change from JWT to SPCS OAuth?
In the original architecture (non-SPCS), the backend issued JWT tokens that were sent as `Authorization: Bearer` headers. In SPCS, the platform strips all custom headers from public endpoint requests for security — only a controlled set of platform-injected headers reach the service. The `Sf-Context-Current-User` header is injected by SPCS after the user authenticates with Snowflake OAuth. It cannot be set or spoofed by the client, making it a trustworthy identity signal. The backend reads this header and looks up the user's `franchise_id` in the USERS table.

### 4. How does the backend connect to Snowflake inside SPCS?
SPCS mounts an OAuth token at `/snowflake/session/token` for every running service. The backend reads this file at startup. The token authenticates the service as its owner role (`tasty_app_admin_role`). No username, password, or private key is needed — and no credentials can be leaked.

See `src/backend/connect.js` for the exact implementation.

### 5. What is new vs. the original Snowflake quickstart?

| Feature | Quickstart | This Repo |
|---|---|---|
| Franchise view (countries, trucks, YTD) | ✓ | ✓ |
| Truck brand detail view | ✓ | ✓ |
| **City analytics view** | ✗ | ✓ |
| **Truck brand filter on frontend** | ✗ | ✓ |
| **`/health` endpoint** | ✗ | ✓ |
| **Service status indicator in UI** | ✗ | ✓ |
| **Dark mode** | ✗ | ✓ |
| **Order volume chart (not just revenue)** | ✗ | ✓ |
| React 18 + React Router v6 | ✗ | ✓ |

---

## Local Development

```bash
# Backend
cd src/backend
cp .env.example .env
# Fill in your Snowflake credentials in .env
docker compose up

# Test without auth:
curl http://localhost:3000/franchise/1

# Test with simulated SPCS header:
curl --header "Sf-Context-Current-User: user1_[user]" http://localhost:3000/franchise/1

# Test health endpoint:
curl http://localhost:3000/health

# Frontend + router
cd src/frontend
docker compose --env-file frontend/.env.example up
# Open http://localhost:8888
```

---

## SPCS Deployment

1. Run `sql/setup.sql` in Snowflake (replace all `[user]` placeholders)
2. Get the Image Repository URL: `SHOW IMAGE REPOSITORIES;`
3. Build and push: `bash build-and-push.sh`
4. Verify images: `CALL SYSTEM$REGISTRY_LIST_IMAGES(...)`
5. Run the `CREATE SERVICE` statements from `sql/setup.sql` (Step 13)
6. Monitor: `SELECT SYSTEM$GET_SERVICE_STATUS('backend_service_[user]');`
7. Get your public URL: `SHOW ENDPOINTS IN SERVICE frontend_service_[user];`

---

## Pricing Note

SPCS bills per compute pool node per second — whether or not the node is actively serving requests. With `MIN_NODES=1`, you pay for one node continuously. For a development/capstone scenario this is fine; for production, consider `MIN_NODES=0` with an appropriate cold-start strategy.

# Troubleshooting Guide
## Tasty Bytes SPCS — Real Issues Encountered During Setup

This guide documents every significant issue encountered during the actual setup of this project, with exact solutions. If you hit a problem, start here.

---

## Table of Contents

1. [Object name errors with dots](#1-object-name-errors-with-dots)
2. [MFA blocking Snowflake connections](#2-mfa-blocking-snowflake-connections)
3. [Snowflake account identifier format](#3-snowflake-account-identifier-format)
4. [Docker login fails with MFA error](#4-docker-login-fails-with-mfa-error)
5. [bcrypt invalid ELF header in SPCS](#5-bcrypt-invalid-elf-header-in-spcs)
6. [SUSPEND/RESUME doesn't pull new images](#6-suspendresume-doesnt-pull-new-images)
7. [CREATE SECURITY INTEGRATION fails](#7-create-security-integration-fails)
8. [Service shows FAILED on first deploy](#8-service-shows-failed-on-first-deploy)
9. [Frontend loads but charts are empty](#9-frontend-loads-but-charts-are-empty)
10. [YTD Revenue chart is empty](#10-ytd-revenue-chart-is-empty)
11. [401 Unauthorized after OAuth login](#11-401-unauthorized-after-oauth-login)
12. [CORS errors in local development](#12-cors-errors-in-local-development)
13. [snow spcs image-registry token fails in CI/CD](#13-snow-spcs-image-registry-token-fails-in-cicd)

---

## 1. Object name errors with dots

**Symptom:**
```
SQL compilation error: Object does not exist, or operation cannot be performed.
```
When creating warehouses, roles, or other objects with a username like `jane.doe`.

**Root cause:**
Snowflake treats dots as object separators (e.g. `database.schema.table`). A username like `jane.doe` in an object name breaks the parser.

**Solution:**
Replace dots with underscores in ALL object names:
```sql
-- ❌ Wrong
CREATE WAREHOUSE tasty_app_warehouse_jane.doe;

-- ✅ Correct
CREATE WAREHOUSE tasty_app_warehouse_jane_doe;
```

Also verify your exact Snowflake username:
```sql
SELECT CURRENT_USER();
-- May return JDOE or JANE_DOE, not jane.doe
```

---

## 2. MFA blocking Snowflake connections

**Symptom:**
```
Failed to authenticate: MFA with TOTP is required.
```
When running `node app.js` locally with username/password in `.env`.

**Root cause:**
Enterprise Snowflake accounts enforce MFA for all users. Password-only authentication is blocked at the platform level.

**Solution:**
Use keypair (RSA) authentication instead of password.

**Step 1 — Generate keys:**
```bash
# Generate private key
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt

# Generate public key
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
```

**Step 2 — Register public key in Snowflake:**
```sql
-- First find your exact username
SELECT CURRENT_USER();

-- Register the key (paste contents of rsa_key.pub, without header/footer lines)
ALTER USER YOUR_USERNAME SET RSA_PUBLIC_KEY='MIIBIjANBgkqhki...';
```

**Step 3 — Update connect.js:**
```javascript
// Local development block — use keypair instead of password
const privateKey = fs.readFileSync(process.env.SNOWFLAKE_PRIVATE_KEY_PATH, 'utf8');
return {
  ...base,
  account:       process.env.SNOWFLAKE_ACCOUNT,
  username:      process.env.SNOWFLAKE_USERNAME,
  authenticator: 'SNOWFLAKE_JWT',
  privateKey:    privateKey,
  role:          process.env.SNOWFLAKE_ROLE,
};
```

**Step 4 — Update .env:**
```
SNOWFLAKE_PRIVATE_KEY_PATH=/absolute/path/to/rsa_key.p8
# Remove or comment out SNOWFLAKE_PASSWORD
```

---

## 3. Snowflake account identifier format

**Symptom:**
```
Request to Snowflake failed.
```
Backend connects successfully but all queries fail immediately after.

**Root cause:**
The Snowflake Node.js SDK requires a specific account identifier format that includes the region.

**Solution:**
Use `<locator>.<region>` format:
```bash
# Find your values
SELECT CURRENT_ACCOUNT(), CURRENT_REGION();
# Example: VEB81086 | PUBLIC.AWS_US_EAST_1

# In .env use:
SNOWFLAKE_ACCOUNT=VEB81086.us-east-1
```

Region format mapping:
- `PUBLIC.AWS_US_EAST_1` → `us-east-1`
- `PUBLIC.AWS_US_WEST_2` → `us-west-2`
- `PUBLIC.AZURE_EASTUS2` → `azure-eastus2`

---

## 4. Docker login fails with MFA error

**Symptom:**
```
Authentication Failure: MFA with TOTP is required.
```
When running `docker login <registry_url>`.

**Root cause:**
Same MFA enforcement — the Snowflake image registry also requires authentication, and password-based login is blocked.

**Solution:**
Use Snowflake CLI with keypair authentication:

```bash
# Install Snowflake CLI
pip3 install snowflake-cli-labs

# Add to PATH if needed
export PATH="/Users/yourname/Library/Python/3.9/bin:$PATH"

# Add a connection
snow connection add \
  --connection-name spcs \
  --account VEB81086.us-east-1 \
  --user YOUR_USERNAME \
  --authenticator SNOWFLAKE_JWT \
  --private-key /path/to/rsa_key.p8 \
  --role YOUR_ADMIN_ROLE

# Login to registry
snow spcs image-registry login --connection spcs

# Then run build-and-push.sh normally
bash build-and-push.sh
```

Update `build-and-push.sh` to replace the `docker login` line with:
```bash
snow spcs image-registry login --connection spcs
```

---

## 5. bcrypt invalid ELF header in SPCS

**Symptom (in service logs):**
```
Error: /app/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node: invalid ELF header
```
Service status is FAILED immediately after deployment.

**Root cause:**
The `node_modules` directory was built on Mac (ARM) before Docker build. Native binaries compiled for macOS are not compatible with the `linux/amd64` architecture required by SPCS.

**Solution:**
Add a `.dockerignore` file to the backend directory to exclude `node_modules`:

```bash
# src/backend/.dockerignore
node_modules
.env
rsa_key.p8
rsa_key.pub
*.log
```

Then rebuild with `--no-cache`:
```bash
docker build --no-cache --platform linux/amd64 \
  -t backend_service_image:latest \
  ./src/backend
```

This forces `npm install` to run inside the container on `linux/amd64`, producing compatible native binaries.

---

## 6. SUSPEND/RESUME doesn't pull new images

**Symptom:**
After pushing a new Docker image and running `ALTER SERVICE ... RESUME`, the service still runs the old image.

**Root cause:**
`ALTER SERVICE SUSPEND/RESUME` restarts the existing containers — it does NOT pull a new image from the registry.

**Solution:**
To deploy a new image, you must DROP and recreate the service:
```sql
DROP SERVICE backend_service_[user];

-- Then re-run the full CREATE SERVICE statement
CREATE SERVICE backend_service_[user]
  IN COMPUTE POOL ...
  ...;

-- Re-run grants
GRANT USAGE ON SERVICE backend_service_[user] TO ROLE tasty_app_ext_role_[user];
GRANT SERVICE ROLE backend_service_[user]!ALL_ENDPOINTS_USAGE TO ROLE tasty_app_ext_role_[user];
```

---

## 7. CREATE SECURITY INTEGRATION fails

**Symptom:**
```
SQL compilation error: Object does not exist, or operation cannot be performed.
```
When running:
```sql
CREATE SECURITY INTEGRATION "Application Authentication"
  TYPE = OAUTH
  OAUTH_CLIENT = SNOWSERVICES_INGRESS
  ENABLED = TRUE;
```

**Root cause:**
`SNOWSERVICES_INGRESS` is not enabled on the Snowflake account. This is a platform-level feature that Snowflake must enable for your account — it cannot be self-activated.

**Solution:**
Open a support case with Snowflake:
- Go to support.snowflake.com
- Subject: "Enable SNOWSERVICES_INGRESS for public SPCS endpoints"
- Include your account identifier: `SELECT CURRENT_ACCOUNT_NAME();`

**Workaround while waiting:**
Run services with `public: false` endpoints — they work internally but are not browser-accessible. Once Snowflake enables ingress, recreate services with `public: true`.

---

## 8. Service shows FAILED on first deploy

**Symptom:**
```json
{"status":"FAILED","message":"User application error, check container logs"}
```

**Diagnosis:**
```sql
CALL SYSTEM$GET_SERVICE_LOGS('your_service', '0', 'backend', 100);
```

**Common causes and fixes:**

| Log error | Cause | Fix |
|---|---|---|
| `invalid ELF header` | Mac-compiled node_modules | See [Issue #5](#5-bcrypt-invalid-elf-header-in-spcs) |
| `Cannot find module` | Missing dependency | Check Dockerfile copies package.json before npm install |
| `Request to Snowflake failed` | Wrong warehouse/database name in env | Verify env vars in service spec |
| `Incorrect username or password` | Service user has wrong role | Check GRANT statements |

---

## 9. Frontend loads but charts are empty

**Symptom:**
The app opens after OAuth login but all chart areas are blank.

**Root cause:**
The backend `/authorize` endpoint returns 401 because the authenticated Snowflake user is not in the `users` table.

**Solution:**
The USERS table username must exactly match the Snowflake username (case-insensitive, but must exist):
```sql
-- Check what Snowflake sends as the authenticated user
-- Look at backend logs for: "sf-context-current-user: XXXX"

-- Add your user to the table
INSERT INTO users VALUES
  (7, 'YOUR_SNOWFLAKE_USERNAME', '$2b$10$v0IoU/pokkiM13e.eayf1u3DkgtIBMGO1uRO2O.mlb2K2cLztV5vy', 1, CURRENT_TIMESTAMP, TRUE);
```

Note: the hashed password above corresponds to `password1`.

---

## 10. YTD Revenue chart is empty

**Symptom:**
The "YTD Revenue by Country" chart on the Home page loads but shows no data.

**Root cause:**
The dataset only covers 2022. The original query used `YEAR(CURRENT_DATE)` which returns 2025/2026 — no matching data.

**Fix (already applied in this repo):**
In `src/backend/queries/sql.js`, the `ytd_revenue` and `city_revenue_trend` queries use `2022` as a fixed year:
```sql
-- Fixed
AND YEAR(order_ts) = 2022

-- Not this (returns empty — no 2025/2026 data)
AND YEAR(order_ts) = YEAR(CURRENT_DATE)
```

---

## 11. 401 Unauthorized after OAuth login

**Symptom:**
After logging in through Snowflake OAuth, the app shows a white screen. Browser console shows:
```
api/authorize:1  Failed to load resource: 401
```

**Root cause:**
The Snowflake username used to log in (e.g. `PGUERRERO`) does not exist in the `users` table. The backend looks up the user from the `Sf-Context-Current-User` header and returns 401 if not found.

**Solution:**
Add the user to the `users` table — see [Issue #9](#9-frontend-loads-but-charts-are-empty).

---

## 12. CORS errors in local development

**Symptom:**
```
Access to fetch at 'http://localhost:3000' from origin 'http://localhost:3001' 
has been blocked by CORS policy
```

**Root cause:**
The frontend runs on port 3001 (because 3000 is taken by the backend), but the backend only allows port 4000 by default.

**Solution:**
In `src/backend/app.js`, update the CORS origin:
```javascript
const corsOrigin = process.env.CLIENT_VALIDATION === 'Dev'
  ? 'http://localhost:3001'  // React dev server port
  : false;
```

---

## 13. snow spcs image-registry token fails in CI/CD

**Symptom:**
```
Error: Cannot perform an interactive login from a non TTY device
```
When running `snow spcs image-registry token` in GitHub Actions.

**Root cause:**
`snow spcs image-registry token` requires an interactive session in some configurations. It fails silently in non-TTY environments.

**Solution:**
Use `snow spcs image-registry login` instead, which handles the token exchange internally:

```yaml
- name: Login to Snowflake registry
  run: |
    snow spcs image-registry login \
      --connection default \
      --account VEB81086.us-east-1 \
      --user PGUERRERO \
      --authenticator SNOWFLAKE_JWT \
      --private-key-file /tmp/rsa_key.p8
```

See `.github/workflows/build-and-push.yml` for the complete working CI/CD configuration.

---

## Quick Reference

### Find your account info
```sql
SELECT CURRENT_USER();           -- Your Snowflake username
SELECT CURRENT_ACCOUNT();        -- Account locator (e.g. VEB81086)
SELECT CURRENT_ACCOUNT_NAME();   -- Full account name
SELECT CURRENT_REGION();         -- Region (e.g. PUBLIC.AWS_US_EAST_1)
```

### Check service health
```sql
SELECT SYSTEM$GET_SERVICE_STATUS('your_service');
CALL SYSTEM$GET_SERVICE_LOGS('your_service', '0', 'backend', 100);
SHOW ENDPOINTS IN SERVICE your_service;
```

### Suspend/resume to save cost
```sql
ALTER SERVICE backend_service_[user]  SUSPEND;
ALTER SERVICE frontend_service_[user] SUSPEND;

ALTER SERVICE backend_service_[user]  RESUME;
ALTER SERVICE frontend_service_[user] RESUME;
-- ⚠ Check SHOW ENDPOINTS after resume — URL may change
```

### Verify images in registry
```sql
CALL SYSTEM$REGISTRY_LIST_IMAGES('/db/schema/repo');
```

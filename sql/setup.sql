-- ══════════════════════════════════════════════════════════════════════════════
-- Tasty Bytes SPCS — Full Snowflake Setup Script
-- Hakkoda Capstone Project
--
-- BEFORE YOU START — READ THIS:
--
--   1. Replace every [user] with your assigned username.
--      ⚠  Use UNDERSCORES only — no dots, no dashes.
--      ✅ Correct:   _jane_doe
--      ❌ Wrong:     jane.doe  (dots break Snowflake object names)
--
--   2. You need ACCOUNTADMIN to run this script.
--
--   3. SPCS ingress (public endpoints) requires Snowflake to enable
--      SNOWSERVICES_INGRESS on your account. If CREATE SECURITY INTEGRATION
--      fails with "Object does not exist", it means ingress is not enabled.
--      → Contact Snowflake Support to enable it on your account.
--      → Alternatively, skip the public endpoint and use internal-only services.
--
--   4. If your account enforces MFA, password-based docker login will fail.
--      → Use: snow spcs image-registry login --connection <your_connection>
--      → See TROUBLESHOOTING.md for full keypair setup instructions.
--
-- ══════════════════════════════════════════════════════════════════════════════

USE ROLE ACCOUNTADMIN;


-- ── Step 1: Warehouses ────────────────────────────────────────────────────────

-- Query warehouse — for exploration and general use
CREATE OR REPLACE WAREHOUSE query_wh_[user] WITH
  WAREHOUSE_SIZE  = 'MEDIUM'
  WAREHOUSE_TYPE  = 'STANDARD'
  AUTO_SUSPEND    = 300
  AUTO_RESUME     = TRUE;

-- Load warehouse — for ingesting data from S3
CREATE OR REPLACE WAREHOUSE load_wh_[user] WITH
  WAREHOUSE_SIZE  = 'LARGE'
  WAREHOUSE_TYPE  = 'STANDARD'
  AUTO_SUSPEND    = 300
  AUTO_RESUME     = TRUE;

-- App warehouse — used at runtime by the backend service
CREATE OR REPLACE WAREHOUSE tasty_app_warehouse_[user] WITH
  WAREHOUSE_SIZE       = 'X-SMALL'
  WAREHOUSE_TYPE       = 'STANDARD'
  AUTO_SUSPEND         = 180
  AUTO_RESUME          = TRUE
  INITIALLY_SUSPENDED  = FALSE;


-- ── Step 2: Database and schema ───────────────────────────────────────────────

CREATE OR REPLACE DATABASE frostbyte_tasty_bytes_[user];
CREATE OR REPLACE SCHEMA   frostbyte_tasty_bytes_[user].app;

USE DATABASE frostbyte_tasty_bytes_[user];
USE SCHEMA   app;


-- ── Step 3: Orders table ──────────────────────────────────────────────────────

CREATE OR REPLACE TABLE orders (
  order_id              NUMBER(38,0),
  truck_id              NUMBER(38,0),
  order_ts              TIMESTAMP_NTZ(9),
  order_detail_id       NUMBER(38,0),
  line_number           NUMBER(38,0),
  truck_brand_name      VARCHAR,
  menu_type             VARCHAR,
  primary_city          VARCHAR,
  region                VARCHAR,
  country               VARCHAR,
  franchise_flag        NUMBER(38,0),
  franchise_id          NUMBER(38,0),
  franchisee_first_name VARCHAR,
  franchisee_last_name  VARCHAR,
  location_id           NUMBER(19,0),
  customer_id           NUMBER(38,0),
  first_name            VARCHAR,
  last_name             VARCHAR,
  e_mail                VARCHAR,
  phone_number          VARCHAR,
  children_count        VARCHAR,
  gender                VARCHAR,
  marital_status        VARCHAR,
  menu_item_id          NUMBER(38,0),
  menu_item_name        VARCHAR,
  quantity              NUMBER(5,0),
  unit_price            NUMBER(38,4),
  price                 NUMBER(38,4),
  order_amount          NUMBER(38,4),
  order_tax_amount      VARCHAR,
  order_discount_amount VARCHAR,
  order_total           NUMBER(38,4)
);


-- ── Step 4: Load data from S3 ─────────────────────────────────────────────────
-- Note: dataset covers 2022-01-01 to 2022-10-31 (~231M records)

USE WAREHOUSE load_wh_[user];

CREATE OR REPLACE STAGE tasty_bytes_app_stage_[user]
  URL = 's3://sfquickstarts/frostbyte_tastybytes/app/orders/';

COPY INTO orders FROM @tasty_bytes_app_stage_[user];

-- Verify: should return ~231 million rows
USE WAREHOUSE query_wh_[user];
SELECT COUNT(*) FROM orders;


-- ── Step 5: Users table ───────────────────────────────────────────────────────
-- User names in this table must match Snowflake usernames EXACTLY (uppercase).
-- The backend does: WHERE UPPER(user_name) = UPPER(sf_context_header)
-- So if the Snowflake user is INTERN_GROUP1, the table must have INTERN_GROUP1.

CREATE OR REPLACE TABLE users (
  user_id         NUMBER(38,0) AUTOINCREMENT,
  user_name       VARCHAR      NOT NULL,
  hashed_password VARCHAR,
  franchise_id    NUMBER(38,0),
  password_date   TIMESTAMP_NTZ(9),
  status          BOOLEAN,
  UNIQUE (user_name)
);

-- Seed intern group users
-- Hashed passwords: group1/4 = password1, group2/5 = password120, group3/6 = password271
INSERT INTO users VALUES
  (1, 'INTERN_GROUP1', '$2b$10$v0IoU/pokkiM13e.eayf1u3DkgtIBMGO1uRO2O.mlb2K2cLztV5vy', 1,   CURRENT_TIMESTAMP, TRUE),
  (2, 'INTERN_GROUP2', '$2b$10$e2TXM/kLlazbH1xl31SeOe6RTyfL3E9mE8sZZsU33AE52rO.u44JC', 120, CURRENT_TIMESTAMP, TRUE),
  (3, 'INTERN_GROUP3', '$2b$10$WX4e1LAC.rAabBJV58RuKerEK4T/U4htgXrmedTa5oiGCWIRHwe0e', 271, CURRENT_TIMESTAMP, TRUE),
  (4, 'INTERN_GROUP4', '$2b$10$v0IoU/pokkiM13e.eayf1u3DkgtIBMGO1uRO2O.mlb2K2cLztV5vy', 1,   CURRENT_TIMESTAMP, TRUE),
  (5, 'INTERN_GROUP5', '$2b$10$e2TXM/kLlazbH1xl31SeOe6RTyfL3E9mE8sZZsU33AE52rO.u44JC', 120, CURRENT_TIMESTAMP, TRUE),
  (6, 'INTERN_GROUP6', '$2b$10$WX4e1LAC.rAabBJV58RuKerEK4T/U4htgXrmedTa5oiGCWIRHwe0e', 271, CURRENT_TIMESTAMP, TRUE);

-- If you want to add yourself for testing:
-- INSERT INTO users VALUES (7, 'YOUR_SNOWFLAKE_USERNAME', '$2b$10$v0IoU/pokkiM13e.eayf1u3DkgtIBMGO1uRO2O.mlb2K2cLztV5vy', 1, CURRENT_TIMESTAMP, TRUE);


-- ── Step 6: Roles and permissions ────────────────────────────────────────────

CREATE ROLE IF NOT EXISTS tasty_app_admin_role_[user];

GRANT ALL   ON DATABASE  frostbyte_tasty_bytes_[user]              TO ROLE tasty_app_admin_role_[user];
GRANT ALL   ON SCHEMA    frostbyte_tasty_bytes_[user].app           TO ROLE tasty_app_admin_role_[user];
GRANT SELECT ON ALL TABLES    IN SCHEMA frostbyte_tasty_bytes_[user].app TO ROLE tasty_app_admin_role_[user];
GRANT SELECT ON FUTURE TABLES IN SCHEMA frostbyte_tasty_bytes_[user].app TO ROLE tasty_app_admin_role_[user];
GRANT ALL   ON WAREHOUSE tasty_app_warehouse_[user]                TO ROLE tasty_app_admin_role_[user];

-- Grant admin role to your user
SET sql = ('GRANT ROLE tasty_app_admin_role_[user] TO USER ' || CURRENT_USER() || '');
EXECUTE IMMEDIATE $sql;

-- Allow services to bind public endpoints
GRANT BIND SERVICE ENDPOINT ON ACCOUNT TO ROLE tasty_app_admin_role_[user];


-- ── Step 7: External user role and Snowflake users ────────────────────────────
-- These are the Snowflake users that intern groups log in with.
-- ⚠  Requires ACCOUNTADMIN.

CREATE ROLE IF NOT EXISTS tasty_app_ext_role_[user];
GRANT USAGE ON DATABASE frostbyte_tasty_bytes_[user]     TO ROLE tasty_app_ext_role_[user];
GRANT USAGE ON SCHEMA   frostbyte_tasty_bytes_[user].app TO ROLE tasty_app_ext_role_[user];

CREATE USER IF NOT EXISTS intern_group1 PASSWORD='Hakkoda2024!' MUST_CHANGE_PASSWORD=FALSE DEFAULT_ROLE=tasty_app_ext_role_[user];
CREATE USER IF NOT EXISTS intern_group2 PASSWORD='Hakkoda2024!' MUST_CHANGE_PASSWORD=FALSE DEFAULT_ROLE=tasty_app_ext_role_[user];
CREATE USER IF NOT EXISTS intern_group3 PASSWORD='Hakkoda2024!' MUST_CHANGE_PASSWORD=FALSE DEFAULT_ROLE=tasty_app_ext_role_[user];
CREATE USER IF NOT EXISTS intern_group4 PASSWORD='Hakkoda2024!' MUST_CHANGE_PASSWORD=FALSE DEFAULT_ROLE=tasty_app_ext_role_[user];
CREATE USER IF NOT EXISTS intern_group5 PASSWORD='Hakkoda2024!' MUST_CHANGE_PASSWORD=FALSE DEFAULT_ROLE=tasty_app_ext_role_[user];
CREATE USER IF NOT EXISTS intern_group6 PASSWORD='Hakkoda2024!' MUST_CHANGE_PASSWORD=FALSE DEFAULT_ROLE=tasty_app_ext_role_[user];

GRANT ROLE tasty_app_ext_role_[user] TO USER intern_group1;
GRANT ROLE tasty_app_ext_role_[user] TO USER intern_group2;
GRANT ROLE tasty_app_ext_role_[user] TO USER intern_group3;
GRANT ROLE tasty_app_ext_role_[user] TO USER intern_group4;
GRANT ROLE tasty_app_ext_role_[user] TO USER intern_group5;
GRANT ROLE tasty_app_ext_role_[user] TO USER intern_group6;


-- ── Step 8: Compute pools ─────────────────────────────────────────────────────
-- Two pools: backend (slightly larger) and frontend (smaller).
-- Pools start SUSPENDED and become ACTIVE when a service is deployed.
-- ⚠  Billing starts when a service is created — even when idle.
--    SUSPEND services when not in use to save cost.

CREATE COMPUTE POOL IF NOT EXISTS tasty_app_backend_compute_pool_[user]
  MIN_NODES       = 1
  MAX_NODES       = 1
  INSTANCE_FAMILY = CPU_X64_S;

CREATE COMPUTE POOL IF NOT EXISTS tasty_app_frontend_compute_pool_[user]
  MIN_NODES       = 1
  MAX_NODES       = 1
  INSTANCE_FAMILY = CPU_X64_XS;

GRANT USAGE   ON COMPUTE POOL tasty_app_backend_compute_pool_[user]  TO ROLE tasty_app_admin_role_[user];
GRANT MONITOR ON COMPUTE POOL tasty_app_backend_compute_pool_[user]  TO ROLE tasty_app_admin_role_[user];
GRANT USAGE   ON COMPUTE POOL tasty_app_frontend_compute_pool_[user] TO ROLE tasty_app_admin_role_[user];
GRANT MONITOR ON COMPUTE POOL tasty_app_frontend_compute_pool_[user] TO ROLE tasty_app_admin_role_[user];


-- ── Step 9: Security Integration for public endpoints ────────────────────────
-- ⚠  IMPORTANT: This step requires SNOWSERVICES_INGRESS to be enabled
--    on your Snowflake account by Snowflake Support.
--    If this fails with "Object does not exist", open a support case:
--    "Please enable SNOWSERVICES_INGRESS on account <your_account>"
--
-- Skip this step if you are using internal-only endpoints (public: false).

CREATE SECURITY INTEGRATION IF NOT EXISTS "Application Authentication"
  TYPE         = OAUTH
  OAUTH_CLIENT = SNOWSERVICES_INGRESS
  ENABLED      = TRUE;


-- ── Step 10: Image repository ─────────────────────────────────────────────────

USE ROLE tasty_app_admin_role_[user];
USE DATABASE frostbyte_tasty_bytes_[user];
USE SCHEMA   app;

CREATE OR REPLACE IMAGE REPOSITORY tasty_app_repository_[user];

-- Get the repository URL — you need this for build-and-push.sh
SHOW IMAGE REPOSITORIES;
-- Copy the repository_url value. It looks like:
-- <org>-<account>.registry.snowflakecomputing.com/frostbyte_tasty_bytes_[user]/app/tasty_app_repository_[user]


-- ── Step 11: Build and push Docker images ────────────────────────────────────
-- From your terminal, with Docker running:
--
--   export REPO_URL=<repository_url from above>
--   export ADMIN_USER=<your_snowflake_username>
--
-- ⚠  If your account enforces MFA, docker login with password will fail.
--    Use Snowflake CLI instead:
--
--   pip3 install snowflake-cli-labs
--   snow connection add --connection-name spcs \
--     --account <your_account> \
--     --user <your_username> \
--     --authenticator SNOWFLAKE_JWT \
--     --private-key /path/to/rsa_key.p8
--
--   Then update build-and-push.sh to use:
--   snow spcs image-registry login --connection spcs
--
--   bash build-and-push.sh
--
-- After pushing, verify images are in the registry:
CALL SYSTEM$REGISTRY_LIST_IMAGES('/frostbyte_tasty_bytes_[user]/app/tasty_app_repository_[user]');
-- Should return: {"images":["backend_service_image","frontend_service_image","router_service_image"]}


-- ── Step 12: Create services ──────────────────────────────────────────────────
-- Replace <REPO_URL> with the full repository_url from Step 10.
--
-- ⚠  Important notes:
--   - Use public: true only if SNOWSERVICES_INGRESS is enabled (Step 9)
--   - Use public: false for internal-only access
--   - The BACKEND_SERVICE name in the router env must match the actual
--     service DNS name: <service_name_with_dashes>:<port>
--     e.g. backend-service-[user]:3000 (underscores become dashes in DNS)
--   - Generate random strings for ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET

USE ROLE tasty_app_admin_role_[user];
USE DATABASE frostbyte_tasty_bytes_[user];
USE SCHEMA app;

CREATE SERVICE backend_service_[user]
  IN COMPUTE POOL tasty_app_backend_compute_pool_[user]
  FROM SPECIFICATION $$
  spec:
    container:
    - name: backend
      image: <REPO_URL>/backend_service_image:latest
      env:
        PORT:                   3000
        SNOWFLAKE_WAREHOUSE:    TASTY_APP_WAREHOUSE_[user]
        SNOWFLAKE_DATABASE:     FROSTBYTE_TASTY_BYTES_[user]
        SNOWFLAKE_SCHEMA:       APP
        CLIENT_VALIDATION:      Snowflake
        ACCESS_TOKEN_SECRET:    replace_with_random_string
        REFRESH_TOKEN_SECRET:   replace_with_another_random_string
    endpoint:
    - name: apiendpoint
      port: 3000
      public: true
  $$
  MIN_INSTANCES=1
  MAX_INSTANCES=1;

GRANT USAGE ON SERVICE backend_service_[user] TO ROLE tasty_app_ext_role_[user];

CREATE SERVICE frontend_service_[user]
  IN COMPUTE POOL tasty_app_frontend_compute_pool_[user]
  FROM SPECIFICATION $$
  spec:
    container:
    - name: frontend
      image: <REPO_URL>/frontend_service_image:latest
      env:
        PORT:                          4000
        FRONTEND_SERVICE_PORT:         4000
        REACT_APP_BACKEND_SERVICE_URL: /api
        REACT_APP_CLIENT_VALIDATION:   Snowflake
    - name: router
      image: <REPO_URL>/router_service_image:latest
      env:
        FRONTEND_SERVICE: localhost:4000
        BACKEND_SERVICE:  backend-service-[user]:3000
    endpoint:
    - name: routerendpoint
      port: 8000
      public: true
  $$
  MIN_INSTANCES=1
  MAX_INSTANCES=1;

GRANT USAGE ON SERVICE frontend_service_[user] TO ROLE tasty_app_ext_role_[user];
GRANT SERVICE ROLE backend_service_[user]!ALL_ENDPOINTS_USAGE  TO ROLE tasty_app_ext_role_[user];
GRANT SERVICE ROLE frontend_service_[user]!ALL_ENDPOINTS_USAGE TO ROLE tasty_app_ext_role_[user];


-- ── Step 13: Monitor services ─────────────────────────────────────────────────

SELECT SYSTEM$GET_SERVICE_STATUS('backend_service_[user]');
SELECT SYSTEM$GET_SERVICE_STATUS('frontend_service_[user]');

-- Check logs (useful when status is FAILED)
CALL SYSTEM$GET_SERVICE_LOGS('backend_service_[user]',  '0', 'backend',  100);
CALL SYSTEM$GET_SERVICE_LOGS('frontend_service_[user]', '0', 'frontend', 50);
CALL SYSTEM$GET_SERVICE_LOGS('frontend_service_[user]', '0', 'router',   50);

-- Get the public URL (copy ingress_url)
SHOW ENDPOINTS IN SERVICE frontend_service_[user];


-- ── Step 14: Updating services after a new image push ────────────────────────
-- ⚠  IMPORTANT: SUSPEND/RESUME does NOT pull new images.
--    You must DROP and recreate the service to pick up a new image.
--
-- DROP SERVICE backend_service_[user];
-- Then re-run the CREATE SERVICE statement from Step 12.
-- Re-run the GRANT statements too.


-- ── Step 15: Cost management ──────────────────────────────────────────────────
-- Compute pools bill per node per second — even when idle.
-- Suspend services when not in use (e.g. overnight, weekends):

-- ALTER SERVICE backend_service_[user]  SUSPEND;
-- ALTER SERVICE frontend_service_[user] SUSPEND;

-- Resume before interns use the app:
-- ALTER SERVICE backend_service_[user]  RESUME;
-- ALTER SERVICE frontend_service_[user] RESUME;

-- ⚠  The public URL (ingress_url) may change after SUSPEND/RESUME.
--    Always run SHOW ENDPOINTS after resuming to verify the URL.


-- ── Step 16: Cleanup (run when done) ─────────────────────────────────────────
-- DROP SERVICE  backend_service_[user];
-- DROP SERVICE  frontend_service_[user];
-- DROP COMPUTE POOL tasty_app_backend_compute_pool_[user];
-- DROP COMPUTE POOL tasty_app_frontend_compute_pool_[user];
-- DROP WAREHOUSE LOAD_WH_[user];
-- DROP WAREHOUSE QUERY_WH_[user];
-- DROP WAREHOUSE TASTY_APP_WAREHOUSE_[user];
-- DROP IMAGE REPOSITORY TASTY_APP_REPOSITORY_[user];
-- DROP DATABASE FROSTBYTE_TASTY_BYTES_[user];
-- DROP ROLE TASTY_APP_ADMIN_ROLE_[user];
-- DROP ROLE TASTY_APP_EXT_ROLE_[user];
-- DROP USER INTERN_GROUP1;
-- DROP USER INTERN_GROUP2;
-- DROP USER INTERN_GROUP3;
-- DROP USER INTERN_GROUP4;
-- DROP USER INTERN_GROUP5;
-- DROP USER INTERN_GROUP6;

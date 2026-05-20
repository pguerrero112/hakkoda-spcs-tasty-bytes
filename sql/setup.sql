-- ══════════════════════════════════════════════════════════════════════════════
-- Tasty Bytes SPCS — Full Snowflake Setup Script
-- Hakkoda Capstone Project
--
-- Instructions:
--   1. Replace every [user] with your assigned username (e.g., jdoe → _jdoe)
--   2. Run this entire script as the ACCOUNTADMIN or app_dev_spcs_workshop role
--   3. Steps are labeled — run them in order
--
-- ⚠  Steps marked ACCOUNT-LEVEL require ACCOUNTADMIN.
--    In a shared lab environment, ask your instructor — they may already be done.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Step 1: Role and context ───────────────────────────────────────────────
USE ROLE app_dev_spcs_workshop;


-- ── Step 2: Warehouses ────────────────────────────────────────────────────
-- Query warehouse (medium — for exploration and general use)
CREATE OR REPLACE WAREHOUSE query_wh_[user] WITH
  WAREHOUSE_SIZE  = 'MEDIUM'
  WAREHOUSE_TYPE  = 'STANDARD'
  AUTO_SUSPEND    = 300
  AUTO_RESUME     = TRUE;

-- Load warehouse (large — for ingesting data from S3)
CREATE OR REPLACE WAREHOUSE load_wh_[user] WITH
  WAREHOUSE_SIZE  = 'LARGE'
  WAREHOUSE_TYPE  = 'STANDARD'
  AUTO_SUSPEND    = 300
  AUTO_RESUME     = TRUE;

-- App warehouse (x-small — used at runtime by the backend service)
CREATE OR REPLACE WAREHOUSE tasty_app_warehouse_[user] WITH
  WAREHOUSE_SIZE  = 'X-SMALL'
  WAREHOUSE_TYPE  = 'STANDARD'
  AUTO_SUSPEND    = 180
  AUTO_RESUME     = TRUE
  INITIALLY_SUSPENDED = FALSE;


-- ── Step 3: Database and schema ──────────────────────────────────────────
CREATE OR REPLACE DATABASE frostbyte_tasty_bytes_[user];
CREATE OR REPLACE SCHEMA   frostbyte_tasty_bytes_[user].app;

USE DATABASE frostbyte_tasty_bytes_[user];
USE SCHEMA   app;


-- ── Step 4: Orders table ─────────────────────────────────────────────────
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


-- ── Step 5: Load data from S3 ────────────────────────────────────────────
-- Note: data covers 2022-01-01 to 2022-10-31
USE WAREHOUSE load_wh_[user];

CREATE OR REPLACE STAGE tasty_bytes_app_stage_[user]
  URL = 's3://sfquickstarts/frostbyte_tastybytes/app/orders/';

COPY INTO orders FROM @tasty_bytes_app_stage_[user];

-- Verify load
USE WAREHOUSE query_wh_[user];
SELECT COUNT(*) FROM orders;  -- Should be ~1M+ rows


-- ── Step 6: Users table and seed data ────────────────────────────────────
CREATE OR REPLACE TABLE users (
  user_id         NUMBER(38,0) AUTOINCREMENT,
  user_name       VARCHAR      NOT NULL,
  hashed_password VARCHAR,
  franchise_id    NUMBER(38,0),
  password_date   TIMESTAMP_NTZ(9),
  status          BOOLEAN,
  UNIQUE (user_name)
);

-- Seed users (bcrypt hashes of: password1, password120, password271)
INSERT INTO users VALUES
  (1, 'user1_[user]',  '$2b$10$v0IoU/pokkiM13e.eayf1u3DkgtIBMGO1uRO2O.mlb2K2cLztV5vy', 1,   CURRENT_TIMESTAMP, TRUE),
  (2, 'user2_[user]',  '$2b$10$e2TXM/kLlazbH1xl31SeOe6RTyfL3E9mE8sZZsU33AE52rO.u44JC', 120, CURRENT_TIMESTAMP, TRUE),
  (3, 'user3_[user]',  '$2b$10$WX4e1LAC.rAabBJV58RuKerEK4T/U4htgXrmedTa5oiGCWIRHwe0e', 271, CURRENT_TIMESTAMP, TRUE);


-- ── Step 7: Admin role and permissions ───────────────────────────────────
CREATE ROLE tasty_app_admin_role_[user];

GRANT ALL   ON DATABASE  frostbyte_tasty_bytes_[user]          TO ROLE tasty_app_admin_role_[user];
GRANT ALL   ON SCHEMA    frostbyte_tasty_bytes_[user].app       TO ROLE tasty_app_admin_role_[user];
GRANT SELECT ON ALL TABLES    IN SCHEMA frostbyte_tasty_bytes_[user].app TO ROLE tasty_app_admin_role_[user];
GRANT SELECT ON FUTURE TABLES IN SCHEMA frostbyte_tasty_bytes_[user].app TO ROLE tasty_app_admin_role_[user];
GRANT ALL   ON WAREHOUSE tasty_app_warehouse_[user]             TO ROLE tasty_app_admin_role_[user];

-- Grant admin role to current user
SET sql = ('GRANT ROLE tasty_app_admin_role_[user] TO USER ' || CURRENT_USER() || '');
EXECUTE IMMEDIATE $sql;

-- Allow services to bind public endpoints
GRANT BIND SERVICE ENDPOINT ON ACCOUNT TO ROLE tasty_app_admin_role_[user];

USE ROLE tasty_app_admin_role_[user];


-- ── Step 8: External user role ───────────────────────────────────────────
USE ROLE app_dev_spcs_workshop;

CREATE ROLE tasty_app_ext_role_[user];
GRANT USAGE ON DATABASE frostbyte_tasty_bytes_[user] TO ROLE tasty_app_ext_role_[user];
GRANT USAGE ON SCHEMA   frostbyte_tasty_bytes_[user].app TO ROLE tasty_app_ext_role_[user];

-- Create Snowflake users for SPCS OAuth login
CREATE USER IF NOT EXISTS user1_[user] PASSWORD='password1'   MUST_CHANGE_PASSWORD=FALSE DEFAULT_ROLE=tasty_app_ext_role_[user];
CREATE USER IF NOT EXISTS user2_[user] PASSWORD='password120' MUST_CHANGE_PASSWORD=FALSE DEFAULT_ROLE=tasty_app_ext_role_[user];
CREATE USER IF NOT EXISTS user3_[user] PASSWORD='password271' MUST_CHANGE_PASSWORD=FALSE DEFAULT_ROLE=tasty_app_ext_role_[user];

GRANT ROLE tasty_app_ext_role_[user] TO USER user1_[user];
GRANT ROLE tasty_app_ext_role_[user] TO USER user2_[user];
GRANT ROLE tasty_app_ext_role_[user] TO USER user3_[user];


-- ── Step 9: Compute pools ─────────────────────────────────────────────────
-- ⚠ ACCOUNT-LEVEL: ask instructor if you get a permissions error
CREATE COMPUTE POOL tasty_app_backend_compute_pool_[user]
  MIN_NODES       = 1
  MAX_NODES       = 1
  INSTANCE_FAMILY = CPU_X64_S;

CREATE COMPUTE POOL tasty_app_frontend_compute_pool_[user]
  MIN_NODES       = 1
  MAX_NODES       = 1
  INSTANCE_FAMILY = CPU_X64_XS;

GRANT USAGE   ON COMPUTE POOL tasty_app_backend_compute_pool_[user]  TO ROLE tasty_app_admin_role_[user];
GRANT MONITOR ON COMPUTE POOL tasty_app_backend_compute_pool_[user]  TO ROLE tasty_app_admin_role_[user];
GRANT USAGE   ON COMPUTE POOL tasty_app_frontend_compute_pool_[user] TO ROLE tasty_app_admin_role_[user];
GRANT MONITOR ON COMPUTE POOL tasty_app_frontend_compute_pool_[user] TO ROLE tasty_app_admin_role_[user];


-- ── Step 10: Security integration ────────────────────────────────────────
-- ⚠ ACCOUNT-LEVEL — one per account, may already exist in lab environments
-- CREATE SECURITY INTEGRATION "Application Authentication"
--   TYPE        = OAUTH
--   OAUTH_CLIENT = SNOWSERVICES_INGRESS
--   ENABLED     = TRUE;
-- GRANT OWNERSHIP ON INTEGRATION "Application Authentication" TO ROLE tasty_app_admin_role_[user] REVOKE CURRENT GRANTS;


-- ── Step 11: Image repository ─────────────────────────────────────────────
USE ROLE tasty_app_admin_role_[user];
USE DATABASE frostbyte_tasty_bytes_[user];
USE SCHEMA   app;

CREATE OR REPLACE IMAGE REPOSITORY tasty_app_repository_[user];
SHOW IMAGE REPOSITORIES;  -- Copy the repository_url from this output

-- Stage for service spec files (optional — we use inline specs in Step 13)
CREATE STAGE tasty_app_stage_[user] DIRECTORY = (ENABLE = TRUE);


-- ── Step 12: Verify images were pushed ───────────────────────────────────
-- Run this AFTER running build-and-push.sh from your terminal
-- CALL SYSTEM$REGISTRY_LIST_IMAGES('/frostbyte_tasty_bytes_[user]/app/tasty_app_repository_[user]');


-- ── Step 13: Create services ──────────────────────────────────────────────
-- Replace <REPO_URL> with the repository_url from Step 11

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
  MIN_INSTANCES = 1
  MAX_INSTANCES = 1;

GRANT USAGE ON SERVICE backend_service_[user] TO ROLE tasty_app_ext_role_[user];

CREATE SERVICE frontend_service_[user]
  IN COMPUTE POOL tasty_app_frontend_compute_pool_[user]
  FROM SPECIFICATION $$
  spec:
    container:
    - name: frontend
      image: <REPO_URL>/frontend_service_image:latest
      env:
        PORT:                            4000
        FRONTEND_SERVICE_PORT:           4000
        REACT_APP_BACKEND_SERVICE_URL:   /api
        REACT_APP_CLIENT_VALIDATION:     Snowflake
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
  MIN_INSTANCES = 1
  MAX_INSTANCES = 1;

GRANT USAGE ON SERVICE frontend_service_[user] TO ROLE tasty_app_ext_role_[user];

-- Grant endpoint access
GRANT SERVICE ROLE backend_service_[user]!ALL_ENDPOINTS_USAGE  TO ROLE tasty_app_ext_role_[user];
GRANT SERVICE ROLE frontend_service_[user]!ALL_ENDPOINTS_USAGE TO ROLE tasty_app_ext_role_[user];


-- ── Step 14: Monitor services ─────────────────────────────────────────────
SELECT SYSTEM$GET_SERVICE_STATUS('backend_service_[user]');
SELECT SYSTEM$GET_SERVICE_STATUS('frontend_service_[user]');

CALL SYSTEM$GET_SERVICE_LOGS('backend_service_[user]',  '0', 'backend',  50);
CALL SYSTEM$GET_SERVICE_LOGS('frontend_service_[user]', '0', 'frontend', 50);
CALL SYSTEM$GET_SERVICE_LOGS('frontend_service_[user]', '0', 'router',   50);

-- Get public URL
SHOW ENDPOINTS IN SERVICE frontend_service_[user];


-- ── Step 15: Cleanup (run when done) ─────────────────────────────────────
-- DROP SERVICE  BACKEND_SERVICE_[user];
-- DROP SERVICE  FRONTEND_SERVICE_[user];
-- DROP COMPUTE POOL TASTY_APP_BACKEND_COMPUTE_POOL_[user];
-- DROP COMPUTE POOL TASTY_APP_FRONTEND_COMPUTE_POOL_[user];
-- DROP WAREHOUSE LOAD_WH_[user];
-- DROP WAREHOUSE QUERY_WH_[user];
-- DROP WAREHOUSE TASTY_APP_WAREHOUSE_[user];
-- DROP IMAGE REPOSITORY TASTY_APP_REPOSITORY_[user];
-- DROP DATABASE FROSTBYTE_TASTY_BYTES_[user];
-- DROP ROLE TASTY_APP_ADMIN_ROLE_[user];
-- DROP ROLE TASTY_APP_EXT_ROLE_[user];
-- DROP USER USER1_[user];
-- DROP USER USER2_[user];
-- DROP USER USER3_[user];

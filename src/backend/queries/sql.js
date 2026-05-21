// All SQL queries used by the API.
// Parameterized with positional binds (:1, :2, :3) for the Snowflake Node.js SDK.

module.exports = {

  // ── Franchise ───────────────────────────────────────────────────────────────

  // Returns the date range and truck brands available for a franchise
  franchise_summary: `
    SELECT
      ARRAY_AGG(DISTINCT truck_brand_name) AS truck_brand_names,
      MIN(DATE(order_ts))::VARCHAR         AS start_date,
      MAX(DATE(order_ts))::VARCHAR         AS end_date
    FROM app.orders
    WHERE franchise_id = :1
  `,

  // Top 10 countries by revenue for a franchise in a date window
  top_countries: `
    SELECT
      TOP 10
      country,
      SUM(price) AS revenue
    FROM app.orders
    WHERE franchise_id   = :1
      AND DATE(order_ts) >= :2
      AND DATE(order_ts) <= :3
    GROUP BY country
    ORDER BY revenue DESC
  `,

  // Top 10 truck brands by revenue for a franchise in a date window
  top_trucks: `
    SELECT
      TOP 10
      truck_brand_name,
      SUM(price) AS revenue
    FROM app.orders
    WHERE franchise_id   = :1
      AND DATE(order_ts) >= :2
      AND DATE(order_ts) <= :3
    GROUP BY truck_brand_name
    ORDER BY revenue DESC
  `,

  // YTD monthly revenue per country for a franchise
  ytd_revenue: `
    SELECT
      country,
      MONTH(order_ts)  AS month_num,
      MONTHNAME(order_ts) AS month_name,
      SUM(price)       AS revenue
    FROM app.orders
    WHERE franchise_id = :1
      AND YEAR(order_ts) = 2022
    GROUP BY country, MONTH(order_ts), MONTHNAME(order_ts)
    ORDER BY month_num
  `,

  // ── Trucks ──────────────────────────────────────────────────────────────────

  // Sales by day of week for a specific truck brand + franchise
  sales_by_dow: `
    SELECT
      DAYOFWEEK(order_ts)     AS dow_num,
      DAYNAME(order_ts)       AS day_name,
      SUM(price)              AS revenue,
      COUNT(DISTINCT order_id) AS order_count
    FROM app.orders
    WHERE franchise_id    = :1
      AND truck_brand_name = :2
      AND DATE(order_ts)  >= :3
      AND DATE(order_ts)  <= :4
    GROUP BY DAYOFWEEK(order_ts), DAYNAME(order_ts)
    ORDER BY dow_num
  `,

  // Top 10 selling menu items for a truck brand + franchise
  top_items: `
    SELECT
      TOP 10
      menu_item_name,
      SUM(quantity) AS units_sold,
      SUM(price)    AS revenue
    FROM app.orders
    WHERE franchise_id    = :1
      AND truck_brand_name = :2
      AND DATE(order_ts)  >= :3
      AND DATE(order_ts)  <= :4
    GROUP BY menu_item_name
    ORDER BY revenue DESC
  `,

  // Top items broken down by day of week (heatmap data)
  items_by_dow: `
    SELECT
      menu_item_name,
      DAYNAME(order_ts) AS day_name,
      SUM(quantity)     AS units_sold
    FROM app.orders
    WHERE franchise_id    = :1
      AND truck_brand_name = :2
      AND DATE(order_ts)  >= :3
      AND DATE(order_ts)  <= :4
    GROUP BY menu_item_name, DAYNAME(order_ts)
    ORDER BY units_sold DESC
  `,

  // ── Cities (Hakkoda addition — not in Snowflake quickstart) ────────────────

  // Top cities by revenue for a franchise in a date window
  top_cities: `
    SELECT
      TOP 15
      primary_city                AS city,
      country,
      SUM(price)                  AS revenue,
      COUNT(DISTINCT order_id)    AS order_count,
      COUNT(DISTINCT truck_id)    AS active_trucks
    FROM app.orders
    WHERE franchise_id   = :1
      AND DATE(order_ts) >= :2
      AND DATE(order_ts) <= :3
    GROUP BY primary_city, country
    ORDER BY revenue DESC
  `,

  // Revenue trend by city over time (monthly) for a franchise
  city_revenue_trend: `
    SELECT
      primary_city                    AS city,
      MONTH(order_ts)                 AS month_num,
      MONTHNAME(order_ts)             AS month_name,
      SUM(price)                      AS revenue
    FROM app.orders
    WHERE franchise_id    = :1
      AND primary_city    = :2
      AND YEAR(order_ts)  = 2022
    GROUP BY primary_city, MONTH(order_ts), MONTHNAME(order_ts)
    ORDER BY month_num
  `,

  // ── Auth ────────────────────────────────────────────────────────────────────

  verify_user: `
    SELECT user_name, franchise_id, hashed_password
    FROM   users
    WHERE  UPPER(user_name) = UPPER(:1)
      AND  status = TRUE
  `,
};

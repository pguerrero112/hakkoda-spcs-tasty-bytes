const snowflake = require('snowflake-sdk');
const fs        = require('fs');

let connection = null;

function buildOptions() {
  const base = {
    database:  process.env.SNOWFLAKE_DATABASE,
    schema:    process.env.SNOWFLAKE_SCHEMA,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  };

  // When running inside SPCS, Snowflake mounts an OAuth token at this path.
  // No username or password needed — the service connects as its owner role.
  if (fs.existsSync('/snowflake/session/token')) {
    return {
      ...base,
      token:         fs.readFileSync('/snowflake/session/token', 'ascii'),
      authenticator: 'OAUTH',
      account:       process.env.SNOWFLAKE_ACCOUNT,
      accessUrl:     `https://${process.env.SNOWFLAKE_HOST}`,
    };
  }

  // Local development — use username/password from .env
  return {
    ...base,
    account:  process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    role:     process.env.SNOWFLAKE_ROLE,
  };
}

function getConnection() {
  return new Promise((resolve, reject) => {
    if (connection && connection.isUp()) {
      return resolve(connection);
    }

    console.log('Creating new Snowflake connection...');
    const conn = snowflake.createConnection(buildOptions());

    conn.connect((err, conn) => {
      if (err) {
        console.error('Snowflake connection error:', err.message);
        return reject(err);
      }
      connection = conn;
      console.log('Snowflake connected successfully.');
      resolve(connection);
    });
  });
}

module.exports = { getConnection };

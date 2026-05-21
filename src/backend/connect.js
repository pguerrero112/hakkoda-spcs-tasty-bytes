const snowflake = require('snowflake-sdk');
const fs        = require('fs');

let connection = null;

function buildOptions() {
  const base = {
    database:  process.env.SNOWFLAKE_DATABASE,
    schema:    process.env.SNOWFLAKE_SCHEMA,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  };

  // SPCS mode — OAuth token mounted automatically
  if (fs.existsSync('/snowflake/session/token')) {
    return {
      ...base,
      token:         fs.readFileSync('/snowflake/session/token', 'ascii'),
      authenticator: 'OAUTH',
      account:       process.env.SNOWFLAKE_ACCOUNT,
      accessUrl:     `https://${process.env.SNOWFLAKE_HOST}`,
    };
  }

  // Local development — keypair authentication
  const privateKey = fs.readFileSync(process.env.SNOWFLAKE_PRIVATE_KEY_PATH, 'utf8');
  return {
    ...base,
    account:       process.env.SNOWFLAKE_ACCOUNT,
    username:      process.env.SNOWFLAKE_USERNAME,
    authenticator: 'SNOWFLAKE_JWT',
    privateKey:    privateKey,
    role:          process.env.SNOWFLAKE_ROLE,
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

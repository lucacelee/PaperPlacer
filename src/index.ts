import mariadb from 'mariadb';
require('dotenv').config()

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  trace: true     // Development only!
});

async function connect() {
  const conn = await pool.getConnection();
  try {
    await conn.query("USE paperplacer;");
  } finally {
    conn.end();
  }
}

try {
  connect();
} catch (error) {
  console.log("Failed to connect to MariaDB. Error:\n" + error);
}


// End
import mariadb from 'mariadb';
require('dotenv').config()

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  trace: true     // Development only!
});

async function setup() {
  const conn = await pool.getConnection();
  try {
    let table = await pool.query("CREATE TABLE IF NOT EXISTS ppindex (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, section TINYTEXT CHARACTER SET utf8 NOT NULL);");
    console.log(table);
  } finally {
    conn.end();
  }
}

try {
  setup();
} catch (error) {
  console.log("Failed to connect to MariaDB. Error:\n" + error);
}


// End
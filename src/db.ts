import mariadb from 'mariadb';
require('dotenv').config()

export class db {
    pool = mariadb.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      trace: true     // Development only!
    });

    async setup () {
        const conn = await this.pool.getConnection();
        try {
            let table = await this.pool.query("CREATE TABLE IF NOT EXISTS ppindex (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, section TINYTEXT CHARACTER SET utf8 NOT NULL);");
            console.log(table);
        } finally {
            conn.end();
        }
    }
}
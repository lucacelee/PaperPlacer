import mariadb from 'mariadb';
import 'dotenv/config';

export class db {
    pool = mariadb.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      permitLocalInfile: true,
      trace: true     // Development only!
    });

    async setup () {
        const conn = await this.pool.getConnection();
        try {
            let table = await this.pool.query("CREATE TABLE IF NOT EXISTS ppindex (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, section TINYTEXT CHARACTER SET utf8 NOT NULL);");
            console.log(table);
        } finally {
            conn.release();
        }
    }

    async importFile (filepath: string) {
        const conn = await this.pool.getConnection();
        console.log(`The path to the imported .csv is ${filepath}`);
        let pathComponents:string[] = filepath.split('/');
        let filename:string = pathComponents[pathComponents.length-1];
        let name:string = filename.endsWith(".csv") ? filename.replace(".csv", "") : "";
        console.log(`The file name is ${name}`);
        conn.query(`INSERT INTO ppindex SET section = '${name}'`);
        await conn.query(`CREATE TABLE IF NOT EXISTS ${name} (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(511) CHARACTER SET utf8mb4, mime TINYTEXT CHARACTER SET ascii, url VARCHAR(2048) CHARACTER SET ascii, transcript LONGTEXT CHARACTER SET utf8mb4, iscategory BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY (id), UNIQUE KEY link (url));`);
        await conn.query(`LOAD DATA LOCAL INFILE '${filepath}' INTO TABLE ${name} IGNORE 1 LINES (name, mime, url, transcript) SET iscategory = IF(mime = 'category', TRUE, FALSE)`);
        await conn.query(`CREATE FULLTEXT INDEX transcript_index ON ${name} (transcript)`);
        conn.release();
    }
}
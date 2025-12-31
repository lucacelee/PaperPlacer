import mariadb from 'mariadb';
import 'dotenv/config';

export class db {
    static pool = mariadb.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      permitLocalInfile: true,
      trace: true     // Development only!
    });

    async setup () {
        let table = await db.pool.query("CREATE TABLE IF NOT EXISTS ppindex (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, section TINYTEXT CHARACTER SET utf8 NOT NULL);");
        console.log(table);
    }

    async importFile (filepath: string) {
        const conn = await db.pool.getConnection();
        console.log(`The path to the imported .csv is ${filepath}`);
        let pathComponents:string[] = filepath.split('/');
        let filename:string = pathComponents[pathComponents.length-1];
        let name:string = filename.endsWith(".csv") ? filename.replace(".csv", "") : "";
        console.log(`The file name is ${name}`);
        try {
            conn.query(`INSERT INTO ppindex SET section = ?`, [name]);
            await conn.query(`CREATE TABLE IF NOT EXISTS ${conn.escapeId(name)} (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(511) CHARACTER SET utf8mb4, mime TINYTEXT CHARACTER SET ascii, url VARCHAR(2048) CHARACTER SET ascii, transcript LONGTEXT CHARACTER SET utf8mb4, iscategory BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY (id), UNIQUE KEY link (url));`);
            await conn.query(`LOAD DATA LOCAL INFILE ? INTO TABLE ${conn.escapeId(name)} IGNORE 1 LINES (name, mime, url, transcript) SET iscategory = IF(mime = 'category', TRUE, FALSE)`, [filepath]);
            await conn.query(`CREATE FULLTEXT INDEX transcript_index ON ${conn.escapeId(name)} (transcript)`);
        } catch (error) {
            console.error(`Failed to import the file! Error:\n${error}`);
        } finally {
            conn.release();
        }
    }

    async tableExists (table: string): Promise<Boolean> {
        console.log(`Does table ${table} exist?`)
        const rows = await db.pool.query(`SHOW TABLES LIKE ?`, [table]);
        return rows.length > 0;
    }

    async getTableContents (table: string, what: string[]): Promise<Array<Record<string, any>>> {
        console.log(`Table: ${table}, what: ${what}`);
        const selection = what[0] === '*' ? '*' : what.map(columns => db.pool.escapeId(columns)).join(', ');
        const request = await db.pool.query(`SELECT ${selection} FROM ${db.pool.escapeId(table)};`);
        return request as Array<Record<string, any>>;
    }
}
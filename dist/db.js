"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const mariadb_1 = __importDefault(require("mariadb"));
require("dotenv/config");
class db {
    async setup() {
        let table = await db.pool.query("CREATE TABLE IF NOT EXISTS ppindex (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, section TINYTEXT CHARACTER SET utf8 NOT NULL);");
        console.log(table);
    }
    async importFile(filepath) {
        const conn = await db.pool.getConnection();
        console.log(`The path to the imported .csv is ${filepath}`);
        const pathComponents = filepath.split('/');
        const filename = pathComponents[pathComponents.length - 1];
        let name = filename.endsWith(".csv") ? filename.replace(".csv", "") : "";
        if (!db.windowsModeCategoryHandling) {
            name = name.replaceAll('\\', '/');
        }
        else {
            name = name.replaceAll(' in ', '/');
        }
        name = name.endsWith("/index") ? name.replace("/index", "") : name;
        console.log(`The file name is ${name}`);
        try {
            await conn.beginTransaction();
            await this.createMissingEntries(conn, name.split('/'), '', filepath);
            await conn.commit();
        }
        catch (error) {
            await conn.rollback();
            console.error(`Failed to fill in missing data structure. Error:\n${error}`);
        }
        finally {
            conn.release();
        }
    }
    async tableExists(table) {
        console.log(`Does table ${table} exist?`);
        const rows = await db.pool.query(`SHOW TABLES LIKE ?`, [table]);
        return rows.length > 0;
    }
    async createMissingEntries(conn, filepathComponents, previouslyDefinedTables, csvPath) {
        const component = ((previouslyDefinedTables == "") ? '' : previouslyDefinedTables + '/') + filepathComponents[0];
        const exists = await this.tableExistsTransactionally(conn, component);
        if (!exists)
            await conn.query(`CREATE TABLE IF NOT EXISTS ${conn.escapeId(component)} (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(511) CHARACTER SET utf8mb4, mime TINYTEXT CHARACTER SET ascii, url VARCHAR(2048) CHARACTER SET ascii, transcript LONGTEXT CHARACTER SET utf8mb4, iscategory BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY (id), UNIQUE KEY link (url));`);
        if (!await this.rowExistsTransactionally(conn, ((previouslyDefinedTables == "") ? 'ppindex' : previouslyDefinedTables), filepathComponents[0])) {
            if (previouslyDefinedTables == "")
                await conn.query(`INSERT INTO ppindex SET section = ?`, [component]);
            else
                await conn.query(`INSERT INTO ${conn.escapeId(previouslyDefinedTables)} SET name = ?, mime = 'category', url = ?, iscategory = true`, [filepathComponents[0], component]);
        }
        const truncatedFilepathComponents = [...filepathComponents];
        truncatedFilepathComponents.shift();
        if (truncatedFilepathComponents.length > 1)
            await this.createMissingEntries(conn, truncatedFilepathComponents, component, csvPath);
        else
            try {
                await conn.query(`LOAD DATA LOCAL INFILE ? INTO TABLE ${conn.escapeId(component)} IGNORE 1 LINES (name, mime, url, transcript) SET iscategory = IF(mime = 'category', TRUE, FALSE)`, [csvPath]);
                await conn.query(`CREATE FULLTEXT INDEX IF NOT EXISTS transcript_index ON ${conn.escapeId(component)} (transcript)`);
            }
            catch (error) {
                console.error(`Failed to import the file (${component}). Error:\n${error}`);
                throw error;
            }
    }
    async tableExistsTransactionally(conn, table) {
        console.log(`Does table ${table} exist?`);
        const rows = await conn.query(`SHOW TABLES LIKE ?`, [table]);
        return rows.length > 0;
    }
    async rowExistsTransactionally(conn, table, row) {
        const rows = (table == 'ppindex') ? await conn.query(`SELECT section FROM ${conn.escapeId(table)} WHERE section = ?`, [row]) : await conn.query(`SELECT name FROM ${conn.escapeId(table)} WHERE name = ?`, [row]);
        return rows.length > 0;
    }
    async getTableContents(table, what) {
        console.log(`Table: ${table}, what: ${what}`);
        const selection = what[0] === '*' ? '*' : what.map(columns => db.pool.escapeId(columns)).join(', ');
        const request = await db.pool.query(`SELECT ${selection} FROM ${db.pool.escapeId(table)};`);
        return request;
    }
}
exports.db = db;
db.pool = mariadb_1.default.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    permitLocalInfile: true,
    trace: true // Development only!
});
db.windowsModeCategoryHandling = false;
//# sourceMappingURL=db.js.map
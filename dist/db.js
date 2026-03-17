"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const mariadb_1 = __importDefault(require("mariadb"));
require("dotenv/config");
class db {
    constructor() {
        this.windowsModeCategoryHandling = false;
        this.dropList = [];
    }
    async setup() {
        let table = await db.pool.query("CREATE TABLE IF NOT EXISTS ppindex (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, section TINYTEXT CHARACTER SET utf8 NOT NULL);");
        console.log(table);
    }
    async importFile(filepath) {
        const conn = await db.pool.getConnection();
        console.log(`The path to the imported .csv is ${filepath}`);
        const pathComponents = filepath.replace("/index.csv", ".csv").split('/tmp/');
        const filename = pathComponents[pathComponents.length - 1];
        let name = filename.endsWith(".csv") ? filename.replace(".csv", "") : "";
        if (!this.windowsModeCategoryHandling) {
            name = name.replaceAll('\\', '/');
        }
        else {
            name = name.replaceAll(' in ', '/');
        }
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
    async removeCategory(r) {
        if (r.tablename == null || r.password == null)
            return false;
        if (r.tablename == 'ppindex')
            return false;
        if (r.password !== db.adminPassword)
            return false;
        if (!await this.tableExists(r.tablename))
            return false;
        const conn = await db.pool.getConnection();
        console.warn(`REMOVING '${r.tablename}' !!!`);
        let success;
        try {
            await conn.beginTransaction();
            const isRootTable = await this.rowExistsTransactionally(conn, "ppindex", r.tablename);
            await this.dropTable(r.tablename, conn);
            for (let o of this.dropList) {
                console.log(`'${o}' is subject for removal!`);
                if (await this.tableExistsTransactionally(conn, o))
                    await this.dropTable(o, conn);
            }
            if (isRootTable)
                conn.query(`DELETE FROM ppindex WHERE section = ?`, [r.tablename]);
            else {
                const parentTable = r.tablename.split('/')
                    .slice(0, -1)
                    .join('/');
                await conn.query(`DELETE from ${conn.escapeId(parentTable)} WHERE url = ?`, [r.tablename]);
            }
            await conn.commit();
            success = true;
        }
        catch (error) {
            await conn.rollback();
            console.error(`Failed to remove ${r.tablename}. Error:\n${error}`);
            success = false;
        }
        finally {
            conn.release();
        }
        return success;
    }
    async dropTable(table, conn) {
        let internalCategories;
        try {
            internalCategories = await conn.query(`SELECT url FROM ${conn.escapeId(table)} WHERE iscategory = true;`);
        }
        catch (error) {
            console.error(`Couldn't retrieve categories located in ${table}: ${error.message}`);
            internalCategories = [];
        }
        for (let i of internalCategories) {
            if (!await this.tableExistsTransactionally(conn, i.url))
                continue;
            await this.dropTable(i.url, conn);
            this.dropList.push(i.url);
        }
        await conn.query(`DROP TABLE IF EXISTS /*Admin-issued removal*/ ${conn.escapeId(table)}`);
    }
    async tableExists(table) {
        const rows = await db.pool.query(`SHOW TABLES LIKE ?`, [table]);
        const answer = rows.length > 0;
        console.log(`Does table ${table} exist? ${answer}`);
        return answer;
    }
    async createMissingEntries(conn, filepathComponents, previouslyDefinedTables, csvPath) {
        const component = ((previouslyDefinedTables == "") ? '' : previouslyDefinedTables + '/') + filepathComponents[0];
        const exists = await this.tableExistsTransactionally(conn, component);
        console.log(`Creating missing entries: current component is ${component}\n`);
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
        if (truncatedFilepathComponents.length > 0)
            await this.createMissingEntries(conn, truncatedFilepathComponents, component, csvPath);
        else
            try {
                await conn.query(`LOAD DATA LOCAL INFILE ? INTO TABLE ${conn.escapeId(component)} IGNORE 1 LINES (name, mime, @url, transcript) SET url = IF(LOWER(mime) = 'category', CONCAT(?, '/', @url), @url), iscategory = IF(mime = 'category', TRUE, FALSE)`, [csvPath, component]);
                await conn.query(`CREATE FULLTEXT INDEX IF NOT EXISTS transcript_index ON ${conn.escapeId(component)} (name, transcript)`);
            }
            catch (error) {
                console.error(`Failed to import the file (${component}). Error:\n${error}`);
                throw error;
            }
    }
    async tableExistsTransactionally(conn, table) {
        const rows = await conn.query(`SHOW TABLES LIKE ?`, [table]);
        const answer = rows.length > 0;
        console.log(`Does table ${table} exist? ${answer}`);
        return answer;
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
    async searchTable(table, prompt, visited) {
        if (visited.has(table))
            return [];
        visited.add(table);
        let request = await db.pool.query(`SELECT *, MATCH (name, transcript) AGAINST (${db.pool.escape(prompt)}) AS relevance FROM ${db.pool.escapeId(table)} ORDER BY relevance DESC;`);
        const internalCategories = Object.values(await db.pool.query(`SELECT url FROM ${db.pool.escapeId(table)} WHERE iscategory = true`));
        for (let category of internalCategories) {
            try {
                const extraResults = await this.searchTable(category.url, prompt, visited);
                request = request.concat(extraResults);
            }
            catch (error) {
                console.log(`An error occurred while searching:\n${error}`);
            }
        }
        const sortedRequest = request.sort((n1, n2) => n2.relevance - n1.relevance);
        const relevantResults = sortedRequest.filter((result) => result.relevance > 0);
        return relevantResults;
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
db.adminPassword = process.env.PP_ADMIN_PASSWORD ?? "";
db.requireAdminPasswordToUpload = process.env.PP_REQUIRE_ADMIN_PASSWORD_TO_UPLOAD_FILES == "true";
//# sourceMappingURL=db.js.map
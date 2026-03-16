import mariadb from 'mariadb';
import 'dotenv/config';

export class db {
    private static pool = mariadb.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      permitLocalInfile: true,
      trace: true     // Development only!
    });

    public static windowsModeCategoryHandling: boolean = false;
    private static adminPassword: string = process.env.PP_ADMIN_PASSWORD ?? "";
    public static requireAdminPasswordToUpload: boolean = process.env.PP_REQUIRE_ADMIN_PASSWORD_TO_UPLOAD_FILES == "true";

    private dropList: string[] = [];

    public async setup () {
        let table = await db.pool.query("CREATE TABLE IF NOT EXISTS ppindex (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, section TINYTEXT CHARACTER SET utf8 NOT NULL);");
        console.log(table);
    }

    public async importFile (filepath: string) {
        const conn = await db.pool.getConnection();
        console.log(`The path to the imported .csv is ${filepath}`);
        const pathComponents:string[] = filepath.replace("/index.csv", ".csv").split('/tmp/');
        const filename:string = pathComponents[pathComponents.length-1];
        let name: string = filename.endsWith(".csv") ? filename.replace(".csv", "") : "";
        if (!db.windowsModeCategoryHandling) {
            name = name.replaceAll('\\', '/');
        } else {
            name = name.replaceAll(' in ', '/');
        }
        console.log(`The file name is ${name}`);
        try {
            await conn.beginTransaction();
            await this.createMissingEntries(conn, name.split('/'), '', filepath);
            await conn.commit();
        } catch (error) {
            await conn.rollback();
            console.error(`Failed to fill in missing data structure. Error:\n${error}`);
        } finally {
            conn.release();
        }
    }

    public async removeCategory (r: Record<string, any>): Promise<boolean> {
        if (r.tablename == null || r.password == null) return false;
        if (r.password !== db.adminPassword) return false;
        if (!await this.tableExists(r.tablename)) return false;

        const conn = await db.pool.getConnection();
        console.warn(`REMOVING '${r.tablename}' !!!`);

        let success: boolean;
        try {
            await conn.beginTransaction();
            const isRootTable: boolean = await this.rowExistsTransactionally(conn, "ppindex", r.tablename);

            await this.dropTable(r.tablename, conn);

            this.dropList.forEach(async (o) => {
                console.log(`'${o}' is subject for removal!`);
                if (await this.tableExistsTransactionally(conn, o)) this.dropTable(o, conn);
            });

            if (isRootTable) conn.query(`DELETE FROM ppindex WHERE section = ?`, [r.tablename]);
            else {
                const parentTable: string = r.tablename.split('/')
                                                       .slice(0, -1)
                                                       .join('/');
                conn.query(`DELETE from ${conn.escapeId(parentTable)} WHERE url = ?`, [r.tablename]);
            }

            await conn.commit();
            success = true;
        } catch (error) {
            await conn.rollback();
            console.error(`Failed to remove ${r.tablename}. Error:\n${error}`);
            success = false;
        } finally {
            conn.release();
        }
        return success;
    }

    private async dropTable (table: string, conn: mariadb.PoolConnection) {
        const internalCategories: Record<string, any>[] = await conn.query(`SELECT url FROM ${conn.escapeId(table)} WHERE iscategory = true;`);
        for (let i of internalCategories) {
            if (!await this.tableExistsTransactionally(conn, i.url)) continue;
            this.dropTable(i.url, conn);
            this.dropList.push(i.url);
        }
        conn.query(`DROP TABLE IF EXISTS /*Admin-issued removal*/ ${conn.escapeId(table)}`);
    }

    public async tableExists (table: string): Promise<boolean> {
        const rows = await db.pool.query(`SHOW TABLES LIKE ?`, [table]);
        const answer: boolean = rows.length > 0;
        console.log(`Does table ${table} exist? ${answer}`)
        return answer;
    }

    private async createMissingEntries (conn: mariadb.PoolConnection, filepathComponents: string[], previouslyDefinedTables: string, csvPath: string) {
        const component = ((previouslyDefinedTables == "") ? '' : previouslyDefinedTables + '/') + filepathComponents[0];
        const exists = await this.tableExistsTransactionally(conn, component);
        console.log(`Creating missing entries: current component is ${component}\n`);
        if (!exists) await conn.query(`CREATE TABLE IF NOT EXISTS ${conn.escapeId(component)} (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(511) CHARACTER SET utf8mb4, mime TINYTEXT CHARACTER SET ascii, url VARCHAR(2048) CHARACTER SET ascii, transcript LONGTEXT CHARACTER SET utf8mb4, iscategory BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY (id), UNIQUE KEY link (url));`);
        if (!await this.rowExistsTransactionally(conn, ((previouslyDefinedTables == "") ? 'ppindex' : previouslyDefinedTables), filepathComponents[0])) {
            if (previouslyDefinedTables == "") await conn.query(`INSERT INTO ppindex SET section = ?`, [component]);
            else await conn.query(`INSERT INTO ${conn.escapeId(previouslyDefinedTables)} SET name = ?, mime = 'category', url = ?, iscategory = true`, [filepathComponents[0], component]);
        }
        const truncatedFilepathComponents: string[] = [...filepathComponents];
        truncatedFilepathComponents.shift()
        if (truncatedFilepathComponents.length > 0) await this.createMissingEntries(conn, truncatedFilepathComponents, component, csvPath);
        else try {
            await conn.query(`LOAD DATA LOCAL INFILE ? INTO TABLE ${conn.escapeId(component)} IGNORE 1 LINES (name, mime, @url, transcript) SET url = IF(LOWER(mime) = 'category', CONCAT(?, '/', @url), @url), iscategory = IF(mime = 'category', TRUE, FALSE)`, [csvPath, component]);
            await conn.query(`CREATE FULLTEXT INDEX IF NOT EXISTS transcript_index ON ${conn.escapeId(component)} (name, transcript)`);
        } catch (error) {
            console.error(`Failed to import the file (${component}). Error:\n${error}`);
            throw error;
        }
    }

    private async tableExistsTransactionally (conn: mariadb.PoolConnection, table: string): Promise<boolean> {
        const rows = await conn.query(`SHOW TABLES LIKE ?`, [table]);
        const answer: boolean = rows.length > 0;
        console.log(`Does table ${table} exist? ${answer}`)
        return answer;
    }

    private async rowExistsTransactionally (conn: mariadb.PoolConnection, table: string, row: string): Promise<boolean> {
        const rows = (table == 'ppindex') ? await conn.query(`SELECT section FROM ${conn.escapeId(table)} WHERE section = ?`, [row]) : await conn.query(`SELECT name FROM ${conn.escapeId(table)} WHERE name = ?`, [row]);
        return rows.length > 0;
    }

    public async getTableContents (table: string, what: string[]): Promise<Array<Record<string, any>>> {
        console.log(`Table: ${table}, what: ${what}`);
        const selection = what[0] === '*' ? '*' : what.map(columns => db.pool.escapeId(columns)).join(', ');
        const request = await db.pool.query(`SELECT ${selection} FROM ${db.pool.escapeId(table)};`);
        return request as Array<Record<string, any>>;
    }

    public async searchTable (table: string, prompt: string, visited: Set<string>): Promise<Array<Record<string, any>>> {
        if (visited.has(table)) return [];
        visited.add(table);

        let request: Array<Record<string, any>> = await db.pool.query(`SELECT *, MATCH (name, transcript) AGAINST (${db.pool.escape(prompt)}) AS relevance FROM ${db.pool.escapeId(table)} ORDER BY relevance DESC;`);
        const internalCategories: Array<Record<string, any>> = Object.values(await db.pool.query(`SELECT url FROM ${db.pool.escapeId(table)} WHERE iscategory = true`));
        for (let category of internalCategories) {
            try {
                const extraResults: Array<Record<string, any>> = await this.searchTable(category.url, prompt, visited);
                request = request.concat(extraResults);
            } catch (error) {
                console.log(`An error occurred while searching:\n${error}`);
            }
        }
        const sortedRequest: Array<Record<string, any>> = request.sort((n1, n2) => n2.relevance - n1.relevance);
        const relevantResults = sortedRequest.filter((result) => result.relevance > 0);
        return relevantResults as Array<Record<string, any>>;
    }
}
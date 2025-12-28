"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const mariadb_1 = __importDefault(require("mariadb"));
require("dotenv/config");
class db {
    constructor() {
        this.pool = mariadb_1.default.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            permitLocalInfile: true,
            trace: true // Development only!
        });
    }
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            const conn = yield this.pool.getConnection();
            try {
                let table = yield this.pool.query("CREATE TABLE IF NOT EXISTS ppindex (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, section TINYTEXT CHARACTER SET utf8 NOT NULL);");
                console.log(table);
            }
            finally {
                conn.release();
            }
        });
    }
    importFile(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            const conn = yield this.pool.getConnection();
            console.log(`The path to the imported .csv is ${filepath}`);
            let pathComponents = filepath.split('/');
            let filename = pathComponents[pathComponents.length - 1];
            let name = filename.endsWith(".csv") ? filename.replace(".csv", "") : "";
            console.log(`The file name is ${name}`);
            conn.query(`INSERT INTO ppindex SET section = '${name}'`);
            yield conn.query(`CREATE TABLE IF NOT EXISTS ${name} (id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(511) CHARACTER SET utf8mb4, mime TINYTEXT CHARACTER SET ascii, url VARCHAR(2048) CHARACTER SET ascii, transcript LONGTEXT CHARACTER SET utf8mb4, iscategory BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY (id), UNIQUE KEY link (url));`);
            yield conn.query(`LOAD DATA LOCAL INFILE '${filepath}' INTO TABLE ${name} IGNORE 1 LINES (name, mime, url, transcript) SET iscategory = IF(mime = 'category', TRUE, FALSE)`);
            yield conn.query(`CREATE FULLTEXT INDEX transcript_index ON ${name} (transcript)`);
            conn.release();
        });
    }
}
exports.db = db;
//# sourceMappingURL=db.js.map
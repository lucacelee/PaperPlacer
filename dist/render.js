"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlRenderer = void 0;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("./db");
class htmlRenderer {
    constructor() {
        this.templatesPath = node_path_1.default.join(__dirname, "templates");
        this.formatErgex = /<\!--%(?<command>\w+)="(?<argument>.+?)"%-->/g;
    }
    async renderHtml(page) {
        let html = fs_1.default.readFileSync(node_path_1.default.join(this.templatesPath, page), 'utf8');
        return await this.loopRegex(html);
    }
    async loopRegex(html) {
        htmlRenderer.recursionCycles++;
        const match = html.matchAll(this.formatErgex);
        for (const m of match) {
            const command = m.groups?.command;
            const argument = m.groups?.argument;
            if (command == null || argument == null)
                break;
            const thestring = m[0];
            console.log(`\nMatch found: ${thestring}.\nCommand: '${command}', argument: '${argument}'`);
            html = html.replace(thestring, await this.processTags(command, argument));
            htmlRenderer.recursionCycles = 0;
        }
        return html;
    }
    async processTags(command, argument) {
        if (htmlRenderer.recursionCycles > 500)
            return "";
        switch (command) {
            case "include": // Used to include contents of another HTML file, in order to reuse them
                const filepath = node_path_1.default.join(this.templatesPath, argument);
                if (fs_1.default.existsSync(filepath))
                    return await this.loopRegex(fs_1.default.readFileSync(filepath, 'utf8'));
                else
                    return `Error: file '${argument}' could not be found!`;
            case "insert": // Used to insert new HTML tags into the document
                const argparts = argument.split(':'); // When asking for an insert, the argument consists of 3 parts:
                switch (argparts[1]) { // [HTML element(s) : Desired action : Action specific argument]
                    case "db": // db — list from a database
                        const maria = new db_1.db; // [table name] => [select statement]
                        const insertArgs = argparts[2].split("=>");
                        let tempHtml = "";
                        let table = insertArgs[0] === '[[[url]]]' ? "" : insertArgs[0];
                        if (await maria.tableExists(table)) {
                            if (insertArgs[1] === '*') {
                                console.log("Selecting * from table!!!");
                                const trial = maria.getTableContents(insertArgs[0], ['*']);
                                console.log(trial);
                            }
                            else {
                                const sections = await maria.getTableContents(insertArgs[0], insertArgs[1].split(','));
                                for (let s of sections) {
                                    const value = s[insertArgs[1]];
                                    tempHtml += argparts[0].replaceAll("{{_}}", value);
                                }
                                return tempHtml;
                            }
                        }
                        break;
                    case "count":
                        break;
                }
                console.log(argparts);
                break;
            default:
                console.error(`Command ${command} not found.`);
                break;
        }
        return "";
    }
}
exports.htmlRenderer = htmlRenderer;
htmlRenderer.recursionCycles = 0;
//# sourceMappingURL=render.js.map
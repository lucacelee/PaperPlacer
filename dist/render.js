"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderHtml = renderHtml;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("./db");
const templatesPath = node_path_1.default.join(__dirname, "templates");
const formatErgex = /<\!--%(?<command>\w+)="(?<argument>.+?)"%-->/g;
var recursionCycles = 0;
async function renderHtml(page) {
    let html = fs_1.default.readFileSync(node_path_1.default.join(templatesPath, page), 'utf8');
    return await loopRegex(html);
}
async function loopRegex(html) {
    recursionCycles++;
    const match = html.matchAll(formatErgex);
    for (const m of match) {
        const command = m.groups?.command;
        const argument = m.groups?.argument;
        if (command == null || argument == null)
            break;
        const thestring = m[0];
        console.log(`\nMatch found: ${thestring}.\nCommand: '${command}', argument: '${argument}'`);
        html = html.replace(thestring, await processTags(command, argument));
        recursionCycles = 0;
    }
    return html;
}
async function processTags(command, argument) {
    if (recursionCycles > 500)
        return "";
    switch (command) {
        case "include": // Used to include contents of another HTML file, in order to reuse them
            const filepath = node_path_1.default.join(templatesPath, argument);
            if (fs_1.default.existsSync(filepath))
                return await loopRegex(fs_1.default.readFileSync(filepath, 'utf8'));
            else
                return `Error: file '${argument}' could not be found!`;
        case "insert": // Used to insert new HTML tags into the document
            const argparts = argument.split(':'); // When asking for an insert, the argument consists of 3 parts:
            switch (argparts[1]) { // [HTML element(s) : Desired action : Action specific argument]
                case "db": // db — list from a database
                    const maria = new db_1.db; // [table name] => [select statement]
                    const insertArgs = argparts[2].split("=>");
                    let tempHtml = "";
                    if (await maria.tableExists(insertArgs[0])) {
                        if (insertArgs[1] != "*") {
                            let sections = await maria.getTableContents(insertArgs[0], insertArgs[1]);
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
//# sourceMappingURL=render.js.map
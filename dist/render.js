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
        this.insertErgex = /\{\{(\d)\}\}/g;
        this.urlComponents = [];
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
                        let table = insertArgs[0] === '[[[url]]]' ? decodeURIComponent(this.urlComponents[2]) : insertArgs[0];
                        if (await maria.tableExists(table)) {
                            if (insertArgs[1] === '*') {
                                console.log("Selecting * from table!!!");
                                const rows = await maria.getTableContents(table, ['*']);
                                console.log(Object.values(rows));
                                for (let r of rows) {
                                    const fields = Object.values(r);
                                    let text = argparts[0];
                                    if (text.includes("[[mime-thumbnail]]")) {
                                        const thumbnail = this.selectMediaTypeThumbnail(fields[2]);
                                        text = text.replaceAll("[[mime-thumbnail]]", thumbnail);
                                    }
                                    const insertions = text.matchAll(this.insertErgex);
                                    tempHtml += text.replace(this.insertErgex, (_, index) => { return fields[parseInt(index)]; }) + '\n';
                                }
                                return tempHtml;
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
    selectMediaTypeThumbnail(mime) {
        switch (mime) {
            case "application/pdf":
                return "/filetypes/pdf.svg";
            case "application/zip":
                return "/filetypes/zip.svg";
            case "application/mp4":
                return "/filetypes/mp4.svg";
            case "application/octet-stream":
                return "/filetypes/bin.svg";
            case "text/css":
                return "/filetypes/css.svg";
            case "text/html":
                return "/filetypes/html.svg";
            case "text/plain":
                return "/filetypes/txt.svg";
            case "image/png":
                return "/filetypes/png.svg";
            case "image/jpeg":
                return "/filetypes/jpeg.svg";
            case "image/gif":
                return "/filetypes/gif.svg";
            case "image/svg":
                return "/filetypes/svg.svg";
            case "image/svg-xml":
                return "/filetypes/svg.svg";
            case "audio/m4a":
                return "/filetypes/m4a.svg";
            case "audio/mp4":
                return "/filetypes/m4a.svg";
            case "audio/ogg":
                return "/filetypes/opus.svg";
            case "audio/opus":
                return "/filetypes/opus.svg";
            case "audio/vorbis":
                return "/filetypes/vorbis.svg";
            case "video/quicktime":
                return "/filetypes/mov.svg";
            case "video/mp4":
                return "/filetypes/mp4.svg";
            case "audio/mp4":
                return "/filetypes/m4a.svg";
            case "audio/mp3":
                return "/filetypes/mp3.svg";
            case "audio/mpeg":
                return "/filetypes/mp3.svg";
            case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
                return "/filetypes/pptx.svg";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                return "/filetypes/docx.svg";
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                return "/filetypes/xlsx.svg";
            case "category":
                return "/filetypes/oc.svg";
            default:
                return "/filetypes/default.svg";
        }
        return mime;
    }
}
exports.htmlRenderer = htmlRenderer;
htmlRenderer.recursionCycles = 0;
//# sourceMappingURL=render.js.map
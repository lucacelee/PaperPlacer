"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderHtml = renderHtml;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = __importDefault(require("fs"));
const templatesPath = node_path_1.default.join(__dirname, "templates");
const formatErgex = /<\!--%(?<command>\w+)="(?<argument>.+?)"%-->/g;
var recursionCycles = 0;
function renderHtml(page) {
    let html = fs_1.default.readFileSync(node_path_1.default.join(templatesPath, page), 'utf8');
    return loopRegex(html);
}
function loopRegex(html) {
    recursionCycles++;
    const match = html.matchAll(formatErgex);
    console.log(match);
    for (const m of match) {
        const command = m.groups?.command;
        const argument = m.groups?.argument;
        if (command == null || argument == null)
            break;
        const thestring = m[0];
        console.log(`Match found: ${thestring}.\nCommand: '${command}', argument: '${argument}'`);
        html = html.replace(thestring, processTags(command, argument));
        recursionCycles = 0;
    }
    return html;
}
function processTags(command, argument) {
    if (recursionCycles > 500)
        return "";
    switch (command) {
        case "include": // Used to include contents of another HTML file, in order to reuse them
            const filepath = node_path_1.default.join(templatesPath, argument);
            if (fs_1.default.existsSync(filepath))
                return loopRegex(fs_1.default.readFileSync(filepath, 'utf8'));
            else
                return `Error: file '${argument}' could not be found!`;
        case "insert": // Used to insert new HTML tags into the document
            break;
        default:
            console.error(`Command ${command} not found.`);
            break;
    }
    return "";
}
//# sourceMappingURL=render.js.map
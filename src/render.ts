import path from "node:path";
import fs from "fs";

const templatesPath: string = path.join(__dirname, "templates");
const formatErgex: RegExp = /<\!--%(?<command>\w+)="(?<argument>.+?)"%-->/g;
var recursionCycles: number = 0;

export function renderHtml (page: string) {
    let html = fs.readFileSync(path.join(templatesPath, page), 'utf8');
    return loopRegex(html);
}

function loopRegex (html: string): string {
    recursionCycles++;
    const match = html.matchAll(formatErgex);
    console.log(match);
    for (const m of match) {
        const command:string | undefined = m.groups?.command;
        const argument:string | undefined = m.groups?.argument;
        if (command == null || argument == null) break;
        const thestring:string = m[0];
        console.log(`Match found: ${thestring}.\nCommand: '${command}', argument: '${argument}'`)
        html = html.replace(thestring, processTags(command, argument))
        recursionCycles = 0;
    } return html;
}

function processTags (command: string, argument: string): string {
    if (recursionCycles > 500) return "";
    switch (command) {
        case "include":         // Used to include contents of another HTML file, in order to reuse them
            const filepath: string = path.join(templatesPath, argument);
            if (fs.existsSync(filepath)) return loopRegex(fs.readFileSync(filepath, 'utf8'));
            else return `Error: file '${argument}' could not be found!`;
        case "insert":          // Used to insert new HTML tags into the document
            break;
        default:
            console.error(`Command ${command} not found.`);
            break;
    }
    return "";
}


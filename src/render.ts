import path from "node:path";
import fs from "fs";
import { db } from "./db";

const templatesPath: string = path.join(__dirname, "templates");
const formatErgex: RegExp = /<\!--%(?<command>\w+)="(?<argument>.+?)"%-->/g;
var recursionCycles: number = 0;

export async function renderHtml (page: string) {
    let html = fs.readFileSync(path.join(templatesPath, page), 'utf8');
    return await loopRegex(html);
}

async function loopRegex (html: string): Promise<string> {
    recursionCycles++;
    const match = html.matchAll(formatErgex);
    for (const m of match) {
        const command:string | undefined = m.groups?.command;
        const argument:string | undefined = m.groups?.argument;
        if (command == null || argument == null) break;
        const thestring:string = m[0];
        console.log(`\nMatch found: ${thestring}.\nCommand: '${command}', argument: '${argument}'`)
        html = html.replace(thestring, await processTags(command, argument))
        recursionCycles = 0;
    } return html;
}

async function processTags (command: string, argument: string): Promise<string> {
    if (recursionCycles > 500) return "";
    switch (command) {
        case "include":         // Used to include contents of another HTML file, in order to reuse them
            const filepath: string = path.join(templatesPath, argument);
            if (fs.existsSync(filepath)) return await loopRegex(fs.readFileSync(filepath, 'utf8'));
            else return `Error: file '${argument}' could not be found!`;
        case "insert":                                      // Used to insert new HTML tags into the document
            const argparts: string[] = argument.split(':')  // When asking for an insert, the argument consists of 3 parts:
            switch (argparts[1]) {                          // [HTML element(s) : Desired action : Action specific argument]
                case "db":                              // db — list from a database
                    const maria = new db;                                   // [table name] => [select statement]
                    const insertArgs: string[] = argparts[2].split("=>");
                    let tempHtml: string = "";
                    if (await maria.tableExists(insertArgs[0])) {
                        if (insertArgs[1] != "*") {
                            let sections: Array<Record<string, any>> = await maria.getTableContents(insertArgs[0], insertArgs[1]);
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
            console.log(argparts)
            break;
        default:
            console.error(`Command ${command} not found.`);
            break;
    }
    return "";
}


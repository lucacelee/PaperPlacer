import path from "node:path";
import fs from "fs";
import { db } from "./db";

export class htmlRenderer{
    templatesPath: string = path.join(__dirname, "templates");
    formatErgex: RegExp = /<\!--%(?<command>\w+)="(?<argument>.+?)"%-->/g;
    static recursionCycles: number = 0;

    public async renderHtml (page: string) {
        let html = fs.readFileSync(path.join(this.templatesPath, page), 'utf8');
        return await this.loopRegex(html);
    }

    private async loopRegex (html: string): Promise<string> {
        htmlRenderer.recursionCycles++;
        const match = html.matchAll(this.formatErgex);
        for (const m of match) {
            const command:string | undefined = m.groups?.command;
            const argument:string | undefined = m.groups?.argument;
            if (command == null || argument == null) break;
            const thestring:string = m[0];
            console.log(`\nMatch found: ${thestring}.\nCommand: '${command}', argument: '${argument}'`)
            html = html.replace(thestring, await this.processTags(command, argument))
            htmlRenderer.recursionCycles = 0;
        } return html;
    }

    private async processTags (command: string, argument: string): Promise<string> {
        if (htmlRenderer.recursionCycles > 500) return "";
        switch (command) {
            case "include":         // Used to include contents of another HTML file, in order to reuse them
                const filepath: string = path.join(this.templatesPath, argument);
                if (fs.existsSync(filepath)) return await this.loopRegex(fs.readFileSync(filepath, 'utf8'));
                else return `Error: file '${argument}' could not be found!`;
            case "insert":                                      // Used to insert new HTML tags into the document
                const argparts: string[] = argument.split(':')  // When asking for an insert, the argument consists of 3 parts:
                switch (argparts[1]) {                          // [HTML element(s) : Desired action : Action specific argument]
                    case "db":                              // db — list from a database
                        const maria = new db;                                   // [table name] => [select statement]
                        const insertArgs: string[] = argparts[2].split("=>");
                        let tempHtml: string = "";
                        let table: string = insertArgs[0] === '[[[url]]]' ? "" : insertArgs[0];
                        if (await maria.tableExists(table)) {
                            if (insertArgs[1] === '*') {
                                console.log("Selecting * from table!!!");
                                const trial = maria.getTableContents(insertArgs[0], ['*']);
                                console.log(trial);
                            } else {
                                const sections: Array<Record<string, any>> = await maria.getTableContents(insertArgs[0], insertArgs[1].split(','));
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
}


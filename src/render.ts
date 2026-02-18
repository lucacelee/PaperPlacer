import path from "node:path";
import fs from "fs";
import { db } from "./db";

export class htmlRenderer{
    templatesPath: string = path.join(__dirname, "templates");
    formatErgex: RegExp = /<\!--%(?<command>\w+)="(?<argument>.+?)"%-->/g;
    insertErgex: RegExp = /\{\{(\d)\}\}/g;
    searchErgex: RegExp = /\?search=(.+)/;
    urlComponents: string[] = [];
    static recursionCycles: number = 0;

    public async renderHtml (page: string) {
        let html = fs.readFileSync(path.join(this.templatesPath, page), 'utf8');
        console.log('Rendering HTML');
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
            console.log(`\nMatch found: ${thestring}.\nCommand: '${command}', argument: '${argument}'\n`)
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
                        try {
                            return await this.insertFromDatabase(argparts);
                        } catch (error) {
                            console.error(error);
                            break;
                        }
                    case "count":
                        // Maybe add to this later :P
                        break;
                    case "search":
                        try {
                            return await this.searchDatabase(argparts);
                        } catch (error) {
                            break;
                        }
                } break;
            default:
                console.error(`Command ${command} not found.`);
                break;
        }
        return "";
    }

    private async insertFromDatabase(argparts: string[]): Promise<string> {
        const maria = new db;                                   // [table name] => [select statement]
        const insertArgs: string[] = argparts[2].split("=>");
        let tempHtml: string = "";
        let table: string = (insertArgs[0] === '[[url]]') ? decodeURIComponent(this.urlComponents.slice(2, this.urlComponents.length).join('/')) : insertArgs[0];
        
        if (!await maria.tableExists(table)) {
            throw new ReferenceError(`The specified table '${table}' doesn't exist!`);
        }
        var columns: Array<Record<string, any>>
        if (insertArgs[1] !== '*') {
            console.log("Selecting * from table!!!");
            columns = await maria.getTableContents(table, ['*']);
        } else {
            columns = await maria.getTableContents(table, insertArgs[1].split(','));
        }
        let text: string = argparts[0];

        return tempHtml += this.setMimeThumbnails(columns, argparts);
    }

    private async searchDatabase (argparts: string[]): Promise<string> {
        const maria = new db;
        const searchArgs: string[] = argparts[2].split("?");
        const queryArgs: string[] = this.urlComponents[this.urlComponents.length-1].split('=');
        let tmpHtml: string = "";

        const searchTable: string = (searchArgs[0] == "[[url]]") ? decodeURIComponent(queryArgs[0]).replace('?search', '') : searchArgs[0];
        const searchPrompt: string = (searchArgs[1] == "[[query]]") ? decodeURIComponent(queryArgs[1]) : searchArgs[1];

        let results: Record<string, any>[];
        try {
            results = await maria.searchTable(searchTable, searchPrompt, new Set<string>);
        } catch (error) {
            console.warn(`Failed to search for ${searchPrompt} in ${searchTable}.\n${error}`);
            let text: string = argparts[0];
            tmpHtml += text.replace(this.insertErgex, `<h2>No search results!</h2>`)
            throw (error);
        }

        console.log(`\nSearching in ${searchTable} for '${searchPrompt}'.`);

        return tmpHtml += this.setMimeThumbnails(results, argparts);
    }

    private setMimeThumbnails(items: Record<string, any>[], argparts: string[]): string {
        let tmpString: string = '';
        for (const i of items) {
            const fields: string[] = Object.values(i);
            let text: string = argparts[0];
            if (text.includes("[[mime-thumbnail]]")) {
                const thumbnail: string = this.selectMediaTypeThumbnail(fields[2]);
                text = text.replaceAll("[[mime-thumbnail]]", thumbnail);
            }
            tmpString += text.replace(this.insertErgex, (_, index) => {return fields[parseInt(index)]}) + '\n';
        }
        return tmpString;
    }

    private selectMediaTypeThumbnail (mime: string): string {
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
                return "/filetypes/default.svg"
        }
        return mime;
    }
}


import path from "node:path";
import fs from "fs";

const templatesPath: string = path.join(__dirname, "templates");

export function renderHtml (page: string) {
    let html = fs.readFileSync(path.join(templatesPath, page), 'utf8');
    return html;
}
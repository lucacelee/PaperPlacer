import path from "node:path";
import fs from "fs";
import { IncomingMessage, ServerResponse } from "node:http";

export function loadStatic (request: IncomingMessage, response: ServerResponse): Boolean {
    if (!request.url) return false;
    let filepath:string = path.join(__dirname, "../static", decodeURIComponent(request.url));
    if (!fs.existsSync(filepath)) return false;
    var type:string;
    switch (path.extname(filepath)) {
        case ".css":
            type = "text/css";
            break;
        case ".html":
            type = "text/html";
            break;
        case ".js":
            type = "text/javascript";
            break;
        case ".png":
            type = "image/png";
            break;
        case ".jpg":
            type = "image/jpeg";
            break;
        case ".svg":
            type = "image/svg+xml";
            break;
        case ".webp":
            type = "image/webp";
            break;
        case ".ico":
            type = "image/ico";
            break;
        case "":
            return false;
        default:
            console.log(`The file '${request.url}' is of an unsupported type (${path.extname(filepath)}), so it will not be loaded.`);
            return false;
    }
    response.writeHead(200, {'Content-Type': type})
    fs.createReadStream(filepath).pipe(response);
    return true;
}
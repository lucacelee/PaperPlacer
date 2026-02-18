"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serve = serve;
const http_1 = __importDefault(require("http"));
const fs_1 = require("fs");
const node_path_1 = require("node:path");
const render_1 = require("./render");
const static_1 = require("./static");
const db_1 = require("./db");
const catalogues_1 = require("./catalogues");
const renderer = new render_1.htmlRenderer;
const searchErgex = /\?search=(.+)/;
function serve() {
    const server = http_1.default.createServer(async (request, response) => {
        if ((0, static_1.loadStatic)(request, response))
            return;
        console.log(request.method + " " + request.url);
        if (!request.url)
            return;
        let urlStrings;
        renderer.urlComponents = urlStrings = request.url.split('/');
        const htmlName = urlStrings[1] + ".html";
        let filepath = (0, node_path_1.join)(__dirname, "templates", htmlName);
        if (!(0, fs_1.existsSync)(filepath) && request.url != '/') {
            response.writeHead(404);
            response.end(`404: Not found!`);
            return;
        }
        if (request.url == '/upload' && request.method == "POST") {
            const body = [];
            request.on('data', (chunk) => {
                body.push(chunk);
            });
            request.on('end', async () => {
                let success = false;
                try {
                    await importDownload(body);
                    success = true;
                }
                catch (error) {
                    response.writeHead(500);
                    response.end(`<!DOCTYPE html><html><body><h1>HTTP 500</h1><h2>Upload failed!</h2><p>${error}</p></body></html>`);
                }
                if (success) {
                    response.writeHead(200);
                    response.end(await renderer.renderHtml("upload_successfull.html"));
                }
            });
        }
        else if (request.url == "/") {
            response.writeHead(200);
            response.end(await renderer.renderHtml("index.html"));
        }
        else {
            if (searchErgex.test(request.url)) {
                console.log('Someone is searching something!');
                response.writeHead(200);
                response.end(await renderer.renderHtml("search.html"));
            }
            else {
                response.writeHead(200);
                response.end(await renderer.renderHtml(htmlName));
            }
        }
    });
    server.listen(3000);
}
async function importDownload(body) {
    const buffer = Buffer.concat(body);
    const header = buffer.subarray(0, buffer.indexOf('\r\n'));
    const contentStart = buffer.indexOf('\r\n\r\n') + '\r\n\r\n'.length;
    const contentEnd = buffer.lastIndexOf(Buffer.concat([Buffer.from('\r\n'), header]));
    const content = buffer.subarray(contentStart, contentEnd);
    const metadata = buffer.subarray(header.length, contentStart);
    const filenameRegex = /filename="(.+?)"/;
    const bufferFilename = metadata.toString("utf-8").match(filenameRegex);
    const downloadName = (bufferFilename == null) ? "unnamed" : bufferFilename[1];
    const tmpDir = (0, node_path_1.join)(__dirname, "../tmp");
    const downloadPath = (0, node_path_1.join)(tmpDir, downloadName).replace(".oc", ".zip");
    if (!(0, fs_1.existsSync)(tmpDir))
        (0, fs_1.mkdirSync)(tmpDir, { recursive: true });
    (0, fs_1.writeFileSync)(downloadPath, content);
    const maria = new db_1.db;
    if (downloadName.endsWith(".csv"))
        await maria.importFile(downloadPath);
    else if (downloadName.endsWith(".oc"))
        await (0, catalogues_1.processCatalogue)(downloadPath);
    (0, fs_1.rmSync)(downloadPath);
}
//# sourceMappingURL=server.js.map
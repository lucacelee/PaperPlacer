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
function serve() {
    const server = http_1.default.createServer(async (request, response) => {
        if ((0, static_1.loadStatic)(request, response))
            return;
        console.log(request.method + " " + request.url);
        if (request.url) {
            const htmlName = request.url.split('/')[1] + ".html";
            let filepath = (0, node_path_1.join)(__dirname, "templates", htmlName);
            if ((0, fs_1.existsSync)(filepath) || request.url == "/") {
                response.writeHead(200);
                if (request.url == "/upload" && request.method == "POST") {
                    const body = [];
                    request.on('data', (chunk) => {
                        body.push(chunk);
                    });
                    request.on('end', async () => {
                        const buffer = Buffer.concat(body);
                        const header = buffer.subarray(0, buffer.indexOf('\r\n'));
                        const contentStart = buffer.indexOf('\r\n\r\n') + '\r\n\r\n'.length;
                        const contentEnd = buffer.lastIndexOf(Buffer.concat([Buffer.from('\r\n'), header]));
                        const content = buffer.subarray(contentStart, contentEnd);
                        const metadata = buffer.subarray(header.length, contentStart);
                        const filenameRegex = /filename="(.+?)"/;
                        const bufferFilename = metadata.toString("utf-8").match(filenameRegex);
                        const downloadName = (bufferFilename == null) ? "unnamed" : bufferFilename[1];
                        console.log(`\n The filename of the upload is ${downloadName}\n`);
                        (0, fs_1.writeFileSync)((0, node_path_1.join)(__dirname, "../tmp", downloadName), content);
                        response.end(await (0, render_1.renderHtml)("upload_successfull.html"));
                    });
                }
                else if (request.url != "/")
                    response.end(await (0, render_1.renderHtml)(htmlName));
                else
                    response.end(await (0, render_1.renderHtml)("index.html"));
            }
            else {
                response.writeHead(404);
                response.end(`404: Not found!`);
            }
        }
    });
    server.listen(3000);
}
//# sourceMappingURL=server.js.map
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
require("dotenv/config");
const renderer = new render_1.htmlRenderer;
const searchErgex = /\?search=(.+)/;
const maria = new db_1.db;
var windowsUser;
function serve() {
    const server = http_1.default.createServer(async (request, response) => {
        console.debug(`Received a ${request.method} request at ${request.url} from ${request.headers["user-agent"]}`);
        windowsUser = request.headers["user-agent"]?.includes('Windows NT') ?? false;
        renderer.userEnvironment = (windowsUser) ? 'windows' : 'unix';
        switch (request.method) {
            case "GET":
                const getRequestProcessed = await processGetRequest(request, response);
                if (!getRequestProcessed)
                    return;
                break;
            case "POST":
                const body = [];
                request.on('data', (chunk) => {
                    body.push(chunk);
                });
                request.on('end', async () => {
                    processPostRequest(request, response, Buffer.concat(body));
                });
                return;
                break;
            default:
                response.writeHead(501);
                response.end(`<!DOCTYPE html><html><body><h1>HTTP 501 Not Implemented</h1><h2>Could not process this request!</h2><p>${request.method} is not supported on ${request.url}.</p></body></html>`);
        }
    });
    try {
        const port = parseInt(process.env.PP_WEBSERVER_PORT ?? '3000');
        server.listen(port);
        console.log(`PaperPlacer available on port ${port}`);
    }
    catch (error) {
        console.error(`Couldn't start the web server.\n${error.message}\nPort specified: ${process.env.PP_WEBSERVER_PORT ?? 'Unspecified'}`);
    }
}
async function processGetRequest(request, response) {
    if ((0, static_1.loadStatic)(request, response))
        return false;
    if (!request.url)
        return false;
    let urlStrings;
    renderer.urlComponents = urlStrings = request.url.split('/');
    const htmlName = urlStrings[1] + ".html";
    let filepath = (0, node_path_1.join)(__dirname, "templates", htmlName);
    if (searchErgex.test(request.url)) {
        console.log('Someone is searching something!');
        response.writeHead(200);
        response.end(await renderer.renderHtml("search.html"));
        return false;
    }
    if (!(0, fs_1.existsSync)(filepath) && request.url != '/') {
        response.writeHead(404);
        response.end(`<!DOCTYPE html><html><body><h1>HTTP 404 Not Found</h1><h2>Could not find the page you are looking for!</h2><p><a href="/">Back to the website</a></p></body></html>`);
        return false;
    }
    if (request.url == "/") {
        response.writeHead(200);
        response.end(await renderer.renderHtml("index.html"));
        return false;
    }
    response.writeHead(200);
    response.end(await renderer.renderHtml(htmlName));
    return true;
}
async function processPostRequest(request, response, body) {
    switch (request.url) {
        case '/upload':
            let success = false;
            try {
                await importDownload(body);
                success = true;
            }
            catch (error) {
                response.writeHead(500);
                response.end(`<!DOCTYPE html><html><body><h1>HTTP 500</h1><h2>Upload failed!</h2><p>${error.message}</p></body></html>`);
            }
            if (success) {
                response.writeHead(200);
                response.end(await renderer.renderHtml("upload_successfull.html"));
            }
            break;
        case '/delete':
            const textBody = body.toString();
            const textComponents = textBody.split('&');
            const requestComponents = Object.fromEntries(textComponents.map(component => {
                const split = component.split('=').map((c) => {
                    return decodeURIComponent(c.replaceAll('+', ' ')); // TL;DR: these come as 'abd=def&uvw=xyz', so we split
                }); // by '&' first, and then by '=', and then clean up the
                return [split[0], split[1]]; // URI encoding to get the strings and turn them into
            })); // a record like {abc: "def", uvw: "xyz"}.
            // Might reuse this in the future, hence it's so general.
            const removed = await maria.removeCategory(requestComponents);
            if (removed) {
                response.writeHead(200);
                response.end(await renderer.renderHtml("delete_successful.html"));
            }
            else {
                response.writeHead(200);
                response.end(await renderer.renderHtml("deletion_failed.html"));
            }
            break;
        default:
            response.writeHead(501);
            response.end(`<!DOCTYPE html><html><body><h1>HTTP 501 Not Implemented</h1><h2>Could not process this POST request!</h2><p>${request.url}</p></body></html>`);
    }
}
async function importDownload(buffer) {
    const header = buffer.subarray(0, buffer.indexOf('\r\n'));
    const contentStart = buffer.indexOf('\r\n\r\n') + '\r\n\r\n'.length;
    const contentEnd = buffer.lastIndexOf(Buffer.concat([Buffer.from('\r\n'), header]));
    const content = buffer.subarray(contentStart, contentEnd);
    const metadata = buffer.subarray(header.length, contentStart);
    const filenameRegex = /filename="(.+?)"/;
    const bufferFilename = metadata.toString("utf-8").match(filenameRegex);
    const downloadName = ((bufferFilename == null) ? "unnamed" : bufferFilename[1])
        .replaceAll(" '''-'-''' ", " '''--''' ")
        .replaceAll('"', "'''-DOUBLEQUOTE-'''")
        .replaceAll("<", "'''-LESSTHAN-'''")
        .replaceAll(">", "'''-MORETHAN-'''") // Windows-safe filenames used internally
        .replaceAll("?", "'''-QUESTIONMARK-'''")
        .replaceAll(":", "'''-COLON-'''") // This replaces all Windows-invalid characters
        .replaceAll("*", "'''-ASTERISK-'''") // with a replacement string. Other characters are
        .replaceAll("|", "'''-VERTICALBAR-'''") // already handled:
        .replaceAll(((windowsUser) ? ' -into- ' : '\\'), // - Forward slashes are forbidden even on UNIX systems
    " '''-'-''' "); // - Backslashes are used on UNIX systems for categories
    const tmpDir = (0, node_path_1.join)(__dirname, "../tmp");
    const downloadPath = (0, node_path_1.join)(tmpDir, downloadName).replace(".oc", ".zip");
    if (!(0, fs_1.existsSync)(tmpDir))
        (0, fs_1.mkdirSync)(tmpDir, { recursive: true });
    (0, fs_1.writeFileSync)(downloadPath, content);
    if (downloadName.endsWith(".csv"))
        await maria.importFile(downloadPath);
    else if (downloadName.endsWith(".oc"))
        await (0, catalogues_1.processCatalogue)(downloadPath);
    (0, fs_1.rmSync)(downloadPath);
}
//# sourceMappingURL=server.js.map
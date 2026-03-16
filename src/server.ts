import http, { IncomingMessage, ServerResponse } from "http";
import { writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "node:path";
import { htmlRenderer } from "./render";
import { loadStatic } from "./static";
import { db } from "./db";
import { processCatalogue } from "./catalogues";

const renderer: htmlRenderer = new htmlRenderer;
const searchErgex: RegExp = /\?search=(.+)/;

export function serve () {
    const server = http.createServer(async (request: IncomingMessage, response: ServerResponse) => {
        if (loadStatic(request, response)) return;
        console.log(request.method + " " + request.url)

        if (!request.url) return;

        let urlStrings: string[];
        renderer.urlComponents = urlStrings = request.url.split('/');
        const htmlName: string = urlStrings[1] + ".html";
        let filepath: string = join(__dirname, "templates", htmlName);

        if (searchErgex.test(request.url)) {
            console.log('Someone is searching something!');
            response.writeHead(200);
            response.end(await renderer.renderHtml("search.html"));
            return;
        }

        if (!existsSync(filepath) && request.url != '/') {
            response.writeHead(404);
            response.end(`<!DOCTYPE html><html><body><h1>HTTP 404 Not Found</h1><h2>Could not find the page you are looking for!</h2><p><a href="/">Back to the website</a></p></body></html>`);
            return;
        }

        if (request.method == "POST") {
            const body: Buffer[] = [];
            
            request.on('data', (chunk: Buffer) => {
                body.push(chunk);
            });

            request.on('end', async () => {
                processPostRequest(request, response, body);
            });
            return;
        }

        if (request.url == "/") {
            response.writeHead(200);
            response.end(await renderer.renderHtml("index.html"));
            return;
        }
        
        response.writeHead(200);
        response.end(await renderer.renderHtml(htmlName));
    });
    server.listen(3000);
}

async function processPostRequest(request: http.IncomingMessage, response: http.ServerResponse, body: Buffer[]) {
    switch (request.url) {
        case '/upload':
            let success: boolean = false;
            try {
                await importDownload(body);
                success = true;
            } catch (error: any) {
                response.writeHead(500);
                response.end(`<!DOCTYPE html><html><body><h1>HTTP 500</h1><h2>Upload failed!</h2><p>${error.message}</p></body></html>`);
            }
            if (success) {
                response.writeHead(200);
                response.end(await renderer.renderHtml("upload_successfull.html"));
            }
            break;

        case '/delete':
            const textBody = Buffer.concat(body).toString();
            const textComponents: Array<string> = textBody.split('&');

            const requestComponents: Record<string, any> = Object.fromEntries(textComponents.map(component => {
                const split: string[] = component.split('=').map((c) => {
                    return decodeURIComponent(c.replaceAll('+', ' '));      // TL;DR: these come as 'abd=def&uvw=xyz', so we split
                });                                                         // by '&' first, and then by '=', and then clean up the
                return [split[0], split[1]];                                // URI encoding to get the strings and turn them into
            }));                                                            // a record like {abc: "def", uvw: "xyz"}.
                                                                            // Might reuse this in the future, hence it's so general.
            const maria = new db;
            const removed: boolean = await maria.removeCategory(requestComponents);

            if (removed) {
                response.writeHead(200);
                response.end(await renderer.renderHtml("delete_successful.html"));
            } else {
                response.writeHead(200);
                response.end(await renderer.renderHtml("deletion_failed.html"));
            }
            break;
        default:
            response.writeHead(501);
            response.end(`<!DOCTYPE html><html><body><h1>HTTP 501 Not Implemented</h1><h2>Could not process this POST request!</h2><p>${request.url}</p></body></html>`);
    }
}

async function importDownload (body: Buffer[]) {
    const buffer: Buffer = Buffer.concat(body);
    const header: Buffer = buffer.subarray(0, buffer.indexOf('\r\n'));
    const contentStart: number = buffer.indexOf('\r\n\r\n') + '\r\n\r\n'.length;
    const contentEnd: number = buffer.lastIndexOf(Buffer.concat([Buffer.from('\r\n'), header]));

    const content: Buffer = buffer.subarray(contentStart, contentEnd);
    const metadata: Buffer = buffer.subarray(header.length, contentStart);

    const filenameRegex: RegExp = /filename="(.+?)"/;
    const bufferFilename = metadata.toString("utf-8").match(filenameRegex);
    const downloadName = (bufferFilename == null) ? "unnamed" : bufferFilename[1];
    
    const tmpDir = join(__dirname, "../tmp");
    const downloadPath = join(tmpDir, downloadName).replace(".oc", ".zip");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, {recursive: true});
    writeFileSync(downloadPath, content);

    const maria = new db;
    if (downloadName.endsWith(".csv")) await maria.importFile(downloadPath);
    else if (downloadName.endsWith(".oc")) await processCatalogue(downloadPath);
    rmSync(downloadPath);
}
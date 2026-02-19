import http, { IncomingMessage, ServerResponse } from "http";
import { writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import url from 'url';
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
            response.end(`404: Not found!`);
            return;
        }

        if (request.url == '/upload' && request.method == "POST") {
            const body: Buffer[] = [];
            
            request.on('data', (chunk: Buffer) => {
                body.push(chunk);
            });

            request.on('end', async () => {
                let success: boolean = false;
                try {
                    await importDownload(body);
                    success = true;
                } catch (error) {
                    response.writeHead(500);
                    response.end(`<!DOCTYPE html><html><body><h1>HTTP 500</h1><h2>Upload failed!</h2><p>${error}</p></body></html>`);
                }
                if (success) {
                    response.writeHead(200);
                    response.end(await renderer.renderHtml("upload_successfull.html"));
                }
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
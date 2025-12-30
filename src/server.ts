import http, { IncomingMessage, ServerResponse } from "http";
import { writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import url from 'url';
import { join } from "node:path";
import { renderHtml } from "./render";
import { loadStatic } from "./static";
import { db } from "./db";

export function serve () {
    const server = http.createServer(async (request: IncomingMessage, response: ServerResponse) => {
        if (loadStatic(request, response)) return;
        console.log(request.method + " " + request.url)

        if (request.url) {
            const htmlName: string = request.url.split('/')[1] + ".html";
            let filepath:string = join(__dirname, "templates", htmlName);
            if (existsSync(filepath) || request.url == "/") {
                if (request.url == "/upload" && request.method == "POST") {
                    const body: Buffer[] = [];

                    request.on('data', (chunk: Buffer) => {
                        body.push(chunk);
                    });

                    request.on('end', async () => {
                        try {
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
                            const downloadPath = join(tmpDir, downloadName);
                            if (!existsSync(tmpDir)) mkdirSync(tmpDir, {recursive: true});
                            writeFileSync(downloadPath, content);

                            response.writeHead(200);
                            response.end(await renderHtml("upload_successfull.html"));

                            const maria = new db;
                            if (downloadName.endsWith(".csv")) await maria.importFile(downloadPath);
                            rmSync(downloadPath);
                        } catch (error) {
                            response.writeHead(500);
                            response.end(`<!DOCTYPE html><html><body><h1>HTTP 500</h1><h2>Upload failed!</h2><p>${error}</p></body></html>`);
                        }
                    });
                } else if (request.url != "/") {
                    response.writeHead(200);
                    response.end(await renderHtml(htmlName));
                } else {
                    response.writeHead(200);
                    response.end(await renderHtml("index.html"));
                }
            } else {
                response.writeHead(404);
                response.end(`404: Not found!`)
            }
        } 
    });
    server.listen(3000);
}
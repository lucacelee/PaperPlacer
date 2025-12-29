import http, { IncomingMessage, ServerResponse } from "http";
import { renderHtml } from "./render";
import { loadStatic } from "./static";

export function serve () {
    const server = http.createServer((request: IncomingMessage, response: ServerResponse) => {
        if (loadStatic(request, response)) return;

        response.writeHead(200);
        response.end(renderHtml("index.html"));
    });
    server.listen(3000);
}
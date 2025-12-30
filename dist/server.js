"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serve = serve;
const http_1 = __importDefault(require("http"));
const render_1 = require("./render");
const static_1 = require("./static");
function serve() {
    const server = http_1.default.createServer(async (request, response) => {
        if ((0, static_1.loadStatic)(request, response))
            return;
        response.writeHead(200);
        response.end(await (0, render_1.renderHtml)("index.html"));
    });
    server.listen(3000);
}
//# sourceMappingURL=server.js.map
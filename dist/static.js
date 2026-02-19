"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadStatic = loadStatic;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = __importDefault(require("fs"));
function loadStatic(request, response) {
    if (!request.url)
        return false;
    let filepath = node_path_1.default.join(__dirname, "../static", decodeURIComponent(request.url));
    if (!fs_1.default.existsSync(filepath))
        return false;
    var type;
    switch (node_path_1.default.extname(filepath)) {
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
            console.log(`The file '${request.url}' is of an unsupported type (${node_path_1.default.extname(filepath)}), so it will not be loaded.`);
            return false;
    }
    response.writeHead(200, { 'Content-Type': type });
    fs_1.default.createReadStream(filepath).pipe(response);
    return true;
}
//# sourceMappingURL=static.js.map
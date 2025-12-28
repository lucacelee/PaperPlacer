"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderHtml = renderHtml;
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = __importDefault(require("fs"));
const templatesPath = node_path_1.default.join(__dirname, "templates");
function renderHtml(page) {
    let html = fs_1.default.readFileSync(node_path_1.default.join(templatesPath, page), 'utf8');
    return html;
}
//# sourceMappingURL=render.js.map
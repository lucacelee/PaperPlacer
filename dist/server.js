"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webserver = void 0;
const express_1 = __importDefault(require("express"));
class webserver {
    constructor() {
        this.server = (0, express_1.default)();
    }
    respond() {
        this.server.get('/', (request, response) => {
            response.send("Hi!");
        });
    }
    listen() {
        this.server.listen(3000, () => {
            console.log("http://localhost:3000");
        });
    }
}
exports.webserver = webserver;
//# sourceMappingURL=server.js.map
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const server_1 = require("./server");
(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log("hey");
    var maria = new db_1.db;
    try {
        yield maria.setup();
    }
    catch (error) {
        console.log("Failed to connect to MariaDB. Error:\n" + error);
    }
    try {
        // await maria.importFile("/files/Temp2/test.csv");
    }
    catch (error) {
        console.log("Failed to import the CSV. Error:\n" + error);
    }
}))();
var web = new server_1.webserver;
web.respond();
web.listen();
// End
//# sourceMappingURL=index.js.map
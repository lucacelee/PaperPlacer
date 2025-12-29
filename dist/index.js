"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const server_1 = require("./server");
(async () => {
    console.log("hey");
    var maria = new db_1.db;
    try {
        await maria.setup();
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
})();
(0, server_1.serve)();
// End
//# sourceMappingURL=index.js.map
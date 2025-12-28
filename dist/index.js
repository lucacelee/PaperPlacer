"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
var maria = new db_1.db();
try {
    maria.setup();
}
catch (error) {
    console.log("Failed to connect to MariaDB. Error:\n" + error);
}
// End
//# sourceMappingURL=index.js.map
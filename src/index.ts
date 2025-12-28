import { db } from "./db";

var maria = new db();
try {
  maria.setup();
} catch (error) {
  console.log("Failed to connect to MariaDB. Error:\n" + error);
}


// End
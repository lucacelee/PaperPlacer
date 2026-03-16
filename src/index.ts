import { db } from "./db";
import { serve } from "./server";

(async () => {
  console.log("hey");
  var maria = new db;
  try {
    await maria.setup();
  } catch (error) {
    console.log("Failed to connect to MariaDB. Error:\n" + error);
  }
})();

serve();
// End
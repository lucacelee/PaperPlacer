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

  try {
    // await maria.importFile("/files/Temp2/Higher Applied Maths.csv");
  } catch (error) {
    console.log("Failed to import the CSV. Error:\n" + error)
  }
})();

serve();
// End
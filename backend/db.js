const fs = require('fs');
const file = 'db.json';

function readDb() {
   try {
       const raw = fs.readFileSync(file);
       return JSON.parse(raw);
   } catch (error) {
       console.error("Error reading or parsing db.json:", error);
       return { users: [], items: [], cart: [] };
   }
}

function writeDb(data) {
   try {
       fs.writeFileSync(file, JSON.stringify(data, null, 2));
   } catch (error) {
       console.error("Error writing to db.json:", error);
   }
}


module.exports = { readDb, writeDb };
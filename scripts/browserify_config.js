const config = require('./config');
const fs = require('fs');

delete config.ownerSeed;

fs.writeFileSync("browser_config.json", JSON.stringify(config));

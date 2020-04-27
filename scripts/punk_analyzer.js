const punks = require("./punks").punks;

let longestAttrs = 0;
for (let i=0; i<punks.length; i++) {
  if (punks[i].accessories.length > longestAttrs)
    longestAttrs = punks[i].accessories.length;
}

console.log(longestAttrs);
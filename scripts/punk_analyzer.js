const punks = require("./characters.json");

let longestAttrs = 0;
let zeroTraiter = 0;
let oneTraiter = 0;
let twoTraiter = 0;
for (let i=0; i<punks.length; i++) {
  if (punks[i].attributes.length > longestAttrs)
    longestAttrs = punks[i].attributes.length;

  if (punks[i].attributes.length == 1) {
    oneTraiter++;
    console.log("one traiter: ", i);
  }

  if (punks[i].attributes.length == 0)
    zeroTraiter++;

  if (punks[i].attributes.length == 2) {
    twoTraiter++;
    console.log("two traiter: ", i);
  }

}

console.log("Max attributes: ", longestAttrs);


console.log("0-traiters: ", zeroTraiter);
console.log("1-traiters: ", oneTraiter);
console.log("2-traiters: ", twoTraiter);
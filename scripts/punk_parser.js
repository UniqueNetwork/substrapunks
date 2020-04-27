const attributes = require("./attributes").attributes;
var Web3 = require('web3');
const fs = require("fs");
var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: BigNumber.ROUND_DOWN });
const got = require('got');


const punksAddress = "0x6ba6f2207e343923ba692e5cae646fb0f566db8d";

const web3ProviderUrl = "https://mainnet.infura.io/v3/906c592068a74f2ebb1872dedb70fcae";


console.log(attributes);

////////////////////////////////////////
// set the Web3 provider
var web3 = new Web3(new Web3.providers.HttpProvider(web3ProviderUrl));
////////////////////////////////////////

// Create contract objects
var abi = JSON.parse(fs.readFileSync(__dirname + '/cryptopunks.abi', 'utf8'));
var contract = new web3.eth.Contract(abi, punksAddress);

function extractAccessory(accDiv) {
  if (accDiv.indexOf('<a href="/cryptopunks/search?query=') != -1) {
    accDiv = accDiv.substring(accDiv.indexOf('<a href="/cryptopunks/search?query='));
    accDiv = accDiv.substring(accDiv.indexOf('">'));
    const acc = accDiv.substring(2, accDiv.indexOf('</a>'));
    return [accDiv, acc];
  }
  else return [accDiv, ''];
}

async function getPunkProperties(punkId) {

  console.log(`Getting punk ${punkId}`);
  const response = await got(`https://www.larvalabs.com/cryptopunks/details/${punkId}`);

  let accessoriesDiv = response.body.substring(
    response.body.indexOf("<h3>Accessories</h3>"));
  accessoriesDiv = accessoriesDiv.substring(0, accessoriesDiv.indexOf("<div class='row detail-row'>"));

  console.log("Accessories: ");
  let accessories = [];
  while (true) {
    let [remainder, acc] = extractAccessory(accessoriesDiv);
    console.log(acc);

    accessoriesDiv = remainder;
    if (acc == '') break;

    const idx = attributes.indexOf(acc);
    accessories.push(idx);
  }

  // Gender
  let gender = "Unknown gender";
  let genderText = response.body.substring(
    response.body.indexOf("One of"), response.body.indexOf("One of")+100);
  if (genderText.indexOf("Female") != -1)
    gender = "Female";
  if (genderText.indexOf("Male") != -1)
    gender = "Male";

  console.log("Gender: " + gender);

  return {
    id: punkId,
    gender: gender,
    accessories: accessories
  };
}


async function main() {

  let punkProperties = [];
  
  for (let i=0; i<10000; i++) {
    const props = await getPunkProperties(i);
    punkProperties.push(props);
    console.log("Props: ", props);
  }

  fs.writeFileSync('punks.json', JSON.stringify(punkProperties));
}

main();

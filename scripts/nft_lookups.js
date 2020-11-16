const { ApiPromise, WsProvider, Keyring } = require('api_v1');
const { Abi, PromiseContract } = require('@polkadot/api-contract');
const delay = require('delay');
const config = require('./config');
const fs = require('fs');

var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

const rtt = require("./runtime_types.json");
const marketContractAbi = require("./market_metadata.json");

async function getUniqueConnection() {

  // Initialise the provider to connect to the node
  const wsProvider = new WsProvider(config.wsEndpoint);

  // Create the API and wait until ready
  const api = await ApiPromise.create({ 
    provider: wsProvider,
    types: rtt,
  });

  return api;
}

function ksmToFixed(amount) {
  const ksmexp = BigNumber(10).pow(12);
  const balance = new BigNumber(amount);
  return balance.div(ksmexp).toFixed();
}


async function getRegisteredEscrowBalance(addr) {

  const api = await getUniqueConnection();
  const keyring = new Keyring({ type: 'sr25519' });

  const abi = new Abi(api.registry, marketContractAbi);
  const contractInstance = new PromiseContract(api, abi, config.marketContractAddress);


  const result = await contractInstance.call('rpc', 'get_balance', 0, 1000000000000, 2).send(addr);
  // let bal = 0;
  // if (result.output) {
  //   bal = ksmToFixed(result.output.toString());
  // }


  console.log("Escrow balance registered in smart contract: ", result.output.toString());

  api.disconnect();
}



async function main() {
  // const addr = "5Cz3w112Y1y3TzfJLhjQacisD2cvvbGv8hvdj6WFk8CE9nPG";
  // const addr = "5F4zQ1a913Xaho4ch8eyYkxuBwate4FfVVgdSxwDSkW82gRe";
  // const addr = "5HBh79strNrkf8ANbc7q7U73jgt4ayDX5hry7wnKSECtCEwi";
  // const addr = "5H92NmUsAvVRpc6UC38SnU2RDX1fMyxAxzLL65uvqAFBynkH";
  const addr = "5H4SRPMMZaeZKxLQXcYWGTidbLE9iH2dXbL7QP7FEppFETUL";
  await getRegisteredEscrowBalance(addr);


  // const ids = ["24e0", "2240", "112c", "1c94", "0eb6", "1bc6", "1394", "11e7", "1393", "1396", "0aea", "0b3f", "11e9", "2532", "0dd8", "0944", "08f0", "212a", "155e", "1fab", "240a", "1751", "166c", "2369", "1503", "1ec9", "0908", "1a62", "24b0", "0b94", "11b0", "19e4", "14ea", "25ff"]
  // for (let i=0; i<ids.length; i++) {
  //   const id = Buffer.from(ids[i], 'hex').readIntBE(0, 2).toString();
  //   console.log(id);
  // }

}

main().catch(console.error).finally(() => process.exit());

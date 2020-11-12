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
  const addr = "5HBh79strNrkf8ANbc7q7U73jgt4ayDX5hry7wnKSECtCEwi";
  await getRegisteredEscrowBalance(addr);
}

main().catch(console.error).finally(() => process.exit());

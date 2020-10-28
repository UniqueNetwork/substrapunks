const { ApiPromise, WsProvider, Keyring } = require('api_v1');
const delay = require('delay');
const config = require('./config');
const fs = require('fs');

var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

const rtt = require("./runtime_types.json");

async function getUniqueConnection() {
  // Initialise the provider to connect to the node
  const wsProviderNft = new WsProvider(config.wsEndpoint);

  // Create the API and wait until ready
  const api = new ApiPromise({ 
    provider: wsProviderNft,
    types: rtt
  });

  api.on('disconnected', async (value) => {
    log(`disconnected: ${value}`);
    process.exit();
  });
  api.on('error', async (value) => {
    log(`error: ${value}`);
    process.exit();
  });

  await api.isReady;

  return api;
}

async function scanNftBlock(api, blockNum) {
  if (blockNum % 100 == 0) console.log(`Scanning Block #${blockNum}`);
  const blockHash = await api.rpc.chain.getBlockHash(blockNum);

  // Memo: If it fails here, check custom types
  const signedBlock = await api.rpc.chain.getBlock(blockHash);

  // console.log(`Reading Block Transactions`);
  let nftDeposits = [];
  await signedBlock.block.extrinsics.forEach(async (ex, index) => {
    const { _isSigned, _meta, method: { args, method, section } } = ex;
    if ((section == "nft") && (method == "transfer") 
      && (ex.signer.toString() == "5HcHQXGHxMCgdf7w7oRZ3Gws2BtSsGqzzs316V7ZtCs5nWb2")
      && (args[0] == "5FBuB6nFppMZoc3ZU7jkFKpPT1w7q49oBZDxEWSsY9RJkH9M")) {
      console.log(`NFT Transfer: ${args[0]} claimed (${args[1]}, ${args[2]})`);
    }

    if ((section == "contracts") && (method == "call") 
      //&& (ex.signer.toString() == "5FBuB6nFppMZoc3ZU7jkFKpPT1w7q49oBZDxEWSsY9RJkH9M")
      ) {
      console.log(`Contracts call block ${blockNum}, ${blockHash}, ${args}`);
      fs.writeFileSync("claimers.csv", `${blockNum},${blockHash},${ex.signer.toString()}`);
    }

  });

}

function sendNftTxAsync(api, sender, recipient, collection_id, token_id) {
  return new Promise(async function(resolve, reject) {
    try {
      console.log(`Sending nft transfer transaction...`);
      const unsub = await api.tx.nft
      .transfer(recipient, collection_id, token_id, 0)
      .signAndSend(sender, (result) => {
        console.log(`Current tx status is ${result.status}`);
    
        if (result.status.isInBlock) {
          console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
          resolve();
          unsub();
        } else if (result.status.isFinalized) {
          console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
          resolve();
          unsub();
        } else if (result.status.isUsurped) {
          console.log(`Something went wrong with transaction. Status: ${result.status}`);
          log(`NFT qithdraw`, `ERROR: ${result.status}`);
          reject();
          unsub();
        }
      });
    } catch (e) {
      console.log("Error: ", e);
      log(`NFT withdraw`, `ERROR: ${e.toString()}`);
      reject(e);
    }
  });
}


async function handleUnique() {

  // Get the start block
  let lastNftBlock = 507781;

  const api = await getUniqueConnection();
  const keyring = new Keyring({ type: 'sr25519' });

  const finalizedHashNft = await api.rpc.chain.getFinalizedHead();
  const signedFinalizedBlockNft = await api.rpc.chain.getBlock(finalizedHashNft);

  while (true) {
    try {
      if (lastNftBlock + 1 <= signedFinalizedBlockNft.block.header.number) {

        // Handle NFT Deposits (by analysing block transactions)
        lastNftBlock++;
        await scanNftBlock(api, lastNftBlock);
      } else break;

    } catch (ex) {
      console.log(ex);
      await delay(1000);
    }
  }

  api.disconnect();
}

async function main() {
  await handleUnique();
}

main().catch(console.error).finally(() => process.exit());

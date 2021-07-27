const { ApiPromise, WsProvider } = require('api_v1');
const delay = require('delay');
const config = require('./config');
const fs = require('fs');

var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

const rtt = require("./runtime_types.json");

function log(block, operation, address) {
  fs.appendFileSync(`testnet1_users.csv`, `${block},${operation},${address}\n`);
}

async function getUniqueConnection() {
  // Initialise the provider to connect to the node
  const wsProviderNft = new WsProvider(config.wsEndpointNft);

  // Create the API and wait until ready
  const api = new ApiPromise({ 
    provider: wsProviderNft,
    types: rtt
  });

  api.on('disconnected', async (value) => {
    console.log(`disconnected: ${value}`);
    process.exit();
  });
  api.on('error', async (value) => {
    console.log(`error: ${value.toString()}`);
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
  for (const ex of signedBlock.block.extrinsics) {
    const { _isSigned, _meta, method: { args, method, section } } = ex;
    if ((section == "nft") && (method == "transfer")) {
      log(blockNum, "NFT transfer from", ex.signer.toString());
      log(blockNum, "NFT transfer to", args[0]);
    }
    else if ((section == "contracts") && (method == "call")) {
      log(blockNum, "Contract call", ex.signer.toString());
    }
    else if ((section == "balances") && (method == "transfer")) {
      log(blockNum, "Balance transfer from", ex.signer.toString());
      log(blockNum, "Balance transfer to", args[0]);
    }
  }
}

async function handleUnique() {

  // Get the start block
  let lastNftBlock = 2501957;

  const api = await getUniqueConnection();

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

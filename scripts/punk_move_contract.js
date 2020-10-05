const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const punks = require("./characters.json");
const config = require('./config');
const sprintf = require('sprintf-js').sprintf;
const fs = require('fs');

const collectionId = config.collectionId;

function checkOwner(owner) {
  for (let i=0; i<32; i++) {
    if (owner[i] != 0) return true;
  }
  return false;
}

function transferFromAsync(api, admin, itemId, sender, recipient) {
  return new Promise(async function(resolve, reject) {
    const unsub = await api.tx.nft
      .transferFrom(sender, recipient, collectionId, itemId, 0)
      .signAndSend(admin, (result) => {
        console.log(`Current tx status is ${result.status}`);
    
        if (result.status.isInBlock) {
          console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
          resolve();
          unsub();
        } else if (result.status.isFinalized) {
          console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
          resolve();
          unsub();
        }
      });
  });
}

async function main() {
  // Initialise the provider to connect to the node
  const wsProvider = new WsProvider(config.wsEndpoint);
  const rtt = JSON.parse(fs.readFileSync("runtime_types.json"));

  // Create the API and wait until ready
  const api = await ApiPromise.create({ 
    provider: wsProvider,
    types: rtt
  });

  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion, id, collection] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
    api.query.nft.nextCollectionID(),
    api.query.nft.collection(collectionId)
  ]);

  console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);
  console.log(`Next collection ID: ${id}`);
  console.log(`Collection: ${collection}`);

  const oldContractAddress = "5GdNqKMv4Sszq3SRd3TkXNa6a9ct4D3nXvtTWTFR7rTyccVJ";

  if (checkOwner(collection.Owner.toString())) {
    // Import owner account from mnemonic phrase in config file
    const keyring = new Keyring({ type: 'sr25519' });
    const owner = keyring.addFromUri(config.ownerSeed);

    // Move Tokens from old contract to new
    for (let i=1; i<=config.punksToImport; i++) {
      let punk = await api.query.nft.nftItemList(config.collectionId, i);

      if (punk.Owner == oldContractAddress) {
        console.log(`=== Moving Punk ${i} ===`);

        await transferFromAsync(api, owner, i, oldContractAddress, config.contractAddress);
      }
      else {
        console.log(`=== Punk ${i} is already owned: ${punk.Owner} ===`);
      }
    }

  }
  else {
    console.log("\nERROR: Collection not found.\nCheck the ID and make sure you have created collection and set the admin");
  }

}

main().catch(console.error).finally(() => process.exit());

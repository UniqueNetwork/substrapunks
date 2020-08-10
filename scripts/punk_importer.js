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

function mintAsync(api, owner, properties, recipient) {
  return new Promise(async function(resolve, reject) {
    const unsub = await api.tx.nft
      .createItem(collectionId, properties, recipient)
      .signAndSend(owner, (result) => {
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

  if (checkOwner(collection.Owner.toString())) {
    // Import owner account from mnemonic phrase in config file
    const keyring = new Keyring({ type: 'sr25519' });
    const owner = keyring.addFromUri(config.ownerSeed);

    const startWith = parseInt(await api.query.nft.itemListIndex(config.collectionId));
    console.log(`${startWith} of ${config.punksToImport} punks are already imported`);

    // Create Tokens
    for (let i=startWith; i<config.punksToImport; i++) {
      console.log(`=== Importing Punk ${i+1} of ${config.punksToImport} ===`);
      // Format properties
      // bytes 0-1:   Original ID
      // byte    2:   Sex
      // bytes 3-9:   Attribute IDs (if not present, FF)
      // bytes 10-19: Reserved (FF)
      let props = sprintf("0x%04X%02X", punks[i].id, (punks[i].gender == "Male" ? 0 : 1));
      let j=0;
      for (; j<punks[i].attributes.length; j++) {
        const acc = sprintf("%02X", punks[i].attributes[j]);
        props += acc;
      }
      for (; j<17; j++) {
        props += "FF";
      }

      // Mint
      await mintAsync(api, owner, props, config.contractAddress);
    }

  }
  else {
    console.log("\nERROR: Collection not found.\nCheck the ID and make sure you have created collection and set the admin");
  }

}

main().catch(console.error).finally(() => process.exit());

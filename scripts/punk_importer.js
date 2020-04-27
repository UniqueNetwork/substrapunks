const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const punks = require("./punks").punks;
const config = require('../config');
const sprintf = require('sprintf-js').sprintf;

const collectionId = 1;


function checkOwner(owner) {
  for (let i=0; i<32; i++) {
    if (owner[i] != 0) return true;
  }
  return false;
}

function mintAsync(api, admin,properties) {
  return new Promise(async function(resolve, reject) {
    const unsub = await api.tx.nft
      .createItem(collectionId, config.adminAddress, properties)
      .signAndSend(admin, (result) => {
        console.log(`Current tx status is ${result.status}`);
    
        if (result.status.isInBlock) {
          console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
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

  // Create the API and wait until ready
  const api = await ApiPromise.create({ 
    provider: wsProvider,
    types: {
      CollectionType : {
        owner: 'AccountId',
        next_item_id: 'u64',
        custom_data_size: 'u32'
      },
      NftItemType : {

      }
    }
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

  if (checkOwner(collection.owner.toString())) {
    // Import admin account from mnemonic phrase in config file
    const keyring = new Keyring({ type: 'sr25519' });
    const admin = keyring.addFromUri(config.adminAccountPhrase);

    const bal = await api.query.nft.balance(config.collectionId, admin);
    console.log(bal.toString());

    // Admin: Create Tokens
    for (let i=0; i<1000; i++) {
      // Format properties
      // bytes 0-1: Original ID
      // byte    2: Sex
      // bytes 3-9: Attribute IDs (if not present, FF)
      let props = sprintf("0x%04X%02X", punks[i].id, (punks[i].gender == "Male" ? 0 : 1));
      let j=0;
      for (; j<punks[i].accessories.length; j++) {
        const acc = sprintf("%02X", punks[i].accessories[j]);
        props += acc;
      }
      for (; j<7; j++) {
        props += "FF";
      }

      // Mint
      await mintAsync(api, admin, props);
    }

  }
  else {
    console.log("\nERROR: Collection not found.\nCheck the ID and make sure you have created collection and set the admin");
  }

}

main().catch(console.error).finally(() => process.exit());

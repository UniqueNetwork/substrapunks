const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const config = require('./config');
const fs = require('fs');

function submitTransaction(sender, transaction) {
  return new Promise(async function(resolve, reject) {
    try {
      const unsub = await transaction
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
        }
      });
    }
    catch (e) {
      reject(e.toString());
    }
  });
}

async function createCollectionAsync(api, alice) {
  // Substrapunks
  const name = [0x53, 0x75, 0x62, 0x73, 0x74, 0x72, 0x61, 0x70, 0x75, 0x6e, 0x6b, 0x73];
  // Remake of classic CryptoPunks game
  const description = [0x52, 0x65, 0x6d, 0x61, 0x6b, 0x65, 0x20, 0x6f, 0x66, 0x20, 0x63, 0x6c, 0x61, 0x73, 0x73, 0x69, 0x63, 0x20, 0x43, 0x72, 0x79, 0x70, 0x74, 0x6f, 0x50, 0x75, 0x6e, 0x6b, 0x73, 0x20, 0x67, 0x61, 0x6d, 0x65];
  // PNK
  const tokenPrefix = [0x50, 0x4e, 0x4b];
  
  // Mode: NFT
  // BTW, here is the way to create Re-Fungible: api.tx.nft.createCollection([], [], [], {"ReFungible":[data_size, decimal_points] });

  // Comment out the creation for now since collection is already created
  const tx = api.tx.nft.createCollection(name, description, tokenPrefix, {"NFT": config.collectionDataSize});
  await submitTransaction(alice, tx);

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

  // Owners's keypair
  const keyring = new Keyring({ type: 'sr25519' });
  const owner = keyring.addFromUri(config.ownerSeed);
  console.log("Collection owner address: ", owner.address);  

  // Create collection as owner
  console.log("=== Create collection ===");
  // const nextId = await api.query.nft.nextCollectionID();
  // if (nextId.eq(config.collectionId)) {
  //   console.log("Collection already exists. Not creating.");
  // } else {
    await createCollectionAsync(api, owner);
  // }

  const tx2 = api.tx.nft.setOffchainSchema(config.collectionId, config.offchainSchema);
  await submitTransaction(owner, tx2);
}

main().catch(console.error).finally(() => process.exit());

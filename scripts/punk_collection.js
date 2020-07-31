const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const config = require('./config');
var BigNumber = require('bn.js');
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

async function transferBalanceAsync(api, sender, recipient, amount) {
  const tx = api.tx.balances.transfer(recipient, amount);
  await submitTransaction(sender, tx);
}

async function createCollectionAsync(api, alice) {
  // Substrapunks
  const name = [0x53, 0x75, 0x62, 0x73, 0x74, 0x72, 0x61, 0x70, 0x75, 0x6e, 0x6b, 0x73];
  // Remake of classic CryptoPunks game
  const description = [0x52, 0x65, 0x6d, 0x61, 0x6b, 0x65, 0x20, 0x6f, 0x66, 0x20, 0x63, 0x6c, 0x61, 0x73, 0x73, 0x69, 0x63, 0x20, 0x43, 0x72, 0x79, 0x70, 0x74, 0x6f, 0x50, 0x75, 0x6e, 0x6b, 0x73, 0x20, 0x67, 0x61, 0x6d, 0x65];
  // PNK
  const tokenPrefix = [0x50, 0x4e, 0x4b];
  // Mode: NFT
  const mode = 1;
  // Decimal points = 0 for NFT
  const decimals = 0;

  const tx = api.tx.nft.createCollection(name, description, tokenPrefix, mode, decimals, config.collectionDataSize);
  await submitTransaction(alice, tx);
}

async function setCollectionAdminAsync(api, alice) {
  const tx = api.tx.nft.addCollectionAdmin(config.collectionId, config.adminAddress);
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

  // Send some balance to admin
  console.log("=== Transfer balance to admin ===");
  const bal = await api.query.system.account(owner.address);
  console.log("Owner balance: ", bal.data.free.toString());
  const adminBal = await api.query.system.account(config.adminAddress);
  console.log("Admin balance: ", adminBal.data.free.toString());

  const amount = new BigNumber(1e15);
  const sufficient = amount.divn(4);
  console.log("compare to: ", sufficient.toString());
  if (adminBal.data.free.lt(sufficient)) {
    // console.log("Less than");
    await transferBalanceAsync(api, owner, config.adminAddress, amount.toString());
  }
  else {
    console.log(`Admin balance ${adminBal.data.free.toString()} is sufficient (greater than ${sufficient.toString()}). Not transferring.`);
  }

  // Create collection as owner
  console.log("=== Create collection ===");
  const nextId = await api.query.nft.nextCollectionID();
  if (nextId.eq(1)) {
    console.log("Collection already exists. Not creating.");
  } else {
    await createCollectionAsync(api, owner);
  }

  // Give the admin admin rights
  console.log("=== Set collection admin ===");
  const admins = await api.query.nft.adminList(config.collectionId);
  if (admins.length > 0) {
    console.log("Admin already exists. Not setting.");
  } else {
    await setCollectionAdminAsync(api, owner);
  }
}

main().catch(console.error).finally(() => process.exit());

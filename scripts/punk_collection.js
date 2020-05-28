const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const config = require('../config');
var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: BigNumber.ROUND_DOWN });

function submitTransaction(sender, transaction) {
  return new Promise(async function(resolve, reject) {
    try {
      const unsub = await transaction
      .signAndSend(sender, (result) => {
        console.log(`Current tx status is ${result.status}`);
    
        if (result.status.isInBlock) {
          console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
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
  const tx = api.tx.nft.createCollection(config.collectionDataSize);
  await submitTransaction(alice, tx);
}

async function setCollectionAdminAsync(api, alice) {
  const tx = api.tx.nft.addCollectionAdmin(config.collectionId, config.adminAddress);
  await submitTransaction(alice, tx);
}

async function main() {
  // Initialise the provider to connect to the node
  const wsProvider = new WsProvider(config.wsEndpoint);

  // Create the API and wait until ready
  const api = await ApiPromise.create({ 
    provider: wsProvider,
    types: {
      NftItemType: {
        Collection: "u64",
        Owner: "AccountId",
        Data: "Vec<u8>"
      },
      CollectionType: {
        Owner: "AccountId",
        NextItemId: "u64",
        CustomDataSize: "u32"
      },
      Address: "AccountId",
      LookupSource: "AccountId",
      Weight: "u32"
    }
  });

  // Alice's keypair
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri(config.aliceSeed);
  console.log("Alice address: ", alice.address);  

  // Send some balance to admin
  console.log("=== Transfer balance to admin ===");
  const bal = await api.query.system.account(alice.address);
  console.log("Alice balance: ", bal.data.free.toString());
  const adminBal = await api.query.system.account(config.adminAddress);
  console.log("Admin balance: ", adminBal.data.free.toString());

  const amount = (new BigNumber('1000000')).times(1e12);
  if (adminBal.data.free.lt(amount.dividedBy(4))) {
    await transferBalanceAsync(api, alice, config.adminAddress, amount.toString());
  }
  else {
    console.log("Admin balance is sufficient. Not transferring.");
  }


  // Create collection as Alice
  console.log("=== Create collection ===");
  const nextId = await api.query.nft.nextCollectionID();
  if (nextId.eq(1)) {
    console.log("Collection already exists. Not creating.");
  } else {
    await createCollectionAsync(api, alice);
  }

  // Give the admin admin rights
  console.log("=== Set collection admin ===");
  const admins = await api.query.nft.adminList(config.collectionId);
  if (admins.length > 0) {
    console.log("Admin already exists. Not setting.");
  } else {
    await setCollectionAdminAsync(api, alice);
  }

}

main().catch(console.error).finally(() => process.exit());

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const config = require('./config');
const fs = require('fs');

const { Abi } = require('@polkadot/api-contract');
const rtt = require("./runtime_types.json");
const contractAbi = require("./market_metadata.json");



function sendTxAsync(api, sender) {
  return new Promise(async function(resolve, reject) {
    const unsub = await api.tx.balances
      .transfer("5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL", 1) // Send minimal amount to Ferdie
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
  });
}

async function main() {
  // Initialise the provider to connect to the node
  const wsProvider = new WsProvider(config.wsEndpoint);

  // Create the API and wait until ready
  const api = await ApiPromise.create({ 
    provider: wsProvider,
    types: rtt
  });

  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version()
  ]);

  console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);

  // Get address balance
  const keyring = new Keyring({ type: 'sr25519' });

  const alice = keyring.addFromUri("//Alice");
  let balBeforeAlice = (await api.query.system.account(alice.address)).data.free;
  console.log("Alice's balance = ", balBeforeAlice.toString());


  // const blockHash = await api.rpc.chain.getBlockHash(11295); // balance transfer
  const blockHash = await api.rpc.chain.getBlockHash(11353); // nft transfer
  console.log(blockHash.toString());
  const signedBlock = await api.rpc.chain.getBlock(blockHash);
  signedBlock.block.extrinsics.forEach((ex, index) => {
    console.log(index, ex.hash.toHex());

    const { _isSigned, _meta, method: { args, method, section } } = ex;
    if ((section == "balances") && (method == "transfer")) {
      console.log(`Transfer: ${args[0]} received ${args[1]}`);
    }
    else if ((section == "nft") && (method == "transfer")) {
      console.log(`NFT Transfer: ${args[0]} received (${args[1]}, ${args[2]})`);
    }

  });

  // // Make a transfer
  // await sendTxAsync(api, eve);

  // // Get balance again
  // let balAfter = (await api.query.system.account(eve.address)).data.free;
  // console.log("Eve's balance = ", balAfter.toString());

  // // Transaction cost
  // let txCost = balBefore.sub(balAfter).subn(1);
  // console.log("Transaction cost = ", txCost.toString());

}

main().catch(console.error).finally(() => process.exit());

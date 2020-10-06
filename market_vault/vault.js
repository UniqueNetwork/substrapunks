const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const delay = require('delay');
const config = require('./config');
const fs = require('fs');

const { Abi, PromiseContract } = require('@polkadot/api-contract');
const rtt = require("./runtime_types.json");
const contractAbi = require("./market_metadata.json");

const quoteId = 2; // KSM

let api;

function registerQuoteDepositAsync(sender, depositorAddress, amount) {
  console.log(`${depositorAddress} deposited ${amount} in ${quoteId} currency`);
  return new Promise(async function(resolve, reject) {

    try {

      const abi = new Abi(api.registry, contractAbi);

      const value = 0;
      const maxgas = 1000000000000;
    
      const unsub = await api.tx.contracts
        .call(config.marketContractAddress, value, maxgas, abi.messages.registerDeposit(quoteId, amount, depositorAddress))
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
          reject();
          unsub();
        }
      });
    } catch (e) {
      console.log("Error: ", e);
      reject(e);
    }

  });
}

function registerNftDepositAsync(sender, depositorAddress, collection_id, token_id) {
  console.log(`${depositorAddress} deposited ${collection_id}, ${token_id}`);
  return new Promise(async function(resolve, reject) {

    try {
      const abi = new Abi(api.registry, contractAbi);

      const value = 0;
      const maxgas = 1000000000000;
    
      const unsub = await api.tx.contracts
        .call(config.marketContractAddress, value, maxgas, abi.messages.registerNftDeposit(collection_id, token_id, depositorAddress))
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
          reject();
          unsub();
        }
      });
    } catch (e) {
      console.log("Error: ", e);
      reject(e);
    }

  });
}

async function scanBlock(apiKus, admin, blockNum) {
  console.log(`Scanning Block #${blockNum}`);
  const blockHash = await apiKus.rpc.chain.getBlockHash(blockNum);

  // Memo: If it fails here, check custom types
  const signedBlock = await apiKus.rpc.chain.getBlock(blockHash);

  // console.log(`Reading Block Transactions`);
  await signedBlock.block.extrinsics.forEach(async (ex, index) => {
    const { _isSigned, _meta, method: { args, method, section } } = ex;
    if ((section == "balances") && (method == "transfer") && (args[0] == config.adminAddress)) {
      console.log(`Transfer: ${args[0]} received ${args[1]} from ${ex.signer.toString()}`);

      // Register Quote Deposit
      await registerQuoteDepositAsync(admin, ex.signer.toString(), args[1]);
    }
    else if ((section == "nft") && (method == "transfer") && (args[0] == config.adminAddress)) {
      console.log(`NFT Transfer: ${args[0]} received (${args[1]}, ${args[2]})`);

      // Register NFT Deposit
      await registerNftDepositAsync(admin, ex.signer.toString(), args[1], args[2]);
    }
  });
}

function sendTxAsync(api, sender, recipient, amount) {
  return new Promise(async function(resolve, reject) {
    const unsub = await api.tx.balances
      .transfer(recipient, amount)
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

function sendNftTxAsync(api, sender, recipient, collection_id, token_id) {
  return new Promise(async function(resolve, reject) {
    const unsub = await api.tx.nft
      .transfer(recipient, collection_id, token_id, 0)
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

async function scanContract(admin) {
  const abi = new Abi(api.registry, contractAbi);
  const contractInstance = new PromiseContract(api, abi, config.marketContractAddress);
  const result = await contractInstance.call('rpc', 'get_last_withdraw_id', 0, 1000000000000).send(admin.address);
  const lastContractQuoteWithdrawId = result.output.toNumber();

  const result2 = await contractInstance.call('rpc', 'get_last_nft_withdraw_id', 0, 1000000000000).send(admin.address);
  const lastContractNftWithdrawId = result2.output.toNumber();

  let { lastQuoteWithdraw, lastNftWithdraw } = JSON.parse(fs.readFileSync("./withdrawal_id.json"));
  const keyring = new Keyring({ type: 'sr25519' });

  // Process Quote withdraws
  while (lastContractQuoteWithdrawId > lastQuoteWithdraw) {
    // Get the withdraw amount and address
    const result3 = await contractInstance.call('rpc', 'get_withdraw_by_id', 0, 1000000000000, lastQuoteWithdraw+1).send(admin.address);
    const [pubKey, amount] = result3.output;
    const address = keyring.encodeAddress(pubKey); 
    console.log(`${address.toString()} withdarwing amount ${amount.toNumber()}`);

    // Send withdraw transaction
    await sendTxAsync(api, admin, address, amount);

    lastQuoteWithdraw++;
    fs.writeFileSync("./withdrawal_id.json", JSON.stringify({ lastQuoteWithdraw, lastNftWithdraw }));
  }

  // Process NFT withdraws
  while (lastContractNftWithdrawId > lastNftWithdraw) {
    // Get the withdraw amount and address
    const result4 = await contractInstance.call('rpc', 'get_nft_withdraw_by_id', 0, 1000000000000, lastNftWithdraw+1).send(admin.address);
    const [pubKey, collection_id, token_id] = result4.output;
    const address = keyring.encodeAddress(pubKey); 
    console.log(`${address.toString()} withdarwing NFT ${collection_id.toNumber()}, ${token_id.toNumber()}`);

    // Send withdraw transaction
    await sendNftTxAsync(api, admin, address, collection_id, token_id);

    lastNftWithdraw++;
    fs.writeFileSync("./withdrawal_id.json", JSON.stringify({ lastQuoteWithdraw, lastNftWithdraw }));
  }

}

async function main() {
  // Initialise the provider to connect to the node
  const wsProvider = new WsProvider(config.wsEndpointKusama);

  // Create the API and wait until ready
  const apiKus = await ApiPromise.create({ 
    provider: wsProvider,
    types: rtt
  });

  // Initialise the provider to connect to the node
  const wsProviderNft = new WsProvider(config.wsEndpointNft);

  // Create the API and wait until ready
  api = await ApiPromise.create({ 
    provider: wsProviderNft,
    types: rtt
  });
  

  // Get address balance
  const keyring = new Keyring({ type: 'sr25519' });

  const admin = keyring.addFromUri(config.adminSeed);
  let bal = (await apiKus.query.system.account(admin.address)).data.free;
  console.log("Admin Balance = ", bal.toString());

  // Get the start block
  let { lastBlock } = JSON.parse(fs.readFileSync("./block.json"));

  while (true) {
    try {
      const finalizedHash = await apiKus.rpc.chain.getFinalizedHead();
      const signedFinalizedBlock = await apiKus.rpc.chain.getBlock(finalizedHash);
      if (lastBlock + 1 <= signedFinalizedBlock.block.header.number) {

        // Handle Deposits (by analysing block transactions)
        lastBlock++;
        fs.writeFileSync("./block.json", JSON.stringify({ lastBlock }));
        await scanBlock(apiKus, admin, lastBlock);
 
        
      } else {
        // Handle Withdrawals (by getting them from market contracts)
        await scanContract(admin);

        await delay(6000);
      }

    } catch (ex) {
      await delay(1000);
    }
  }
}

main().catch(console.error).finally(() => process.exit());

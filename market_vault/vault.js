const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const delay = require('delay');
const config = require('./config');
const fs = require('fs');

var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

const { Abi, PromiseContract } = require('@polkadot/api-contract');
const rtt = require("./runtime_types.json");
const contractAbi = require("./market_metadata.json");

const quoteId = 2; // KSM
const logFile = "./operations_log";

// Queues of deposits and withdrawals
// let quoteDeposits = [];
// let quoteWithdrawals = [];

function getTime() {
  var a = new Date();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = `${hour}:${min}:${sec}`;
  return time;
}

function getDay() {
  var a = new Date();
  var year = a.getFullYear();
  var month = a.getMonth()+1;
  var date = a.getDate();
  var time = `${year}-${month}-${date}`;
  return time;
}

function log(operation, status) {
  fs.appendFileSync(`${logFile}_${getDay()}.csv`, `${getTime()},${operation},${status}\n`);
}

async function getKusamaConnection() {
  // Initialise the provider to connect to the node
  const wsProvider = new WsProvider(config.wsEndpointKusama);

  // Create the API and wait until ready
  const api = await ApiPromise.create({ 
    provider: wsProvider,
    // types: rtt
  });

  return api;
}

async function getUniqueConnection() {
  // Initialise the provider to connect to the node
  const wsProviderNft = new WsProvider(config.wsEndpointNft);

  // Create the API and wait until ready
  api = await ApiPromise.create({ 
    provider: wsProviderNft,
    types: rtt
  });

  return api;
}

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
          log(`Handling quote transfer`, `ERROR: ${result.status}`);
          reject();
          unsub();
        } else {
          console.log(`Unknown transaction status: ${result.status}`);
          log(`Handling quote transfer`, `WARNING: ${result.status}`);
          resolve();
          unsub();
        }
      });
    } catch (e) {
      console.log("Error: ", e);
      log(`Handling quote transfer`, `ERROR: ${e.toString()}`);
      reject(e);
    }

  });
}

function registerNftDepositAsync(api, sender, depositorAddress, collection_id, token_id) {
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
          log(`Handling NFT transfer`, `ERROR: ${result.status}`);
          reject();
          unsub();
        } else {
          console.log(`Unknown transaction status ${result.status}`);
          log(`Handling NFT transfer`, `WARNING: ${result.status}`);
          resolve();
          unsub();
        }
      });
    } catch (e) {
      console.log("Error: ", e);
      log(`Handling NFT transfer`, `ERROR: ${e.toString()}`);
      reject(e);
    }

  });
}

async function scanKusamaBlock(api, blockNum) {
  console.log(`Scanning Block #${blockNum}`);
  const blockHash = await api.rpc.chain.getBlockHash(blockNum);

  // Memo: If it fails here, check custom types
  const signedBlock = await api.rpc.chain.getBlock(blockHash);

  // console.log(`Reading Block Transactions`);
  let quoteDeposits = [];
  await signedBlock.block.extrinsics.forEach(async (ex, index) => {
    let { _isSigned, _meta, method: { args, method, section } } = ex;
    // console.log(`Section: ${section}, method: ${method} args: ${args[0]}`);
    if (method == "transferKeepAlive") method = "transfer";
    if ((section == "balances") && (method == "transfer") && (args[0] == config.adminAddressKusama)) {
      console.log(`Transfer: ${args[0]} received ${args[1]} from ${ex.signer.toString()}`);
      log(`Quote deposit from ${ex.signer.toString()} amount ${args[0]}`, "RECEIVED");

      // Register Quote Deposit
      const deposit = {
        address: ex.signer.toString(),
        amount: args[1]
      };
      quoteDeposits.push(deposit);
    }
  });
  fs.writeFileSync("./quoteDeposits.json", JSON.stringify(quoteDeposits));

}

async function scanNftBlock(api, admin, blockNum) {
  console.log(`Scanning Block #${blockNum}`);
  const blockHash = await api.rpc.chain.getBlockHash(blockNum);

  // Memo: If it fails here, check custom types
  const signedBlock = await api.rpc.chain.getBlock(blockHash);

  // console.log(`Reading Block Transactions`);
  let nftDeposits = [];
  await signedBlock.block.extrinsics.forEach(async (ex, index) => {
    const { _isSigned, _meta, method: { args, method, section } } = ex;
    if ((section == "nft") && (method == "transfer") && (args[0] == config.adminAddressNft)) {
      console.log(`NFT Transfer: ${args[0]} received (${args[1]}, ${args[2]})`);
      log(`NFT deposit from ${ex.signer.toString()} id (${args[1]}, ${args[2]})`, "RECEIVED");

      // Register NFT Deposit
      const deposit = {
        address: ex.signer.toString(),
        collectionId: args[1],
        tokenId: args[2]
      };
      nftDeposits.push(deposit);
    }
  });

  for (let i=0; i<nftDeposits.length; i++) {
    await registerNftDepositAsync(api, admin, nftDeposits[i].address, nftDeposits[i].collectionId, nftDeposits[i].tokenId);
    log(`NFT deposit from ${nftDeposits[i].address} id (${nftDeposits[i].collectionId}, ${nftDeposits[i].tokenId})`, "REGISTERED");
  }
}

function sendTxAsync(api, sender, recipient, amount) {
  return new Promise(async function(resolve, reject) {
    try {
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
          } else if (result.status.isUsurped) {
            console.log(`Something went wrong with transaction. Status: ${result.status}`);
            log(`Quote qithdraw`, `ERROR: ${result.status}`);
            reject();
            unsub();
          } else {
            console.log(`Unknown transaction status: ${result.status}`);
            log(`Quote qithdraw`, `WARNING: ${result.status}`);
            resolve();
            unsub();
          }
        });
    } catch (e) {
      console.log("Error: ", e);
      log(`Quote withdraw`, `ERROR: ${e.toString()}`);
      reject(e);
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
        } else if (result.status.isFinalized) {
          console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
          resolve();
          unsub();
        } else if (result.status.isUsurped) {
          console.log(`Something went wrong with transaction. Status: ${result.status}`);
          log(`NFT qithdraw`, `ERROR: ${result.status}`);
          reject();
          unsub();
        } else {
          console.log(`Unknown transaction status: ${result.status}`);
          log(`NFT qithdraw`, `WARNING: ${result.status}`);
          resolve();
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

async function scanContract(api, admin) {
  const abi = new Abi(api.registry, contractAbi);
  const contractInstance = new PromiseContract(api, abi, config.marketContractAddress);
  const result = await contractInstance.call('rpc', 'get_last_withdraw_id', 0, 1000000000000).send(admin.address);
  const lastContractQuoteWithdrawId = result.output.toNumber();

  const result2 = await contractInstance.call('rpc', 'get_last_nft_withdraw_id', 0, 1000000000000).send(admin.address);
  const lastContractNftWithdrawId = result2.output.toNumber();

  let { lastQuoteWithdraw, lastNftWithdraw } = JSON.parse(fs.readFileSync("./withdrawal_id.json"));
  const keyring = new Keyring({ type: 'sr25519' });
  log(`Checking withdrawals. Last/handled quote withdraw id: ${lastContractQuoteWithdrawId}/${lastQuoteWithdraw} last/handled nft withdraw id: ${lastContractNftWithdrawId}/${lastNftWithdraw}`, "OK");

  // Process Quote withdraws
  let quoteWithdrawals = [];
  while (lastContractQuoteWithdrawId > lastQuoteWithdraw) {
    // Get the withdraw amount and address
    const result3 = await contractInstance.call('rpc', 'get_withdraw_by_id', 0, 1000000000000, lastQuoteWithdraw+1).send(admin.address);
    const [pubKey, amount] = result3.output;
    const address = keyring.encodeAddress(pubKey); 
    console.log(`${address.toString()} withdrawing amount ${amount.toNumber()}`);
    log(`Quote withdraw #${lastQuoteWithdraw+1}: ${address.toString()} withdrawing amount ${amount.toNumber()}`, "START");

    // Apply 0.01 KSM fee == 1e10 femto
    amountBN = new BigNumber(amount);
    amountBN = amountBN.minus(1e10);
    console.log(`${address.toString()} will receive ${amountBN.toString()}`);
    log(`Quote withdraw #${lastQuoteWithdraw+1}: sending ${amountBN.toString()}`, "START");

    // Send KSM withdraw transaction
    if (amountBN.isGreaterThanOrEqualTo(0)) {
      const withdrawal = {
        number: lastQuoteWithdraw+1,
        address: address,
        amount: amountBN.toString()
      };
      quoteWithdrawals.push(withdrawal);
    }
    fs.writeFileSync("./quoteWithdrawals.json", JSON.stringify(quoteWithdrawals));

    lastQuoteWithdraw++;
    fs.writeFileSync("./withdrawal_id.json", JSON.stringify({ lastQuoteWithdraw, lastNftWithdraw }));
  }

  // Process NFT withdraws
  while (lastContractNftWithdrawId > lastNftWithdraw) {
    // Get the withdraw amount and address
    const result4 = await contractInstance.call('rpc', 'get_nft_withdraw_by_id', 0, 1000000000000, lastNftWithdraw+1).send(admin.address);
    const [pubKey, collection_id, token_id] = result4.output;
    const address = keyring.encodeAddress(pubKey); 
    console.log(`${address.toString()} withdrawing NFT (${collection_id.toNumber()}, ${token_id.toNumber()})`);
    log(`NFT withdraw #${lastNftWithdraw+1}: ${address.toString()} withdrawing ${collection_id.toNumber()}, ${token_id.toNumber()}`, "START");

    // Send withdraw transaction
    await sendNftTxAsync(api, admin, address, collection_id, token_id);
    log(`NFT withdraw #${lastNftWithdraw+1}: ${address.toString()} withdrawing ${collection_id.toNumber()}, ${token_id.toNumber()}`, "END");

    lastNftWithdraw++;
    fs.writeFileSync("./withdrawal_id.json", JSON.stringify({ lastQuoteWithdraw, lastNftWithdraw }));
  }

}

async function handleKusama() {

  // Get the start block
  let { lastKusamaBlock, lastNftBlock } = JSON.parse(fs.readFileSync("./block.json"));

  const api = await getKusamaConnection();
  const keyring = new Keyring({ type: 'sr25519' });
  const admin = keyring.addFromUri(config.adminSeed);

  while (true) {
    try {
      const finalizedHash = await api.rpc.chain.getFinalizedHead();
      const signedFinalizedBlock = await api.rpc.chain.getBlock(finalizedHash);

      if (lastKusamaBlock + 1 <= signedFinalizedBlock.block.header.number) {
        // Handle Kusama Deposits (by analysing block transactions)
        lastKusamaBlock++;
        fs.writeFileSync("./block.json", JSON.stringify({ lastKusamaBlock: lastKusamaBlock, lastNftBlock: lastNftBlock }));

        log(`Handling kusama block ${lastKusamaBlock}`, "START");
        await scanKusamaBlock(api, lastKusamaBlock);
        log(`Handling kusama block ${lastKusamaBlock}`, "END");
      } else break;

    } catch (ex) {
      console.log(ex);
      await delay(1000);
    }
  }

  // Handle queued withdrawals
  let quoteWithdrawals = [];
  try {
    quoteWithdrawals = JSON.parse(fs.readFileSync("./quoteWithdrawals.json"));
  } catch (e) {}
  for (let i=0; i<quoteWithdrawals.length; i++) {
    await sendTxAsync(api, admin, quoteWithdrawals[i].address, quoteWithdrawals.amount);
    log(`Quote withdraw #${quoteWithdrawals[i].number}: ${quoteWithdrawals[i].address.toString()} withdarwing amount ${quoteWithdrawals[i].amount}`, "END");
  }

  // Handle queues deposits
  let quoteDeposits = [];
  try {
    quoteDeposits = JSON.parse(fs.readFileSync("./quoteDeposits.json"));
  } catch (e) {}
  for (let i=0; i<quoteDeposits.length; i++) {
    await registerQuoteDepositAsync(admin, quoteDeposits[i].address, quoteDeposits[i].amount);
    log(`Quote deposit from ${quoteDeposits[i].address} amount ${quoteDeposits[i].amount}`, "REGISTERED");
  }

  api.disconnect();
}

async function handleUnique() {

  // Get the start block
  let { lastKusamaBlock, lastNftBlock } = JSON.parse(fs.readFileSync("./block.json"));

  const api = await getUniqueConnection();
  const keyring = new Keyring({ type: 'sr25519' });
  const admin = keyring.addFromUri(config.adminSeed);

  while (true) {
    try {
      const finalizedHashNft = await api.rpc.chain.getFinalizedHead();
      const signedFinalizedBlockNft = await api.rpc.chain.getBlock(finalizedHashNft);

      if (lastNftBlock + 1 <= signedFinalizedBlockNft.block.header.number) {

        // Handle NFT Deposits (by analysing block transactions)
        lastNftBlock++;
        fs.writeFileSync("./block.json", JSON.stringify({ lastKusamaBlock: lastKusamaBlock, lastNftBlock: lastNftBlock }));
        log(`Handling nft block ${lastNftBlock}`, "START");
        await scanNftBlock(api, admin, lastNftBlock);
        log(`Handling nft block ${lastNftBlock}`, "END");
      } else break;

    } catch (ex) {
      console.log(ex);
      await delay(1000);
    }
  }

  // Handle Withdrawals (by getting them from market contracts)
  await scanContract(api, admin);

  api.disconnect();
}

async function main() {
  log("Vault Started", "success");

  while (true) {
    await handleKusama();
    await handleUnique();
  }
}

main().catch(console.error).finally(() => process.exit());

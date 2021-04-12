const { ApiPromise, WsProvider, Keyring } = require('api_v2');
const delay = require('delay');
const config = require('./config');
const fs = require('fs');
const util = require('util')

var BigNumber = require('bignumber.js');
const { exit } = require('process');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

const logFile = "./operations_log";

const filteredAddresses = [
  "Ec59UP5VDvvN5haP7C21KZqce4wycrZaswiEKwRWfCpD2h8",
  "5E6TVA3CrruzcRt8cQNy7NCqU3niAx3P8W6xqffU2rzKU4dm",
  "CjwjaELA4xon7sUPY6giaLvyYaxDkUfbkQ9w4LG65WbwHkM",
  "5CEL5FtTXhwt2U42cqHdpcyvpxJiR5fV9NZQYQ4JcHJ7CLcB",
  "GnjFRpef4ebEdtTHz6CzicHrkWuMbYvrjozJvHSVpxQMHvw",
  "5GH7b7Un2hdfUz51XHHA6mFHiAEfYvjkQMyEvG1V22jucBL3"
];

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
  const api = new ApiPromise({ provider: wsProvider });

  api.on('disconnected', async (value) => {
    log(`disconnected: ${value}`);
    process.exit();
  });
  api.on('error', async (value) => {
    log(`error: ${value}`);
    process.exit();
  });

  await api.isReady;

  return api;
}

async function scanKusamaBlock(api, blockNum) {
  if (blockNum % 100 == 0) console.log(`Scanning Block #${blockNum}`);
  const blockHash = await api.rpc.chain.getBlockHash(blockNum);

  // Memo: If it fails here, check custom types
  const signedBlock = await api.rpc.chain.getBlock(blockHash);
  const allRecords = await api.query.system.events.at(blockHash);

  // console.log(`Reading Block Transactions`);
  let quoteDeposits = [];
  try {
    quoteDeposits = JSON.parse(fs.readFileSync("./quoteDeposits.json"));
  } catch (e) {
    console.log("Could not parse quoteDeposits.json: ", e);
  }

  await signedBlock.block.extrinsics.forEach(async (ex, index) => {
    let { _isSigned, _meta, method: { args, method, section } } = ex;
    // console.log(`Section: ${section}, method: ${method} args: ${args[0]}`);
    if (method == "transferKeepAlive") method = "transfer";
    if ((section == "balances") && (method == "transfer") && (args[0] == config.adminAddressKusama)) {
      const events = allRecords
        .filter(({ phase }) =>
          phase.isApplyExtrinsic &&
          phase.asApplyExtrinsic.eq(index)
        )
        .map(({ event }) => `${event.section}.${event.method}`);

      if (events.includes('system.ExtrinsicSuccess')) {
        console.log(`Transfer: ${args[0]} received ${args[1]} from ${ex.signer.toString()}`);
        log(`Quote deposit from ${ex.signer.toString()} amount ${args[1]}`, "RECEIVED");
  
        // Register Quote Deposit
        if (!filteredAddresses.includes(ex.signer.toString())) {
          const deposit = {
            address: ex.signer.toString(),
            amount: args[1]
          };
          quoteDeposits.push(deposit);
          fs.writeFileSync("./quoteDeposits.json", JSON.stringify(quoteDeposits));
        }
      }
      else {
        console.log(`Transfer: ${args[0]} received ${args[1]} from ${ex.signer.toString()} - FAILED`);
        log(`Quote deposit from ${ex.signer.toString()} amount ${args[1]}`, "FAILED");
      }
  
    }
  });

}

function sendTxAsync(api, sender, recipient, amount) {
  return new Promise(async function(resolve, reject) {
    try {
      const unsub = await api.tx.balances
        .transfer(recipient, amount)
        .signAndSend(sender, ({ events = [], status }) => {
    
          if (status == 'Ready') {
            // nothing to do
            console.log(`Current tx status is Ready`);
          }
          else if (JSON.parse(status).Broadcast) {
            // nothing to do
            console.log(`Current tx status is Broadcast`);
          }
          else if (status.isInBlock) {
            console.log(`Transaction included at blockHash ${status.asInBlock}`);
          } else if (status.isFinalized) {
            console.log(`Transaction finalized at blockHash ${status.asFinalized}`);
            resolve();
            unsub();
          } else {
            console.log(`Something went wrong with transaction. Status: ${status}`);
            log(`Quote qithdraw`, `ERROR: ${status}`);
            reject();
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

async function handleKusama() {

  // Get the start block
  let { lastKusamaBlock, lastNftBlock } = JSON.parse(fs.readFileSync("./block.json"));

  const api = await getKusamaConnection();
  const keyring = new Keyring({ type: 'sr25519' });
  const admin = keyring.addFromUri(config.adminSeed);

  const finalizedHash = await api.rpc.chain.getFinalizedHead();
  const signedFinalizedBlock = await api.rpc.chain.getBlock(finalizedHash);

  while (true) {
    try {
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
  } catch (e) {
    console.log("Error parsing quoteWithdrawals.json: ", e);
  }

  while (quoteWithdrawals.length > 0) {
    let w = quoteWithdrawals.pop();
    fs.writeFileSync("./quoteWithdrawals.json", JSON.stringify(quoteWithdrawals));
    if (!filteredAddresses.includes(w.address)) {
      await sendTxAsync(api, admin, w.address, w.amount);
      log(`Quote withdraw #${w.number}: ${w.address.toString()} withdarwing amount ${w.amount}`, "END");
    }
  }

  // api.disconnect();
}

// Should not run longer than X seconds at a time
function killTimer() {
  setTimeout(() => { 
    console.log("Exiting by timeout");
    process.exit();
  }, 300000);
}

async function main() {
  killTimer();

  await handleKusama();
}

main().catch(console.error).finally(() => process.exit());

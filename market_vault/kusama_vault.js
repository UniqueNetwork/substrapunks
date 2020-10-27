const { ApiPromise, WsProvider, Keyring } = require('api_v2');
const delay = require('delay');
const config = require('./config');
const fs = require('fs');

var BigNumber = require('bignumber.js');
const { exit } = require('process');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

const logFile = "./operations_log";
let txInProgress = false;

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
      fs.writeFileSync("./quoteDeposits.json", JSON.stringify(quoteDeposits));
    }
  });

}

function sendTxAsync(api, sender, recipient, amount) {
  return new Promise(async function(resolve, reject) {
    try {
      txInProgress = true;
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
            txInProgress = false;
          } else {
            console.log(`Something went wrong with transaction. Status: ${status}`);
            log(`Quote qithdraw`, `ERROR: ${status}`);
            reject();
            unsub();
            txInProgress = false;
          }
        });
    } catch (e) {
      console.log("Error: ", e);
      log(`Quote withdraw`, `ERROR: ${e.toString()}`);
      reject(e);
      txInProgress = false;
    }
  });
}

// Handle at least one block every 10 seconds or die
let lastWatchDogBlock = 0;
let updateWatchdog = 0;
function watchDog() {
  setTimeout(() => {
    if (updateWatchdog != lastWatchDogBlock) {
      lastWatchDogBlock = updateWatchdog;
      watchDog();
    } else {
      log('WatchDog', `Process frozen on block ${lastWatchDogBlock}`);
      process.exit();
    }
  }, 10000);
}

async function handleKusama() {

  // Get the start block
  let { lastKusamaBlock, lastNftBlock } = JSON.parse(fs.readFileSync("./block.json"));

  const api = await getKusamaConnection();
  const keyring = new Keyring({ type: 'sr25519' });
  const admin = keyring.addFromUri(config.adminSeed);

  const finalizedHash = await api.rpc.chain.getFinalizedHead();
  const signedFinalizedBlock = await api.rpc.chain.getBlock(finalizedHash);

  // Start the watchdog
  watchDog();

  while (true) {
    try {
      if (lastKusamaBlock + 1 <= signedFinalizedBlock.block.header.number) {
        // Handle Kusama Deposits (by analysing block transactions)
        lastKusamaBlock++;
        updateWatchdog = lastKusamaBlock;
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
    await sendTxAsync(api, admin, quoteWithdrawals[i].address, quoteWithdrawals[i].amount);
    log(`Quote withdraw #${quoteWithdrawals[i].number}: ${quoteWithdrawals[i].address.toString()} withdarwing amount ${quoteWithdrawals[i].amount}`, "END");
  }
  fs.writeFileSync("./quoteWithdrawals.json", "[]")

  // api.disconnect();
}

// Should not run longer than 30 seconds
function killTimer() {
  setTimeout(() => { 
    if (!txInProgress) process.exit();
    else killTimer();
  }, 30000);
}

async function main() {
  killTimer();

  await handleKusama();
}

main().catch(console.error).finally(() => process.exit());

const { ApiPromise, WsProvider, Keyring } = require('api_v1');
const config = require('./config');
const fs = require('fs');

var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

const logFiles = [
  "log_20201111-12.txt",
  "log.txt"
];
const opLogFiles = [
  "operations_log_2020-11-9.csv",
  "operations_log_2020-11-10.csv",
  "operations_log_2020-11-11.csv",
  "operations_log_2020-11-12.csv",
  "operations_log_2020-11-13.csv",
  "operations_log_2020-11-14.csv",
  "operations_log_2020-11-15.csv",
  "operations_log_2020-11-16.csv",
];

let addresses = [];
let ksmReceived = {};
let ksmRegistered = {};
let nftDeposits = {};
let nftWithdrawals = {};
let asks = {};

function getDeposit(line, suffix) {
  // Address
  const fromIdx = line.indexOf("from");
  const amountIdx = line.indexOf("amount");
  let address = line.substr(fromIdx+5, amountIdx - fromIdx - 6);

  const keyring = new Keyring({ type: 'sr25519' });
  address = keyring.encodeAddress(address);

  // Amount
  const receivedIdx = line.indexOf(suffix);
  const amount = parseFloat(line.substr(amountIdx+7, receivedIdx-amountIdx-8))/1e12;

  return [amount, address];
}

function showBal(address) {
  console.log("ksmReceived: ", ksmReceived[address]);
  console.log("ksmRegistered: ", ksmRegistered[address]);
  console.log("nftDeposits: ", nftDeposits[address]);
  console.log("nftWithdrawals: ", nftWithdrawals[address]);
}

// Received and credited
for (let f=0; f<opLogFiles.length; f++) {
  let lines = fs.readFileSync(opLogFiles[f], 'utf-8')
    .split('\n')
    .filter(Boolean);

  for (let i=0; i<lines.length; i++) {
    if (lines[i].includes("Quote deposit") && lines[i].includes("RECEIVED")) {
      [amount, address] = getDeposit(lines[i], "RECEIVED");
      if (!ksmReceived[address]) {
        ksmReceived[address] = 0;
        addresses.push(address);
      }
      ksmReceived[address] += amount;
    }
    else if (lines[i].includes("Quote deposit") && lines[i].includes("REGISTERED")) {
      [amount, address] = getDeposit(lines[i], "REGISTERED");
      if (!ksmRegistered[address]) ksmRegistered[address] = 0;
      ksmRegistered[address] += amount;

      console.log(`${address} deposited ${amount}`);      
    }
  }
}


// NFT Deposits and Withdrawals
for (let f=0; f<logFiles.length; f++) {
  let lines = fs.readFileSync(logFiles[f], 'utf-8')
    .split('\n')
    .filter(Boolean);

  for (let i=0; i<lines.length; i++) {
    if (lines[i].includes("deposited 4,")) {
      let idx = lines[i].indexOf("deposited 4,");
      const address = lines[i].substr(0, idx - 1);

      idx += "deposited 4, ".length;
      let nftId = lines[i].substr(idx);

      if (!nftDeposits[address]) nftDeposits[address] = [];

      if (!nftDeposits[address].includes(nftId)) {
        nftDeposits[address].push(nftId);
        console.log(`${address} deposited ${nftId}, line ${i}`);
      } else {
        console.log("WARNING, DOUBLE DEPOSIT: ", address, nftId);
      }

    }
    else if (lines[i].includes("Price set for 4-")) {
      const idx = "Price set for 4-".length;
      const idx2 = lines[i].indexOf(":");
      const nftId = lines[i].substr(idx, idx2 - idx);

      let idxKsm = lines[i].indexOf("KSM") - 1;
      if (idxKsm < 0) idxKsm = lines[i].indexOf(",");
      const priceStr = lines[i].substr(idx2+2, idxKsm - idx2 - 2);
      const p = parseFloat(priceStr);

      let addrIdx = lines[i].indexOf("by");
      const address = lines[i].substr(addrIdx+3);

      console.log(`Price for ${nftId} set: ${priceStr}, line ${i}, ${lines[i]}`);

      asks[nftId] = {
        price: p,
        seller: address
      };
    }
    else if (lines[i].includes("withdrawing NFT")) {
      const idx = lines[i].indexOf("withdrawing");
      const address = lines[i].substr(0, idx - 1);
      const idxId = idx + "withdrawing NFT (4, ".length;
      const nftId = lines[i].substr(idxId, lines[i].indexOf(")") - idxId);

      if (nftDeposits[address] && nftDeposits[address].includes(nftId)) {
        const index = nftDeposits[address].indexOf(nftId);
        if (index > -1) {
          nftDeposits[address].splice(index, 1);
        }

        console.log(`${address} cancelling ${nftId}`);

      }
      else {
        if (!nftWithdrawals[address]) nftWithdrawals[address] = [];
        nftWithdrawals[address].push(nftId);

        // Remove from deposits
        for (let depAddr in nftDeposits) {
          const index = nftDeposits[depAddr].indexOf(nftId);
          if (index > -1) {
            nftDeposits[depAddr].splice(index, 1);
          }
        }

        // KSM Deposit is used to buy
        if (!asks[nftId])
          console.log(`WARNING: Price for ${nftId} is not set (${logFiles[f]}, line ${i}).`);
        else {
          console.log(`${address} buying ${nftId} for ${asks[nftId].price}`);

          if (!ksmRegistered[address]) ksmRegistered[address] = 0;
          if (!ksmRegistered[asks[nftId].seller]) ksmRegistered[asks[nftId].seller] = 0;

          ksmRegistered[address] -= asks[nftId].price;
          ksmRegistered[asks[nftId].seller] += asks[nftId].price;
        }
        
        if (address == "5HBh79strNrkf8ANbc7q7U73jgt4ayDX5hry7wnKSECtCEwi")
          console.log("Buy: ", -asks[nftId].price);
      }
    }
  }
}

// Withdrawn KSM
for (let f=0; f<logFiles.length; f++) {
  let lines = fs.readFileSync(logFiles[f], 'utf-8')
    .split('\n')
    .filter(Boolean);

  for (let i=0; i<lines.length; i++) {
    if (lines[i].includes("withdrawing amount")) {
      const idx = lines[i].indexOf("withdrawing");
      let address = lines[i].substr(0, idx - 1);


      const amountIdx = idx + "withdrawing amount ".length;
      const amount = parseFloat(lines[i].substr(amountIdx))/1e12;
      if (!ksmRegistered[address]) ksmRegistered[address] = 0;
      ksmRegistered[address] -= amount;
      if (address == "5Gx5Xj6JDmgLzDzwPwLecgDUJVoH3Hpn6YpJ4UwtHL4Lffgo")
        console.log("Withdrawing ", amount);
    }
  }
}


// showBal("5HBh79strNrkf8ANbc7q7U73jgt4ayDX5hry7wnKSECtCEwi"); // Tamara
// showBal("5F4zQ1a913Xaho4ch8eyYkxuBwate4FfVVgdSxwDSkW82gRe"); // Cassandra
// showBal("5Dqd5PVoTWYzpJzkbtXb6RFF2E6ZLoMszaSrDK7MFedLEo4R");
// showBal("5FqF5439yKUr6wFfaHT2rrRMwJ2o172gDGpazTdXR7guGZM9"); // Katya
// console.log(nftDeposits);
showBal("5Gx5Xj6JDmgLzDzwPwLecgDUJVoH3Hpn6YpJ4UwtHL4Lffgo");

let total = 0;
addresses.push("5FqF5439yKUr6wFfaHT2rrRMwJ2o172gDGpazTdXR7guGZM9");

for (let i=0; i<addresses.length; i++) {
  // console.log(`${addresses[i]},`, ksmReceived[addresses[i]] - ksmRegistered[addresses[i]]);
  // total += ksmReceived[addresses[i]] - ksmRegistered[addresses[i]];
  console.log(`${addresses[i]},`, ksmRegistered[addresses[i]]);
  total += ksmRegistered[addresses[i]];
}

// total -= 93.183;
// total -= 0.872;

console.log(total);

console.log(nftDeposits);
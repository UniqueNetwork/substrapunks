const punks = require("./characters.json");

const { ApiPromise, WsProvider } = require('@polkadot/api');
const attributes = require('./attributes').attributes;
const config = require('./config');

const { Abi } = require('@polkadot/api-contract');
const rtt = require("./runtime_types.json");
const contractAbi = require("./metadata.json");

class nft {

  isOwned(punk) {
    return (config.contractAddress != punk.owner);
  }

  getPunkCount() {
    return config.punksToImport;
  }
  
  async getApi() {
    if (!this.api) {
      // Initialise the provider to connect to the node
      const wsProvider = new WsProvider(config.wsEndpoint);
    
      // Create the API and wait until ready
      const api = await ApiPromise.create({ 
        provider: wsProvider,
        types: rtt,
      });
      this.api = api;
    }

    return this.api;
  }

  async loadPunkFromChain(punkId) {
    const api = await this.getApi();

    const item = await api.query.nft.nftItemList(config.collectionId, punkId);

    let attrArray = [];
    for (let i=0; i<7; i++) {
      if (item.Data[i+3] != 255)
        attrArray.push(attributes[item.Data[i+3]]);
    }

    return {
      originalId : item.Data[0] + item.Data[1] * 256,
      owner: item.Owner.toString(),
      sex: (item.Data[2] == 1) ? "Female" : "Male",
      attributes: attrArray,
      isOwned: this.isOwned(item)
    };
  }

  async checkExtension() {
    await web3Enable('substrapunks');
    const allAccounts = await web3Accounts();

    if (allAccounts.length == 0) return false;
    else return true;
  }

  async getWalletAddresses() {
    return await web3Accounts();
  }

  claimAsync(punkId, claimerAddress) {

    console.log(`Claiming punk ${punkId} in collection ${config.collectionId} by ${claimerAddress}`);

    let that = this;
  
    return new Promise(async function(resolve, reject) {

      try {
        const api = await that.getApi();
        const abi = new Abi(api.registry, contractAbi);
      
        const value = 0;
        const maxgas = 1000000000000;
      
        console.log(Object.keys(abi.messages));

        const injector = await web3FromAddress(claimerAddress);
        api.setSigner(injector.signer);
      
        const unsub = await api.tx.contracts
          .call(config.contractAddress, value, maxgas, abi.messages.claim(config.collectionId, punkId, claimerAddress))
          .signAndSend(claimerAddress, (result) => {
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

  async getBalance(addr) {
    const api = await this.getApi();
    const acc = await api.query.system.account(addr);
    return acc.data.free.toString();
  }
}

const n = new nft();

let blondes = 0;

async function main() {
  let longestAttrs = 0;
  let zeroTraiter = 0;
  let oneTraiter = 0;
  let twoTraiter = 0;
  let sevenTraiter = 0;
  for (let i=0; i<punks.length; i++) {
    if (punks[i].attributes.length > longestAttrs)
      longestAttrs = punks[i].attributes.length;
  
    if (punks[i].attributes.length == 1) {
      oneTraiter++;
      // console.log("one traiter: ", i+1);
    }
  
    else if (punks[i].attributes.length == 0) {
      zeroTraiter++;
    }
    else if (punks[i].attributes.length == 2) {
      twoTraiter++;
      const punk = await n.loadPunkFromChain(i+1);
      if (!n.isOwned(punk))
        console.log(`two traiter: ${i+1}`);
    }
  
    else if (punks[i].attributes.length == 7) {
      sevenTraiter++;
      const punk = await n.loadPunkFromChain(i+1);
      if (!n.isOwned(punk))
        console.log(`7-traiter: ${i+1}`);
    }


    if (punks[i].attributes.includes(26)) {
      blondes++;
      const punk = await n.loadPunkFromChain(i+1);
      if (!n.isOwned(punk))
        console.log(`Blonde: ${i+1}`);
      // console.log(punks[i]);
    }
  
  }
  
  console.log("Max attributes: ", longestAttrs);
  
  
  console.log("Blondes:    ", blondes);
  console.log("0-traiters: ", zeroTraiter);
  console.log("1-traiters: ", oneTraiter);
  console.log("2-traiters: ", twoTraiter);
  console.log("7-traiters: ", sevenTraiter);
}

main().catch(console.error).finally(() => process.exit());

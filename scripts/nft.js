/**
 * NFT js script to be included in the browser
 * 
 * Compiling:
 *   npm install -g browserify
 *   browserify nft.js > ../public/js/polkadot.js
 */

const { ApiPromise, WsProvider } = require('@polkadot/api');
const attributes = require('./attributes').attributes;
const config = require('./config');

const { web3Accounts, web3Enable, web3FromAddress } = require('@polkadot/extension-dapp');
const { Abi } = require('@polkadot/api-contract');
const rtt = require("./runtime_types.json");
const contractAbi = require("./metadata.json");

class nft {

  isOwned(punk) {
    console.log(`Comparing owner ${punk.Owner} to contract address: ${config.contractAddress}`);
    return (config.contractAddress != punk.Owner);
  }

  getPunkCount() {
    return config.punksToImport;
  }
  
  async getApi() {
    if (!this.api) {
      console.log(`Connecting to node: ${config.wsEndpoint}`);

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
    console.log(`Loading punk ${punkId} from collection ${config.collectionId}`);

    const api = await this.getApi();

    const item = await api.query.nft.nftItemList(config.collectionId, punkId);
    console.log("Received item: ", item);

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
      
        // Need to use punkId+1 to map between original punk IDs and NDT module punk IDs, which start from 1.
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
        reject();
      }
  
    });

  }
}

window.nft = nft;

// async function test() {
//   let n = new nft();
//   const punk = await n.loadPunkFromChain(1);
//   console.log(punk);
// }

// test().catch(console.error).finally(() => process.exit());

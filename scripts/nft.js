/**
 * NFT js script to be included in the browser
 * 
 * Compiling:
 *   npm install -g browserify
 *   browserify nft.js > ../public/js/polkadot.js
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const attributes = require('./attributes').attributes;
const { wsEndpoint, collectionId, punksToImport, contractAddress, marketContractAddress, vaultAddress } = require("./browser_config.json");

const { web3Accounts, web3Enable, web3FromAddress } = require('@polkadot/extension-dapp');
const { Abi, PromiseContract } = require('@polkadot/api-contract');
const rtt = require("./runtime_types.json");
const contractAbi = require("./metadata.json");
const marketContractAbi = require("./market_metadata.json");

var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

class nft {

  isOwned(punk) {
    console.log(`Comparing owner ${punk.Owner} to contract address: ${contractAddress}`);
    return (contractAddress != punk.Owner);
  }

  getPunkCount() {
    return punksToImport;
  }
  
  async getApi() {
    if (!this.api) {
      console.log(`Connecting to node: ${wsEndpoint}`);

      // Initialise the provider to connect to the node
      const wsProvider = new WsProvider(wsEndpoint);
    
      // Create the API and wait until ready
      const api = await ApiPromise.create({ 
        provider: wsProvider,
        types: rtt,
      });
      this.api = api;

      // Get Kusama Decimals
      this.ksmDecimals = 12;
      // const properties = await api.rpc.system.properties();
      // if (properties.size > 0) {
      //   console.log('Node specific properties:');
      //   properties.forEach((value, key) => {
      //     console.log(key, value);
      //     if (key == "tokenDecimals")
      //       this.ksmDecimals = parseInt(value.toString());
      //   });
      // } else {
      //   console.log('No specific chain properties found.');
      // }
      // console.log("Kusama decimals: ", this.ksmDecimals);


      const abi = new Abi(api.registry, marketContractAbi);
      this.contractInstance = new PromiseContract(api, abi, marketContractAddress);
    }

    return this.api;
  }

  async loadPunkFromChain(punkId) {
    console.log(`Loading punk ${punkId} from collection ${collectionId}`);

    const api = await this.getApi();

    const item = await api.query.nft.nftItemList(collectionId, punkId);
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

    console.log(`Claiming punk ${punkId} in collection ${collectionId} by ${claimerAddress}`);

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
          .call(contractAddress, value, maxgas, abi.messages.claim(collectionId, punkId, claimerAddress))
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

  depositAsync(punkId, ownerAddress) {
    let that = this;
  
    return new Promise(async function(resolve, reject) {
      try {
        const api = await that.getApi();
        const injector = await web3FromAddress(ownerAddress);

        api.setSigner(injector.signer);
      
        const unsub = await api.tx.nft
          .transfer(vaultAddress, collectionId, punkId, 0)
          .signAndSend(ownerAddress, (result) => {
          console.log(`Deposit: Current tx status is ${result.status}`);
        
          if (result.status.isInBlock) {
            console.log(`Deposit: Transaction included at blockHash ${result.status.asInBlock}`);
            resolve();
            unsub();
          } else if (result.status.isFinalized) {
            console.log(`Deposit: Transaction finalized at blockHash ${result.status.asFinalized}`);
            resolve();
            unsub();
          } else if (result.status.isUsurped) {
            console.log(`Deposit: Something went wrong with transaction. Status: ${result.status}`);
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

  async waitForDeposit(punkId, depositor) {
    try {
      const keyring = new Keyring({ type: 'sr25519' });
      await this.getApi();
    
      console.log("Waiting for deposit transaction");
      while (true) {
        const result = await this.contractInstance.call('rpc', 'get_nft_deposit', 0, 1000000000000, collectionId, punkId).send(depositor);
        if (result.output) {
          const address = keyring.encodeAddress(result.output.toString()); 
          console.log("Deposit address: ", address);
          if (depositor == address) break;
        }
      };

    } catch (e) {
      console.log("Error: ", e);
    }
  }

  askAsync(punkId, price, ownerAddress) {
    let that = this;
  
    return new Promise(async function(resolve, reject) {
      try {
        const api = await that.getApi();
        const abi = new Abi(api.registry, marketContractAbi);
      
        const value = 0;
        const maxgas = 1000000000000;
      
        console.log(Object.keys(abi.messages));

        const injector = await web3FromAddress(ownerAddress);
        api.setSigner(injector.signer);
      
        const unsub = await api.tx.contracts
          .call(marketContractAddress, value, maxgas, abi.messages.ask(collectionId, punkId, 2, price))
          .signAndSend(ownerAddress, (result) => {
          console.log(`Ask: Current tx status is ${result.status}`);
        
          if (result.status.isInBlock) {
            console.log(`Ask: Transaction included at blockHash ${result.status.asInBlock}`);
            resolve();
            unsub();
          } else if (result.status.isFinalized) {
            console.log(`Ask: Transaction finalized at blockHash ${result.status.asFinalized}`);
            resolve();
            unsub();
          } else if (result.status.isUsurped) {
            console.log(`Ask: Something went wrong with transaction. Status: ${result.status}`);
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

  async trade(punkId, price, ownerAddress) {
    console.log(`Selling punk ${punkId} in collection ${collectionId} for ${price}`);

    // Convert price to "Weis" and round to hundredths of KSM, round to 0.01 KSM
    let priceBN = new BigNumber((''+price).replace(/,/g, '.'));
    const ksmexp = BigNumber(10).pow(this.ksmDecimals);

    priceBN = priceBN.multipliedBy(100);
    priceBN = priceBN.integerValue();
    priceBN = priceBN.dividedBy(100);
    priceBN = priceBN.multipliedBy(ksmexp);

    // Transaction #1: Deposit NFT to the vault
    await this.depositAsync(punkId, ownerAddress);

    // Wait for Vault transaction
    await this.waitForDeposit(punkId, ownerAddress);

    // Transaction #2: Invoke ask method on market contract to set the price
    await this.askAsync(punkId, priceBN.toString(), ownerAddress)
  }

  cancelAsync(punkId, ownerAddress) {
    let that = this;
  
    return new Promise(async function(resolve, reject) {
      try {
        const api = await that.getApi();
        const abi = new Abi(api.registry, marketContractAbi);
      
        const value = 0;
        const maxgas = 1000000000000;
      
        console.log(Object.keys(abi.messages));

        const injector = await web3FromAddress(ownerAddress);
        api.setSigner(injector.signer);
      
        const unsub = await api.tx.contracts
          .call(marketContractAddress, value, maxgas, abi.messages.cancel(collectionId, punkId))
          .signAndSend(ownerAddress, (result) => {
          console.log(`Cancel: Current tx status is ${result.status}`);
        
          if (result.status.isInBlock) {
            console.log(`Cancel: Transaction included at blockHash ${result.status.asInBlock}`);
            resolve();
            unsub();
          } else if (result.status.isFinalized) {
            console.log(`Cancel: Transaction finalized at blockHash ${result.status.asFinalized}`);
            resolve();
            unsub();
          } else if (result.status.isUsurped) {
            console.log(`Cancel: Something went wrong with transaction. Status: ${result.status}`);
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

  buyAsync(punkId, ownerAddress) {
    let that = this;
  
    return new Promise(async function(resolve, reject) {
      try {
        const api = await that.getApi();
        const abi = new Abi(api.registry, marketContractAbi);
      
        const value = 0;
        const maxgas = 1000000000000;
      
        console.log(Object.keys(abi.messages));

        const injector = await web3FromAddress(ownerAddress);
        api.setSigner(injector.signer);
      
        const unsub = await api.tx.contracts
          .call(marketContractAddress, value, maxgas, abi.messages.buy(collectionId, punkId))
          .signAndSend(ownerAddress, (result) => {
          console.log(`Buy: Current tx status is ${result.status}`);
        
          if (result.status.isInBlock) {
            console.log(`Buy: Transaction included at blockHash ${result.status.asInBlock}`);
            resolve();
            unsub();
          } else if (result.status.isFinalized) {
            console.log(`Buy: Transaction finalized at blockHash ${result.status.asFinalized}`);
            resolve();
            unsub();
          } else if (result.status.isUsurped) {
            console.log(`Buy: Something went wrong with transaction. Status: ${result.status}`);
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

  withdrawAsync(amount, ownerAddress) {

    let that = this;
  
    return new Promise(async function(resolve, reject) {
      try {
        const api = await that.getApi();
        const abi = new Abi(api.registry, marketContractAbi);

        // Convert amount to "Weis"
        let amountBN = new BigNumber((''+amount).replace(/,/g, '.'));
        const ksmexp = BigNumber(10).pow(that.ksmDecimals);
        amountBN = amountBN.multipliedBy(ksmexp);
        
        const value = 0;
        const maxgas = 1000000000000;
      
        console.log(Object.keys(abi.messages));

        const injector = await web3FromAddress(ownerAddress);
        api.setSigner(injector.signer);
      
        const unsub = await api.tx.contracts
          .call(marketContractAddress, value, maxgas, abi.messages.withdraw(2, amountBN.toString()))
          .signAndSend(ownerAddress, (result) => {
          console.log(`Withdraw: Current tx status is ${result.status}`);
        
          if (result.status.isInBlock) {
            console.log(`Withdraw: Transaction included at blockHash ${result.status.asInBlock}`);
            resolve();
            unsub();
          } else if (result.status.isFinalized) {
            console.log(`Withdraw: Transaction finalized at blockHash ${result.status.asFinalized}`);
            resolve();
            unsub();
          } else if (result.status.isUsurped) {
            console.log(`Withdraw: Something went wrong with transaction. Status: ${result.status}`);
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

  async getAddressTokens(addr) {
    const api = await this.getApi();
    const nfts = await api.query.nft.addressTokens(collectionId, addr);
    return nfts;
  }

  ksmToFixed(amount) {
    const ksmexp = BigNumber(10).pow(this.ksmDecimals);
    const balance = new BigNumber(amount);
    return balance.div(ksmexp).toFixed();
  }

  async getKsmBalance(addr) {
    try {
      await this.getApi();
      const result = await this.contractInstance.call('rpc', 'get_balance', 0, 1000000000000, 2).send(addr);
      if (result.output) {
        return this.ksmToFixed(result.output.toString());
      }

    } catch (e) {
      console.log("Error: ", e);
    }
    return 0;
  }

  async getAddressTokensOnMarket(addr) {
    const keyring = new Keyring({ type: 'sr25519' });
    let nfts = [];
    await this.getApi();
  
    console.log("Getting all active asks on the market");
    const askIdResult = await this.contractInstance.call('rpc', 'get_last_ask_id', 0, 1000000000000).send(addr);
    let lastAskId = 0;
    if (askIdResult.output) {
      lastAskId = askIdResult.output.toNumber();
      console.log("Last Ask ID: ", lastAskId);
    }

    for (let i=1; i<=lastAskId; i++) {
      const askResult = await this.contractInstance.call('rpc', 'get_ask_by_id', 0, 1000000000000, i).send(addr);
      if (askResult.output) {
        const tokenId = askResult.output[1].toNumber();
        const tokenPrice = this.ksmToFixed(askResult.output[3].toString());
        const tokenOwner = keyring.encodeAddress(askResult.output[4].toString());
        if (tokenOwner == addr) {
          nfts.push({id: tokenId, price: tokenPrice});
          console.log("Found token: ", tokenId);
        }
      }
    }

    return nfts;
  }

  async getRecentAsks(limit) {
    let nfts = [];
    await this.getApi();
  
    console.log("Getting all active asks on the market");
    const askIdResult = await this.contractInstance.call('rpc', 'get_last_ask_id', 0, 1000000000000).send(marketContractAddress);
    let lastAskId = 0;
    if (askIdResult.output) {
      lastAskId = askIdResult.output.toNumber();
      console.log("Last Ask ID: ", lastAskId);
    }

    let askId = lastAskId;
    let count = 0;

    while (askId >= 1) {
      const askResult = await this.contractInstance.call('rpc', 'get_ask_by_id', 0, 1000000000000, askId).send(marketContractAddress);
      if (askResult.output) {
        const tokenId = askResult.output[1].toNumber();
        const tokenPrice = this.ksmToFixed(askResult.output[3].toString());
        nfts.push({id: tokenId, price: tokenPrice});
        console.log("Found token: ", tokenId);
        count++;

        if (count >= limit) break;
      }

      askId--;
    }

    return nfts;
  }


  async getTokenAsk(tokenId) {
    const keyring = new Keyring({ type: 'sr25519' });
    await this.getApi();
    
    const askIdResult = await this.contractInstance.call('rpc', 'get_ask_id_by_token', 0, 1000000000000, collectionId, tokenId).send(marketContractAddress);
    if (askIdResult.output) {
      const askId = askIdResult.output.toNumber();
      console.log("Token Ask ID: ", askId);
      const askResult = await this.contractInstance.call('rpc', 'get_ask_by_id', 0, 1000000000000, askId).send(marketContractAddress);
      if (askResult.output) {
        const askOwnerAddress = keyring.encodeAddress(askResult.output[4].toString());
        console.log("Ask owner: ", askOwnerAddress);
        const ask = {
          owner: askOwnerAddress,
          price: this.ksmToFixed(askResult.output[3].toString())
        };
        return ask;
      }
    }

    return null;
  }

  getMarketContract() {
    return marketContractAddress;
  }

  getVaultAddress() {
    return vaultAddress;
  }

  getKusamaVaultAddress() {
    const keyring = new Keyring({ type: 'sr25519' });
    const publicKey = keyring.decodeAddress(vaultAddress);
    const kusamaAddress = keyring.encodeAddress(publicKey, 2); // 2 for Kusama SS58

    return kusamaAddress;
  }

}

window.nft = nft;

// async function test() {
//   let n = new nft();
//   const punk = await n.loadPunkFromChain(1);
//   console.log(punk);
// }

// test().catch(console.error).finally(() => process.exit());

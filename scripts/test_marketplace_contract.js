const { ApiPromise, WsProvider, Keyring } = require('api_v1');
const { ApiPromise: ApiPromiseKsm, WsProvider: WsProviderKsm } = require('api_v2');
const attributes = require('./attributes').attributes;
const { wsEndpoint, wsEndpointKusama, collectionId, punksToImport, contractAddress, marketContractAddress, vaultAddress } = require("./browser_config.json");

const { web3Accounts, web3Enable, web3FromAddress } = require('@polkadot/extension-dapp');
const { Abi, PromiseContract } = require('@polkadot/api-contract');
const rtt = require("./runtime_types.json");
const contractAbi = require("./metadata.json");
const marketContractAbi = require("./market_metadata.json");
const delay = require('delay');

var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

class testMarket {

  async getApi() {
    if (this.kusamaApi) {
      try {
        this.kusamaApi.disconnect();
      } catch (e) {}
    }

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
      const abi = new Abi(api.registry, marketContractAbi);
      this.contractInstance = new PromiseContract(api, abi, marketContractAddress);
    }

    return this.api;
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

  async delay(ms) {
    await delay(ms);
  }

  async getDepositor(punkId, readerAddress) {
    const keyring = new Keyring({ type: 'sr25519' });
    const result = await this.contractInstance.call('rpc', 'get_nft_deposit', 0, 1000000000000, collectionId, punkId).send(readerAddress);
    if (result.output) {
      const address = keyring.encodeAddress(result.output.toString()); 
      console.log("Deposit address: ", address);
      return address;
    }
    return null;
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

    await this.getApi();

    // Convert price to "Weis" and round to hundredths of KSM, round to 0.01 KSM
    let priceBN = new BigNumber((''+price).replace(/,/g, '.'));
    const ksmexp = BigNumber(10).pow(this.ksmDecimals);

    priceBN = priceBN.multipliedBy(100);
    priceBN = priceBN.integerValue();
    priceBN = priceBN.dividedBy(100);
    priceBN = priceBN.multipliedBy(ksmexp);

    // Transaction #2: Invoke ask method on market contract to set the price
    await this.askAsync(punkId, priceBN.toString(), ownerAddress);
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

  async getAddressTokensOnMarket(addr) {
    const keyring = new Keyring({ type: 'sr25519' });
    let nfts = [];
    await this.getApi();

    const asksResult = await this.contractInstance.call('rpc', 'get_asks_cache', 0, 1000000000000).send(addr);
    const asks = asksResult.output.elems;
  
    for (let i=0; i<asks.length; i++) {
      const tokenId = asks[i][1].toNumber();
      const tokenPrice = this.ksmToFixed(asks[i][3].toString());
      const tokenOwner = keyring.encodeAddress(asks[i][4].toString());
      if (tokenOwner == addr) {
        nfts.push({id: tokenId, price: tokenPrice});
        console.log("Found token: ", tokenId);
      }
    }

    return nfts;
  }

  async getRecentAsks(addr) {
    const keyring = new Keyring({ type: 'sr25519' });
    let nfts = [];
    await this.getApi();

    const asksResult = await this.contractInstance.call('rpc', 'get_asks_cache', 0, 1000000000000).send(addr);
    const asks = asksResult.output.elems;
  
    for (let i=0; i<asks.length; i++) {
      const tokenId = asks[i][1].toNumber();
      const tokenPrice = this.ksmToFixed(asks[i][3].toString());
      const tokenOwner = keyring.encodeAddress(asks[i][4].toString());

      nfts.push({id: tokenId, price: tokenPrice, owner: tokenOwner});
      console.log("Found token: ", tokenId);
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

  convertToKusamaAddress(address) {
    const keyring = new Keyring({ type: 'sr25519' });
    const publicKey = keyring.decodeAddress(address);
    const kusamaAddress = keyring.encodeAddress(publicKey, 2); // 2 for Kusama SS58
    return kusamaAddress;
  }

}

async function test() {

  let market = new testMarket();
  
  market.depositAsync(1, bob);

}

test().catch(console.error).finally(() => process.exit());

/**
 * NFT js script to be included in the browser
 * 
 * Compiling:
 *   npm install -g browserify
 *   browserify nft.js > ../public/js/polkadot.js
 */

const { ApiPromise, WsProvider, Keyring } = require('api_v1');
const { ApiPromise: ApiPromiseKsm, WsProvider: WsProviderKsm } = require('api_v2');
const attributes = require('./attributes').attributes;
const { wsEndpoint, wsEndpointKusama, collectionId, punksToImport, contractAddress, marketContractAddress, vaultAddress } = require("./browser_config.json");

const { web3Accounts, web3Enable, web3FromAddress } = require('@polkadot/extension-dapp');
const { Abi, PromiseContract } = require('@polkadot/api-contract');
const rtt = require("./runtime_types.json");
const marketContractAbi = require("./market_metadata.json");
const delay = require('delay');
const https = require('https');

var BigNumber = require('bignumber.js');
BigNumber.config({ DECIMAL_PLACES: 12, ROUNDING_MODE: BigNumber.ROUND_DOWN, decimalSeparator: '.' });

const value = 0;
const maxgas = 1000000000000;

class nft {

  isOwned(punk) {
    return (contractAddress != punk.Owner);
  }

  getPunkCount() {
    return punksToImport;
  }
  
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


      this.abi = new Abi(api.registry, marketContractAbi);
      this.contractInstance = new PromiseContract(api, this.abi, marketContractAddress);
    }

    return this.api;
  }

  async getKusamaApi() {
    if (this.api) {
      try {
        this.api.disconnect();
      } catch (e) {}
    }
    if (!this.kusamaApi) {
      // Initialise the provider to connect to the node
      const wsProvider = new WsProviderKsm(wsEndpointKusama);
    
      // Create the API and wait until ready
      const api = await ApiPromiseKsm.create({ provider: wsProvider });
      this.kusamaApi = api;
      this.ksmDecimals = 12;
    }
    return this.kusamaApi;
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
    for (let i=0; i<2; i++) {
      const extensions = await web3Enable('substrapunks');
      if (extensions.length == 0) {
        console.log("Repeat web3Enable in 2s");
        await delay(2000);
      } else break;
    }
    const allAccounts = await web3Accounts();

    if (allAccounts.length == 0) return false;
    else return true;
  }

  async getWalletAddresses() {
    return await web3Accounts();
  }

  registerTxObserver(callback) {
    this.txObserver = callback;
  }

  notifyTxObserver(msg) {
    if (this.txObserver)
      this.txObserver(msg);
  }

  sendTransactionAsync(api, sender, transaction) {
    const that = this;
    return new Promise(async function(resolve, reject) {
      try {
        const injector = await web3FromAddress(sender);
        api.setSigner(injector.signer);
    
        const unsub = await transaction
          .signAndSend(sender, ({ events = [], status }) => {
        
          if (status == 'Ready') {
            // nothing to do
            console.log(`Current tx status is Ready`);
            that.notifyTxObserver("Mining transaction: Transaction is ready");
          }
          else if (JSON.parse(status).Broadcast) {
            // nothing to do
            console.log(`Current tx status is Broadcast`);
            that.notifyTxObserver("Mining transaction: Broadcasting transaction to the network");
          }
          else if (status.isInBlock) {
            console.log(`Transaction included at blockHash ${status.asInBlock}`);
            that.notifyTxObserver("Mining transaction: Transaction was included in block, waiting for finalization");
          } else if (status.isFinalized) {
            console.log(`Transaction finalized at blockHash ${status.asFinalized}`);
  
            // Loop through Vec<EventRecord> to display all events
            let success = false;
            events.forEach(({ phase, event: { data, method, section } }) => {
              console.log(`    ${phase}: ${section}.${method}:: ${data}`);
              if (method == 'ExtrinsicSuccess') {
                success = true;
              }
            });
  
            if (success) resolve();
            else {
              reject("Transaction failed");
            }
            unsub();
          }
          else
          {
            console.log(`Something went wrong with transaction. Status: ${status}`);
  
            reject("Transaction failed");
            unsub();
          }
        });
      } catch (e) {
        console.log("Error: ", e);
        reject(e);
      }
    });
  
  }
  
  async depositAsync(punkId, ownerAddress) {
    const api = await this.getApi();
    const tx = api.tx.nft.transfer(vaultAddress, collectionId, punkId, 0);
    await this.sendTransactionAsync(api, ownerAddress, tx);
  }

  async delay(ms) {
    await delay(ms);
  }

  async getDepositor(punkId, readerAddress) {
    const keyring = new Keyring({ type: 'sr25519' });
    const result = await this.contractInstance.call('rpc', 'get_nft_deposit', value, maxgas, collectionId, punkId).send(readerAddress);
    if (result.output) {
      const address = keyring.encodeAddress(result.output.toString()); 
      console.log("Deposit address: ", address);
      return address;
    }
    return null;
  }

  async waitForDeposit(punkId, depositorAddressList) {
    try {
      await this.getApi();
    
      console.log("Waiting for deposit transaction", depositorAddressList);
      let block = 0;
      while (true) {
        const address = await this.getDepositor(punkId, depositorAddressList[0]);
        if (depositorAddressList.includes(address)) {
          this.notifyTxObserver(`Waiting for deposit: ${block} of 3 block(s) passed`);
          return address;
        } else {
          this.notifyTxObserver(`Waiting for deposit: ${block} of 3 block(s) passed`);
          if (block < 3) block++;
          await delay(6000);
        }
      };

    } catch (e) {
      console.log("Error: ", e);
    }

    return null;
  }

  async askAsync(punkId, price, ownerAddress) {
    const api = await this.getApi();
    const tx = api.tx.contracts
      .call(marketContractAddress, value, maxgas, this.abi.messages.ask(collectionId, punkId, 2, price));
    await this.sendTransactionAsync(api, ownerAddress, tx);
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

  async cancelAsync(punkId, ownerAddress) {
    const api = await this.getApi();
    const tx = api.tx.contracts
      .call(marketContractAddress, value, maxgas, this.abi.messages.cancel(collectionId, punkId));
    await this.sendTransactionAsync(api, ownerAddress, tx);
  }

  async buyAsync(punkId, ownerAddress) {
    const api = await this.getApi();
    const tx = api.tx.contracts
      .call(marketContractAddress, value, maxgas, this.abi.messages.buy(collectionId, punkId));
    await this.sendTransactionAsync(api, ownerAddress, tx);
  }

  async withdrawAsync(amount, ownerAddress) {
    // Convert to u128
    const ksmexp = BigNumber(10).pow(this.ksmDecimals);
    const balance = new BigNumber(amount);
    const balanceToSend = balance.multipliedBy(ksmexp).integerValue(BigNumber.ROUND_DOWN);
    console.log("balanceToSend: ", balanceToSend.toString());

    const api = await this.getApi();
    const tx = api.tx.contracts
      .call(marketContractAddress, value, maxgas, this.abi.messages.withdraw(2, balanceToSend.toString()));
    await this.sendTransactionAsync(api, ownerAddress, tx);
  }

  async getBalance(addr) {
    const api = await this.getApi();
    const acc = await api.query.system.account(addr);
    return acc.data.free.toString();
  }

  async getKusamaBalance(addr) {
    const api = await this.getKusamaApi();
    const acc = await api.query.system.account(addr);
    return this.ksmToFixed(acc.data.free);
  }

  async sendKusamaBalance(sender, recepient, amount) {
    // Convert to u128
    const ksmexp = BigNumber(10).pow(this.ksmDecimals);
    const balance = new BigNumber(amount);
    const balanceToSend = balance.multipliedBy(ksmexp).integerValue(BigNumber.ROUND_DOWN);
    const api = await this.getKusamaApi();

    console.log("balanceToSend: ", balanceToSend.toString());

    const tx = api.tx.balances
      .transfer(recepient, balanceToSend.toString());
    await this.sendTransactionAsync(api, sender, tx);
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
      const result = await this.contractInstance.call('rpc', 'get_balance', value, maxgas, 2).send(addr);
      if (result.output) {
        let balance = result.output;
        return this.ksmToFixed(balance.toString());
      }

    } catch (e) {
      console.log("Error: ", e);
    }
    return 0;
  }

  getAskCache() {
    const url = "ipfs-gateway.usetech.com";
    const path = "/ipns/QmTL7GbCKW8qZbe8i2ZzckCgTuw8ztTJKWmeZYEQEMG4KS";
    
    const options = {
      hostname: url,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
         'Content-Type': 'application/json'
       }
    }
  
    return new Promise(function(resolve, reject) {
        const req = https.request(options, (res) => {
          let body = '';
  
          res.on('data', (d) => {
            body += d;
          });
  
          res.on('end', () => {
            resolve(JSON.parse(body));
          });
        })
  
        req.on('error', (error) => {
          reject(error);
        })
  
        req.end();
    });
  }

  async getAddressTokensOnMarket(addr) {
    let nfts = [];

    // Get asks cache from IPFS
    const asks = await this.getAskCache();

    for (const [key, ask] of Object.entries(asks)) {
      const tokenId = key.substring(key.indexOf("-") + 1);

      const tokenPrice = ask.price;
      const tokenOwner = ask.address;
      if (tokenOwner == addr) {
        nfts.push({id: tokenId, price: tokenPrice});
      }
    }

    return nfts;
  }

  async getRecentAsks() {
    let nfts = [];

    // Get asks cache from IPFS
    const asks = await this.getAskCache();

    for (const [key, ask] of Object.entries(asks)) {
      const tokenId = key.substring(key.indexOf("-") + 1);

      const tokenPrice = ask.price;
      nfts.push({
        id: tokenId, 
        price: tokenPrice, 
        owner: ask.address,
        sex: ask.sex,
        attributes: ask.attributes
      });
    }

    return nfts;
  }


  async getTokenAsk(tokenId) {
    const keyring = new Keyring({ type: 'sr25519' });
    await this.getApi();
    
    const askIdResult = await this.contractInstance.call('rpc', 'get_ask_id_by_token', value, maxgas, collectionId, tokenId).send(marketContractAddress);
    if (askIdResult.output) {
      const askId = askIdResult.output.toNumber();
      console.log("Token Ask ID: ", askId);
      const askResult = await this.contractInstance.call('rpc', 'get_ask_by_id', value, maxgas, askId).send(marketContractAddress);
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

window.nft = nft;

// async function test() {
//   let n = new nft();
//   const punk = await n.loadPunkFromChain(1);
//   console.log(punk);
// }

// test().catch(console.error).finally(() => process.exit());

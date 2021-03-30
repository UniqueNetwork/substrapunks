const { ApiPromise, WsProvider, Keyring } = require('api_v1');
const config = require('./config');
const rtt = require("./runtime_types.json");
const { hexToU8a } = require('@polkadot/util');
const { decodeAddress, encodeAddress } = require('@polkadot/util-crypto');
const fs = require('fs');

const getUniqueConnection = async function () {
  const wsProviderNft = new WsProvider(config.wsEndpoint);

  // Create the API and wait until ready
  const api = new ApiPromise({ 
    provider: wsProviderNft,
    types: rtt
  });

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

const scanNftBlock = async function (api, blockNum) {  
  if (blockNum % 100 == 0) console.log(`Scanning Block #${blockNum}`);
  const blockHash = await api.rpc.chain.getBlockHash(blockNum);
    // Memo: If it fails here, check custom types
  const signedBlock = await api.rpc.chain.getBlock(blockHash);    

  // console.log(`Reading Block Transactions`);
  
  await signedBlock.block.extrinsics.forEach(async (ex, index) => {    
    const { _isSigned, _meta, method: { args, method, section, signer } } = ex;        
    if ((section == "nft") && (method == "transfer") && (args[0] == config.adminAddressNft)) {
      console.log(`#${blockNum}`);
      let { Owner } = await api.query.nft.nftItemList(args[1], args[2]);      
      const data = args[3].toString();        
      const tokenId = data[28] + data[29] + data[26] + data[27];
      console.log(`Number block: #${blockNum}`);
      console.log(`Contract call: ${data}`);
      console.log(`Method: ${method}`);
      console.log(`Section: ${section}`);
      console.log(`Collection ID: ${args[3].toString().replace('0x','').slice(8,16).replace(/0/g,'')}`);             
      console.log(`Signer / Address: ${ex.signer.toString()}`);
      console.log(`Token ID: ${tokenId}`);
      console.log(`id: ${Buffer.from(tokenId, 'hex').readIntBE(0, 2).toString()}`);
      console.log(`Owner: ${Owner}`);
    } else if ((section == "contracts") && (method == "call")) {
      const data = args[3].toString();        
      const tokenId = data[28] + data[29] + data[26] + data[27];
      console.log(`Number block: #${blockNum}`);
      console.log(`Contract call: ${data}`);
      console.log(`Method: ${method}`);
      console.log(`Section: ${section}`);
      console.log(`Collection ID: ${args[3].toString().replace('0x','').slice(8,16).replace(/0/g,'')}`);             
      console.log(`Signer / Address: ${ex.signer.toString()}`);
      console.log(`Token ID: ${tokenId}`);
      console.log(`id: ${Buffer.from(tokenId, 'hex').readIntBE(0, 2).toString()}`);
    };    
  });
}

module.exports = {
  getUniqueConnection,
  scanNftBlock,
}
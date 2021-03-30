const { ApiPromise, WsProvider, Keyring } = require('api_v1');
const config = require('./config');
const rtt = require("./runtime_types.json");
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
    const { _isSigned, _meta, method: { args, method, section } } = ex;        
    if ((section == "nft") && (method == "transfer") && (args[0] == config.adminAddressNft)) {
      console.log(`#${blockNum}`);
      let { Owner } = await api.query.nft.nftItemList(args[1], args[2]);      
      if (Owner == config.adminAddressNft) {
        console.log(`NFT Transfer: ${args[0]} received (${args[1]}, ${args[2]})`);
        const deposit = {
          address: ex.signer.toString(),
          collectionId: args[1],
          tokenId: args[2]
        };
      } else {
        console.log(`NFT Transfer: ${args[0]} received (${args[1]}, ${args[2]}) - FAILED TX (owner = ${Owner})`)
      }
    } else if ((section == "contracts") && (method == "call")) {
      console.log(`#${blockNum}`);
      console.log(`Contract call: ${args[0].toString()}, ${args[1].toString()}, ${args[2].toString()}, ${args[3].toString()}`);      
            
      const data = args[3].toString();
      console.log('data->' ,data);
      console.log('ext->',
        JSON.stringify(ex, null, 2)
      )
    }
  });  
}

module.exports = {
  getUniqueConnection,
  scanNftBlock
}
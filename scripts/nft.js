/**
 * NFT js script to be included in the browser
 * 
 * Compiling:
 *   npm install -g browserify
 *   browserify nft.js > ../public/js/polkadot.js
 */

const { ApiPromise, WsProvider } = require('@polkadot/api');
const attributes = require('./attributes').attributes;

class nft {

  async loadPunkFromChain(endpoint, collectionId, punkId) {
    // Initialise the provider to connect to the node
    const wsProvider = new WsProvider(endpoint);
  
    // Create the API and wait until ready
    const api = await ApiPromise.create({ 
      provider: wsProvider,
      types: {
        CollectionType : {
          owner: 'AccountId',
          next_item_id: 'u64',
          custom_data_size: 'u32'
        },
        NftItemType : {
          collection: 'u64',
          owner: 'AccountId',
          data: 'Vec<u8>'
        }
      }
    });

    const item = await api.query.nft.itemList([collectionId, punkId]);
    let attrArray = [];
    for (let i=0; i<7; i++) {
      if (item.data[i+3] != 255)
        attrArray.push(attributes[item.data[i+3]]);
    }

    return {
      originalId : item.data[0] + item.data[1] * 256,
      owner: item.owner.toString(),
      sex: (item.data[2] == 1) ? "Female" : "Male",
      attributes: attrArray
    };
  }
}

window.nft = nft;

// async function test() {
//   let n = new nft();
//   const punk = await n.loadPunkFromChain('ws://127.0.0.1:9944', 1, 1);
//   console.log(punk);
// }

// test().catch(console.error).finally(() => process.exit());

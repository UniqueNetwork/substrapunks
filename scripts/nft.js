/**
 * NFT js script to be included in the browser
 * 
 * Compiling:
 *   npm install -g browserify
 *   browserify nft.js > ../public/js/polkadot.js
 */

const { ApiPromise, WsProvider } = require('@polkadot/api');
const attributes = require('./attributes').attributes;
const { web3Accounts, web3Enable, web3FromAddress, web3ListRpcProviders, web3UseRpcProvider } = require('@polkadot/extension-dapp');
const { Abi } = require('@polkadot/api-contract');

class nft {

  async getApi(endpoint) {
    console.log(`Connecting to node: ${endpoint}`);

    // Initialise the provider to connect to the node
    const wsProvider = new WsProvider(endpoint);
  
    // Create the API and wait until ready
    const api = await ApiPromise.create({ 
      provider: wsProvider,
      types: {
        Schedule: {
          version: "u32",
          put_code_per_byte_cost: "Gas",
          grow_mem_cost: "Gas",
          regular_op_cost: "Gas",
          return_data_per_byte_cost: "Gas",
          event_data_per_byte_cost: "Gas",
          event_per_topic_cost: "Gas",
          event_base_cost: "Gas",
          call_base_cost: "Gas",
          instantiate_base_cost: "Gas",
          dispatch_base_cost: "Gas",
          sandbox_data_read_cost: "Gas",
          sandbox_data_write_cost: "Gas",
          transfer_cost: "Gas",
          instantiate_cost: "Gas",
          max_event_topics: "u32",
          max_stack_height: "u32",
          max_memory_pages: "u32",
          max_table_size: "u32",
          enable_println: "bool",
          max_subject_len: "u32"
        },
        NftItemType: {
          Collection: "u64",
          Owner: "AccountId",
          Data: "Vec<u8>"
        },
        CollectionType: {
          Owner: "AccountId",
          NextItemId: "u64",
          Name: "Vec<u16>",
          Description: "Vec<u16>",
          TokenPrefix: "Vec<u8>",
          CustomDataSize: "u32",
          Sponsor: "AccountId",
          UnconfirmedSponsor: "AccountId"
        },
        Address: "AccountId",
        LookupSource: "AccountId",
        Weight: "u64"
      }
    });

    return api;
  }

  async loadPunkFromChain(endpoint, collectionId, punkId) {
    console.log(`Loading punk ${punkId} from collection ${collectionId}`);

    const api = await this.getApi(endpoint);
    const item = await api.query.nft.nftItemList(collectionId, punkId);
    // console.log("Received item: ", item);

    let attrArray = [];
    for (let i=0; i<7; i++) {
      if (item.Data[i+3] != 255)
        attrArray.push(attributes[item.Data[i+3]]);
    }

    return {
      originalId : item.Data[0] + item.Data[1] * 256,
      owner: item.Owner.toString(),
      sex: (item.Data[2] == 1) ? "Female" : "Male",
      attributes: attrArray
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

  claimAsync(endpoint, contractAddress, collectionId, punkId, claimerAddress) {

    console.log(`Claiming punk ${punkId} in collection ${collectionId} by ${claimerAddress}`);

    const contractAbi = {
      "registry": {
        "strings": [
          "Storage",
          "calls",
          "__ink_private",
          "__ink_storage",
          "claim_status",
          "HashMap",
          "ink_core",
          "storage",
          "collections",
          "hash_map",
          "impls",
          "len",
          "Value",
          "value",
          "cell",
          "SyncCell",
          "sync_cell",
          "Key",
          "ink_primitives",
          "entries",
          "SyncChunk",
          "chunk",
          "sync_chunk",
          "Entry",
          "Occupied",
          "OccupiedEntry",
          "key",
          "val",
          "Removed",
          "cells_key",
          "new",
          "claim",
          "collection_id",
          "u64",
          "item_id",
          "new_owner",
          "AccountId",
          "bool"
        ],
        "types": [
          {
            "id": {
              "custom.name": 1,
              "custom.namespace": [
                2,
                2,
                3,
                4
              ],
              "custom.params": []
            },
            "def": {
              "struct.fields": [
                {
                  "name": 5,
                  "type": 2
                }
              ]
            }
          },
          {
            "id": {
              "custom.name": 6,
              "custom.namespace": [
                7,
                8,
                9,
                10,
                11
              ],
              "custom.params": [
                3,
                4
              ]
            },
            "def": {
              "struct.fields": [
                {
                  "name": 12,
                  "type": 5
                },
                {
                  "name": 20,
                  "type": 11
                }
              ]
            }
          },
          {
            "id": "u64",
            "def": "builtin"
          },
          {
            "id": "bool",
            "def": "builtin"
          },
          {
            "id": {
              "custom.name": 13,
              "custom.namespace": [
                7,
                8,
                14
              ],
              "custom.params": [
                6
              ]
            },
            "def": {
              "struct.fields": [
                {
                  "name": 15,
                  "type": 7
                }
              ]
            }
          },
          {
            "id": "u32",
            "def": "builtin"
          },
          {
            "id": {
              "custom.name": 16,
              "custom.namespace": [
                7,
                8,
                15,
                17
              ],
              "custom.params": [
                6
              ]
            },
            "def": {
              "struct.fields": [
                {
                  "name": 15,
                  "type": 8
                }
              ]
            }
          },
          {
            "id": {
              "custom.name": 18,
              "custom.namespace": [
                19
              ],
              "custom.params": []
            },
            "def": {
              "tuple_struct.types": [
                9
              ]
            }
          },
          {
            "id": {
              "array.len": 32,
              "array.type": 10
            },
            "def": "builtin"
          },
          {
            "id": "u8",
            "def": "builtin"
          },
          {
            "id": {
              "custom.name": 21,
              "custom.namespace": [
                7,
                8,
                22,
                23,
                22
              ],
              "custom.params": [
                12
              ]
            },
            "def": {
              "struct.fields": [
                {
                  "name": 30,
                  "type": 8
                }
              ]
            }
          },
          {
            "id": {
              "custom.name": 24,
              "custom.namespace": [
                7,
                8,
                9,
                10,
                11
              ],
              "custom.params": [
                3,
                4
              ]
            },
            "def": {
              "enum.variants": [
                {
                  "tuple_struct_variant.name": 25,
                  "tuple_struct_variant.types": [
                    13
                  ]
                },
                {
                  "unit_variant.name": 29
                }
              ]
            }
          },
          {
            "id": {
              "custom.name": 26,
              "custom.namespace": [
                7,
                8,
                9,
                10,
                11
              ],
              "custom.params": [
                3,
                4
              ]
            },
            "def": {
              "struct.fields": [
                {
                  "name": 27,
                  "type": 3
                },
                {
                  "name": 28,
                  "type": 4
                }
              ]
            }
          },
          {
            "id": {
              "array.len": 32,
              "array.type": 10
            },
            "def": "builtin"
          }
        ]
      },
      "storage": {
        "struct.type": 1,
        "struct.fields": [
          {
            "name": 5,
            "layout": {
              "struct.type": 2,
              "struct.fields": [
                {
                  "name": 12,
                  "layout": {
                    "struct.type": 5,
                    "struct.fields": [
                      {
                        "name": 15,
                        "layout": {
                          "range.offset": "0x0000000000000000000000000000000000000000000000000000000000000000",
                          "range.len": 1,
                          "range.elem_type": 6
                        }
                      }
                    ]
                  }
                },
                {
                  "name": 20,
                  "layout": {
                    "range.offset": "0x0000000000000000000000000000000000000000000000000000000000000001",
                    "range.len": 4294967295,
                    "range.elem_type": 12
                  }
                }
              ]
            }
          }
        ]
      },
      "contract": {
        "name": 2,
        "constructors": [
          {
            "name": 31,
            "selector": "[\"0x5E\",\"0xBD\",\"0x88\",\"0xD6\"]",
            "args": [],
            "docs": []
          }
        ],
        "messages": [
          {
            "name": 32,
            "selector": "[\"0x9C\",\"0x9A\",\"0x25\",\"0xB9\"]",
            "mutates": true,
            "args": [
              {
                "name": 33,
                "type": {
                  "ty": 3,
                  "display_name": [
                    34
                  ]
                }
              },
              {
                "name": 35,
                "type": {
                  "ty": 3,
                  "display_name": [
                    34
                  ]
                }
              },
              {
                "name": 36,
                "type": {
                  "ty": 14,
                  "display_name": [
                    37
                  ]
                }
              }
            ],
            "return_type": {
              "ty": 4,
              "display_name": [
                38
              ]
            },
            "docs": [
              "Transfers token to claimer (`new_owner`) if token belongs to the collection admin"
            ]
          }
        ],
        "events": [],
        "docs": []
      }
    };

    let that = this;
  
    return new Promise(async function(resolve, reject) {

      try {
        const api = await that.getApi(endpoint);
        const abi = new Abi(api.registry, contractAbi);
      
        const value = 0;
        const maxgas = 1000000000000;
      
        console.log(Object.keys(abi.messages));

        const injector = await web3FromAddress(claimerAddress);
        api.setSigner(injector.signer);
      
        // Need to use punkId+1 to map between original punk IDs and NDT module punk IDs, which start from 1.
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
        reject();
      }
  
    });
   

  }









}

window.nft = nft;

// async function test() {
//   let n = new nft();
//   const punk = await n.loadPunkFromChain('ws://127.0.0.1:9944', 1, 1);
//   console.log(punk);
// }

// test().catch(console.error).finally(() => process.exit());

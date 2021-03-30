const { getUniqueConnection, scanNftBlock } = require('./list_claims_library');
const delay = require('delay');

async function handleUnique() {
  const api = await getUniqueConnection();  
  let lastNftBlock = 510190;
  
  const finalizedHashNft = await api.rpc.chain.getFinalizedHead();
  const signedFinalizedBlockNft = await api.rpc.chain.getBlock(finalizedHashNft);
  

  while (true) {
    try {
      if (lastNftBlock + 1 <= signedFinalizedBlockNft.block.header.number) {

        // Handle NFT Deposits (by analysing block transactions)
        lastNftBlock++;
        await scanNftBlock(api, lastNftBlock);
      } else break;

    } catch (ex) {
      console.log(ex);
      await delay(1000);
    }
  }
}

async function main() {
  await handleUnique();
}

main().catch(console.error).finally(() => process.exit());
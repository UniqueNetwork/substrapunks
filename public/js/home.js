function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

window.onload = async function() {
 try {
   let n = new nft();

   // Fill random punks
   let randompunks = document.getElementById('randompunks');
   let randompunksHtml = "";

   for (let i=0; i < 12; i++) {
     let id = getRandomInt(n.getPunkCount()) + 1;
     const punk = await n.loadPunkFromChain(id);

     // Add price if punk is for sale
     if (punk.owner === n.getVaultAddress()) {
       const ask = await n.getTokenAsk(id);
       if (ask) {
         punk.owner = ask.owner;
         punk.price = ask.price;
       }
     }

     randompunksHtml += getPunkCard(id, punk);
   }
   randompunks.innerHTML = randompunksHtml;
 } catch (e) {
   console.log('home page initialization error', e);
 }
};

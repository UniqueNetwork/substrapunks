function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

window.onload = async function() {
  let n = new nft();

  // Fill random punks
  let randompunks = document.getElementById('randompunks');
  let randompunksHtml = "";
  for (let i=0; i<12; i++) {
    let id = getRandomInt(n.getPunkCount()) + 1;
    const punk = await n.loadPunkFromChain(id);
    randompunksHtml += getPunkCard(id, punk);
  }
  randompunks.innerHTML = randompunksHtml;
}

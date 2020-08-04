//////////////////////////////////////////////////
// Blockchain setup

// Production
const network = "wss://unique.usetech.com";
const collectionId = 1;
const adminAddr = "5ELxbXMMqMM25hbLVMVh6UqN9MiqFXFCBWAxbmtJBLvZxADo";
const contractAddr = "5DWLt51Js2fRxEkgyzN85EGVkHcP7YUujVeRYj65zTV1tR8G";

// Local
// const network = "ws://127.0.0.1:9944";
// const collectionId = 1;
// const adminAddr = "5EX7TXyGRD5z2gLVc2yRAFY6pym2HHhMVCb3Zj3ai3x6BUnd";
// const contractAddr = "5CJNwaKqQoi8D1VLvP59VwEfdWiTYF1QLXsRwW6A5uGEPrh2";

//////////////////////////////////////////////////


function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function isOwned(punk) {
  return (adminAddr != punk.owner);
}

window.onload = async function() {
  // Fill random punks
  let randompunks = document.getElementById('randompunks');
  let randompunksHtml = "";
  for (let i=0; i<12; i++) {
    let id = getRandomInt(1000);

    let backgroundColor = 'd6adad';
    const punk = await new nft().loadPunkFromChain(network, collectionId, id+1);
    if (isOwned(punk)) {
      backgroundColor = 'adc9d6';
    }
  
    let html = `
      <div class="col-md-2 col-sm-3 col-xs-6" style='line-height: 1.2em; margin-top: 20px; min-height: 240px'>
        <div><a title="Punk #${id}" href="details.html?id=${id}" ><img src="images/punks/punk${id}.png" width="144" height="144" alt="Punk ${id}" class="pixelated" style="background: #${backgroundColor}"></a></div>
        <div style='margin-top: 10px;'><a href="details.html?id=${id}">#${id}</a></div>
      </div>
    `;
    randompunksHtml += html;
  }
  randompunks.innerHTML = randompunksHtml;
}

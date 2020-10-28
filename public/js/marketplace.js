const limitCount = 200;
let addrList = []; // List of extension addresses

function showExtensionWarning() {
  try {
    document.getElementById("extensionWarning").style.display = "block";
  } catch (e) {
    console.log('showExtensionWarning error', e);
  }
}

async function showTokensForSale() {
  try {
    let n = new nft();
    const marketNfts = await n.getRecentAsks(addrList[0]);

    let listhtml = "";
    for (let i=0; i<marketNfts.length; i++) {
      const id = marketNfts[i].id;
      const punk = await n.loadPunkFromChain(id);
      punk["price"] = marketNfts[i].price;
      console.log("Owner: ", marketNfts[i].owner);
      console.log("Addr list: ", addrList, addrList.includes(marketNfts[i].owner));
      listhtml += getPunkCard(id, punk, addrList.includes(marketNfts[i].owner));
      document.getElementById("tokenlist").innerHTML = listhtml;
    }
    if (marketNfts.length == 0)
      listhtml = "None available, come back later!";

    document.getElementById("tokenlist").innerHTML = listhtml;
  } catch (e) {
    console.log('showTokensForSale error', e);
  }
}

window.onclick = function(event) {
  try {
    if (event.target === document.getElementById("extensionWarning")) {
      document.getElementById("extensionWarning").style.display = "none";
    }
  } catch (e) {
    console.log('extensionWarning click error', e);
  }
};

window.onload = async function() {
  try {
    const limit = document.getElementById("limit");
    limit.innerHTML = limitCount;

    let n = new nft();
    let extensionPresent = await n.checkExtension();
    if (!extensionPresent) {
      showExtensionWarning();
    } else {
      const accounts = await n.getWalletAddresses();
      for(let i=0; i<accounts.length; i++) {
        let addr = accounts[i];
        addrList.push(addr.address);
      }
    }

    showTokensForSale().then();
  } catch (e) {
    console.log('marketplace initialization error', e);
  }
};

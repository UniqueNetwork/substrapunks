let punkId = 0;
let addrList = []; // List of extension addresses


function setPunkImage() {
  try {
    let img = document.getElementById("punkImg");
    img.src = `images/punks/image${punkId}.png`
  } catch (e) {
    console.log('setPunkImage error', e);
  }
}

function showError() {
  try {
    const tokenListBlock = document.getElementById("tokenlist");
    if (tokenListBlock) {
      tokenListBlock.innerHTML = "Oops, something went wrong! Please, refresh this page!";
    }
  } catch (e) {
    console.log('showError error', e);
  }
}

function showExtensionWarning() {
  try {
    document.getElementById("punkDetails").style.display = "none";
    document.getElementById("extensionWarning").style.display = "block";
  } catch (e) {
    console.log('showExtensionWarning error', e);
    showError();
  }
}

async function showPunksFromAddresses() {
  try {
    let address = document.getElementById("address").value;
    setCookie("userSelectedAddress", address, 365);
    document.getElementById("tokenlist").innerHTML = "Loading data from Blockchain...";

    // Request address punks from blockchain
    let n = new nft();
    let nfts = await n.getAddressTokens(address);
    let marketNfts = await n.getAddressTokensOnMarket(address);
    let listhtml = "";

    for (let i = marketNfts.length - 1; i >= 0; i--) {
      const id = marketNfts[i].id;
      const punk = {
        price: marketNfts[i].price,
        isOwned: true
      }
      punk["price"] = marketNfts[i].price;
      listhtml += getPunkCard(id, punk, true);
      document.getElementById("tokenlist").innerHTML = listhtml;
    }

    for (let i = nfts.length-1; i >=0 ; i--) {
      const id = nfts[i];
      const punk = {
        isOwned: true
      }
      listhtml += getPunkCard(id, punk, false);
      document.getElementById("tokenlist").innerHTML = listhtml;
    }

    if (marketNfts.length + nfts.length === 0) {
      listhtml = "No tokens in the wallet. :( Check out the <a href='index.html'>Marketplace</a>";
    }

    document.getElementById("tokenlist").innerHTML = listhtml;
  } catch (e) {
    console.log('showPunksFromAddresses error', e);
    showError();
  }
}

window.onload = async function() {

  let url = new URL(window.location);
  punkId = parseInt(url.searchParams.get("id"));

  // setPunkImage();
  // setTitle();

 try {
   let n = new nft();
   let extensionPresent = await n.checkExtension();

   if (!extensionPresent) {
     showExtensionWarning();
   } else {
     // Populate addresses from extension
     addrList = await n.getWalletAddresses();

     console.log(addrList);

     let sel = document.getElementById('address');
     for(let i=0; i < addrList.length; i++)
     {
       let addr = addrList[i];
       console.log(addr);
       var opt = document.createElement("option");
       opt.value= addr.address;
       opt.innerHTML = `${addr.meta.name} - ${addr.address}`;
       sel.appendChild(opt);
     }

     let userSelectedAddress = getCookie('userSelectedAddress');
     if (userSelectedAddress) {
       sel.value = userSelectedAddress;
     }

     if (addrList.length >= 1) {
       showPunksFromAddresses().then();
     }

     // Show punk info
     // await getPunkInfo(punkId);
   }
 } catch (e) {
   console.log('my page initialization error', e);
   showError(e);
 }


};

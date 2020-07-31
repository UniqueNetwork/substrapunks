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

let punkId = 0;
let addrList = []; // List of extension addresses

function isOwned(punk) {
  return (adminAddr != punk.owner);
}

async function getPunkInfo(endpoint, collectionId, punkId) {
  // Need to use punkId+1 here to map between original punk IDs and NDT module punk 
  // IDs, which start from 1.
  const punk = await new nft().loadPunkFromChain(endpoint, collectionId, punkId+1);
  console.log(punk);

  let gender = document.getElementById('gender');
  gender.innerHTML = punk.sex;

  let accHtml = '';
  for (let i=0; i<punk.attributes.length; i++) {
    accHtml += `<div class='col-md-4'><p>${punk.attributes[i]}</p></div>`;
  }
  document.getElementById('accessories').innerHTML = accHtml;

  let ownershipHtml = '';
  if (isOwned(punk)) {
    let isYou = false;
    for(let i=0; i<addrList.length; i++)
    {
      let addr = addrList[i].address;
      if (addr == punk.owner)
        isYou = true;
    }

    if (isYou)
      ownershipHtml += `<h4>Owner - You own it! (address ${punk.owner})</h4>`;
    else 
      ownershipHtml += `<h4>Owner - someone else: ${punk.owner}</h4>`;
  } else {
    ownershipHtml += `<h4>This punk is Free, claim ${(punk.sex == "Female") ? "her":"him"}!</h4>`;
    ownershipHtml += `<button onclick='claim();'>Claim</button>`;
  }

  document.getElementById('ownership').innerHTML = ownershipHtml;
}

function claim() {
  document.getElementById('ownership').style.display = "none";
  document.getElementById('claim').style.display = "block";
}

async function claimtx() {
  document.getElementById('claim').style.display = "none";
  document.getElementById('claimprogress').style.display = "block";
  let newOwner = document.getElementById("newowner").value;

  try {
    await new nft().claimAsync(network, contractAddr, collectionId, punkId+1, newOwner);
  }
  catch (err) {
    alert('There was an error:', err);
  }

  window.location=`details.html?id=${punkId}`;
}

function setPunkImage() {
  let img = document.getElementById("punkImg");
  img.src = `images/punks/punk${punkId}.png`
}
function setTitle() {
  let title = document.getElementById("title");
  title.innerHTML = `CryptoPunk #${punkId}`;
}
function showExtensionWarning() {
  document.getElementById("punkDetails").style.display = "none";
  document.getElementById("extensionWarning").style.display = "block";
}

window.onload = async function() {

  let url = new URL(window.location);
  punkId = parseInt(url.searchParams.get("id"));

  setPunkImage();
  setTitle();

  let n = new nft();
  let extensionPresent = await n.checkExtension();
  if (!extensionPresent) {
    showExtensionWarning();
  } else {
    // Populate addresses from extension
    addrList = await n.getWalletAddresses();
    console.log(addrList);

    let sel = document.getElementById('newowner');
    for(let i=0; i<addrList.length; i++)
    {
      let addr = addrList[i];
      console.log(addr);
      var opt = document.createElement("option");
      opt.value= addr.address;
      opt.innerHTML = `${addr.meta.name} - ${addr.address}`;
      sel.appendChild(opt);
    }    

    // Show punk info
    await getPunkInfo(network, collectionId, punkId);
  }


}

let punkId = 0;
let addrList = []; // List of extension addresses

async function getPunkInfo(punkId) {
  // IDs, which start from 1.
  const punk = await new nft().loadPunkFromChain(punkId);
  console.log(punk);

  if (!isNaN(punk.originalId)) {
    let gender = document.getElementById('gender');
    gender.innerHTML = punk.sex;
  
    let accHtml = '';
    for (let i=0; i<punk.attributes.length; i++) {
      accHtml += `<div class='col-md-4'><p>${punk.attributes[i]}</p></div>`;
    }
    document.getElementById('accessories').innerHTML = accHtml;
  
    let ownershipHtml = '';
    if (punk.isOwned) {
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
      ownershipHtml += `<button onclick='claim();' class='btn'>Claim</button>`;
    }
  
    document.getElementById('ownership').innerHTML = ownershipHtml;
  }
  else {
    let title = document.getElementById("title");
    title.innerHTML = `Punk ${punkId} does not exist :(`;
  }
}

function claim() {
  document.getElementById('ownership').style.display = "none";
  document.getElementById('claim').style.display = "block";
}

async function claimtx() {
  document.getElementById('claim').style.display = "none";
  document.getElementById('claimprogress').style.display = "block";
  let newOwner = document.getElementById("newowner").value;

  let errMsg = "";
  try {
    let n = new nft();
    if (await n.getBalance(newOwner) == "0") throw "You need some Unique token balance in order to run a transaction. Please use a Faucet or contact us at our Telegram channel in order to get some";

    await n.claimAsync(punkId, newOwner);
  }
  catch (err) {
    errMsg = `<p style='color:red;'>Something went wrong: ${err}. You may want to try again.</p>`;
  }

  await getPunkInfo(punkId);
  document.getElementById('error').innerHTML = errMsg;
  document.getElementById('ownership').style.display = "block";
  document.getElementById('claim').style.display = "none";
  document.getElementById('claimprogress').style.display = "none";
}

function setPunkImage() {
  let img = document.getElementById("punkImg");
  img.src = `images/punks/image${punkId}.png`
}
function setTitle() {
  let title = document.getElementById("title");
  title.innerHTML = `SubstraPunk #${punkId}`;
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
    await getPunkInfo(punkId);
  }


}

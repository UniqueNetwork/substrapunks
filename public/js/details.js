let punkId = 0;
let addrList = []; // List of extension addresses
let punk;
let marketContract;

function resetView() {
  document.getElementById("punkDetails").style.display = "block";
  document.getElementById("ownership").style.display = "block";
  document.getElementById("extensionWarning").style.display = "none";
  document.getElementById("claim").style.display = "none";
  document.getElementById("progress").style.display = "none";
  document.getElementById("trading").style.display = "none";
  document.getElementById("tradeDetails").style.display = "none";
  document.getElementById("walletselector").style.display = "none";
}

function isMyPunk(punk) {
  let isMy = false;
  for(let i=0; i<addrList.length; i++)
  {
    let addr = addrList[i].address;
    if (addr == punk.owner)
      isMy = true;
  }
  return isMy;
}

function showClaimSection(punk) {
  let ownershipHtml = "";
  ownershipHtml += `<h4>This punk is Free, claim ${(punk.sex == "Female") ? "her":"him"}!</h4>`;
  ownershipHtml += `<button onclick='claim();' class='btn'>Claim</button>`;
  document.getElementById('ownership').innerHTML = ownershipHtml;
}

function showIOwnIt(punk) {
  document.getElementById('ownership').innerHTML = `<p><b>You own it!</b> (address ${punk.owner})</p>`;
}

function showSomeoneElseOwnsIt(punk) {
  document.getElementById('ownership').innerHTML = `<h4>Owner - someone else: ${punk.owner}</h4>`;
}

function expandTradeSection() {
  resetView();
  document.getElementById("trading").style.display = "none";
  document.getElementById('tradeDetails').style.display = "block";
}

function showTradeSection() {
  document.getElementById("trading").style.display = "block";
  const ownershipHtml = `
  <h4>... so what's next?</h4>
  <p>
    <button onclick='expandTradeSection();' class="btn">Trade</button>
  </p>
  <p>Also you can use the <a href="https://uniqueapps.usetech.com/#/nft">NFT Wallet</a> to find SubstraPunks collection (search for Collection <b>#4</b> there) and transfer your character to someone else. By the way, the transfers for SubstraPunks collection are free!</p>
  `;
  document.getElementById('trading').innerHTML = ownershipHtml;
}

function showCancelSection() {
  document.getElementById("trading").style.display = "block";
  const ownershipHtml = `
  <h4>... and you have put it on sale.</h4>
  <p>
    <button onclick='canceltx();' class="btn">Cancel Sale</button>
  </p>
  `;
  document.getElementById('trading').innerHTML = ownershipHtml;
}

function showBuySection() {
  document.getElementById("trading").style.display = "block";
  document.getElementById("walletselector").style.display = "block";

  const ownershipHtml = `
  <h4>... but it's for sale for ${punk.price} KSM, yay!</h4>
  <p>
    <button onclick='buytx();' class="btn">Buy - ${punk.price} KSM</button>
  </p>
  `;
  document.getElementById('trading').innerHTML = ownershipHtml;
}



async function getPunkInfo(punkId) {
  // IDs, which start from 1.
  let n = new nft();
  punk = await n.loadPunkFromChain(punkId);
  console.log(punk);

  if (!isNaN(punk.originalId)) {
    let gender = document.getElementById('gender');
    gender.innerHTML = punk.sex;
  
    let accHtml = '';
    for (let i=0; i<punk.attributes.length; i++) {
      accHtml += `<div class='col-md-4'><p>${punk.attributes[i]}</p></div>`;
    }
    document.getElementById('accessories').innerHTML = accHtml;

    // Replace owner if punk is for sale
    let punkIsOnSale = false;
    if (punk.owner == n.getVaultAddress()) {
      const ask = await n.getTokenAsk(punkId);
      punk.owner = ask.owner;
      punk.price = ask.price;
      punkIsOnSale = true;
    }

    // Show the ownership
    if (punk.isOwned) {
      if (isMyPunk(punk))
        showIOwnIt(punk);
      else
        showSomeoneElseOwnsIt(punk);
    } else {
      // Punk is not claimed yet
      showClaimSection(punk);
    }

    // Determine punk trading status and display corresponding section
    if (punkIsOnSale) {
      if (isMyPunk(punk)) {
        showCancelSection();
      } else {
        showBuySection();
      }      
    } else {
      if (isMyPunk(punk)) {
        showTradeSection(punk);
      }
    }
    

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
  document.getElementById('progress').style.display = "block";
  let newOwner = document.getElementById("newowner").value;

  let errMsg = "";
  try {
    let n = new nft();
    if (await n.getBalance(newOwner) == "0") throw `
      You need some Unique token balance in order to run a transaction.<br/>
      <br/>
      You can use our <a href='https://t.me/UniqueFaucetBot'>Telegram Unique Faucet Bot</a> to get a little Unique<br/>
    `;
    await n.claimAsync(punkId, newOwner);
  }
  catch (err) {
    errMsg = `<p style='color:red;'>Something went wrong: ${err} <br/><br/>You may want to try again.<br/><br/></p>`;
  }

  await getPunkInfo(punkId);
  document.getElementById('error').innerHTML = errMsg;
  document.getElementById('ownership').style.display = "block";
  document.getElementById('claim').style.display = "none";
  document.getElementById('progress').style.display = "none";
}

async function tradetx() {
  document.getElementById('tradeDetails').style.display = "none";
  document.getElementById('progress').style.display = "block";
  document.getElementById('progress').innerHTML = "Mining transaction... You will be asked to sign twice (for deposit and for ask placement).";

  const price = document.getElementById('price').value;
  let owner = punk.owner;

  let errMsg = "";
  try {
    let n = new nft();
    if (await n.getBalance(owner) == "0") throw `
      You need some Unique token balance in order to run a transaction.<br/>
      <br/>
      You can use our <a href='https://t.me/UniqueFaucetBot'>Telegram Unique Faucet Bot</a> to get a little Unique<br/>
    `;
    if ((parseFloat(price) < 0.01) || (parseFloat(price) > 10000)) throw `
      Sorry, price should be in the range between 0.001 and 10000 KSM. You have input: ${parseFloat(price)}
    `;

    await n.trade(punkId, price, owner);

    window.location = `marketplace.html?owner=${owner}`;
  }
  catch (err) {
    errMsg = `<p style='color:red;'>Something went wrong: ${err} <br/><br/>You may want to try again.<br/><br/></p>`;
    document.getElementById('error').innerHTML = errMsg;
    document.getElementById('error').style.display = "block";
  }
}

async function canceltx() {
  document.getElementById('tradeDetails').style.display = "none";
  document.getElementById('progress').style.display = "block";

  let errMsg = "";
  try {
    let n = new nft();
    if (await n.getBalance(punk.owner) == "0") throw `
      You need some Unique token balance in order to run a transaction.<br/>
      <br/>
      You can use our <a href='https://t.me/UniqueFaucetBot'>Telegram Unique Faucet Bot</a> to get a little Unique<br/>
    `;

    await n.cancelAsync(punkId, punk.owner);

    document.getElementById('tradeDetails').innerHTML = "Cancellation complete. After the vault withdrawal (usually a few seconds) the token will return to you.";
    document.getElementById('tradeDetails').style.display = "block";
    document.getElementById('progress').style.display = "none";
    document.getElementById("trading").style.display = "none";
  }
  catch (err) {
    errMsg = `<p style='color:red;'>Something went wrong: ${err} <br/><br/>You may want to try again.<br/><br/></p>`;
    document.getElementById('error').innerHTML = errMsg;
    document.getElementById('error').style.display = "block";
  }
}

async function buytx() {
  document.getElementById('tradeDetails').style.display = "none";
  document.getElementById('progress').style.display = "block";
  let newOwner = document.getElementById("newowner").value;

  let errMsg = "";
  try {
    let n = new nft();
    if (await n.getBalance(newOwner) == "0") throw `
      You need some Unique token balance in order to run a transaction.<br/>
      <br/>
      You can use our <a href='https://t.me/UniqueFaucetBot'>Telegram Unique Faucet Bot</a> to get a little Unique<br/>
    `;

    // Check KSM balance
    let ksmBal = parseFloat(await n.getKsmBalance(newOwner));
    if (ksmBal < punk.price) {
      const vault = n.getVaultAddress();
      throw `
        Your KSM balance (${ksmBal} KSM) is too low to buy this item. You can deposit some KSM to this vault address: ${vault}
      `;
    }

    // Buy
    await n.buyAsync(punkId, newOwner);

    document.getElementById('tradeDetails').innerHTML = "Buy transaction is complete. After the vault withdrawal (usually a few seconds) the token will be yours.";
    document.getElementById('tradeDetails').style.display = "block";
    document.getElementById('progress').style.display = "none";
    document.getElementById("trading").style.display = "none";
    document.getElementById("walletselector").style.display = "none";
  }
  catch (err) {
    errMsg = `<p style='color:red;'>Something went wrong: ${err} <br/><br/>You may want to try again.<br/><br/></p>`;
    document.getElementById('error').innerHTML = errMsg;
    document.getElementById('error').style.display = "block";
  }
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
    marketContract = n.getMarketContract();

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

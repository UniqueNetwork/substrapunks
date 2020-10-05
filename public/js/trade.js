let punkId = 0;
let owner = "";

async function getPunkInfo(punkId) {
  // IDs, which start from 1.
  const punk = await new nft().loadPunkFromChain(punkId);

  if (!isNaN(punk.originalId)) {
    let gender = document.getElementById('gender');
    gender.innerHTML = punk.sex;
  
    let accHtml = '';
    for (let i=0; i<punk.attributes.length; i++) {
      accHtml += `<div class='col-md-4'><p>${punk.attributes[i]}</p></div>`;
    }
    document.getElementById('accessories').innerHTML = accHtml;
  }
  else {
    let title = document.getElementById("title");
    title.innerHTML = `Punk ${punkId} does not exist :(`;
  }
}

async function tradetx() {
  document.getElementById('txprogress').style.display = "block";
  const price = document.getElementById('price').value;
  console.log(price);

  let errMsg = "";
  try {
    let n = new nft();
    if (await n.getBalance(owner) == "0") throw `
      You need some Unique token balance in order to run a transaction.<br/>
      <br/>
      You can use our <a href='https://t.me/UniqueFaucetBot'>Telegram Unique Faucet Bot</a> to get a little Unique<br/>
    `;


    // вызвать транзакцию смартконтракта маркетплейса

    // await n.tradeAsync(punkId, owner, price);

    window.location = `/marketplace.html?owner=${owner}`;
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
  title.innerHTML = `Trade SubstraPunk #${punkId}`;
}
function showExtensionWarning() {
  document.getElementById("punkDetails").style.display = "none";
  document.getElementById("extensionWarning").style.display = "block";
}

window.onload = async function() {

  let url = new URL(window.location);
  punkId = parseInt(url.searchParams.get("id"));
  owner = url.searchParams.get("owner");

  setPunkImage();
  setTitle();

  let n = new nft();
  let extensionPresent = await n.checkExtension();
  if (!extensionPresent) {
    showExtensionWarning();
  } else {
    // Populate addresses from extension
    addrList = await n.getWalletAddresses();

    // Show punk info
    await getPunkInfo(punkId);
  }


}

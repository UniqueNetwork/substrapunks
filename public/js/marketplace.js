const limitCount = 200;
let addrList = []; // List of extension addresses

function showExtensionWarning() {
  document.getElementById("punkDetails").style.display = "none";
  document.getElementById("extensionWarning").style.display = "block";
}

async function update() {
  let n = new nft();

  let newOwner = document.getElementById("owner").value;
  document.getElementById('ksmbal').innerHTML = await n.getKsmBalance(newOwner);
  document.getElementById('kusamaVaultAddress').innerHTML = await n.getKusamaVaultAddress();
}

async function showTokensForSale() {
  let n = new nft();
  const marketNfts = await n.getRecentAsks(limit);

  let listhtml = "";
  for (let i=0; i<marketNfts.length; i++) {
    const id = marketNfts[i].id;
    const punk = await n.loadPunkFromChain(id);
    punk["price"] = marketNfts[i].price;
    listhtml += getPunkCard(id, punk);
    document.getElementById("tokenlist").innerHTML = listhtml;
  }
  if (marketNfts.length == 0)
    listhtml = "None available, come back later!";

  document.getElementById("tokenlist").innerHTML = listhtml;
}

function deposit() {
  document.getElementById("kusamaDeposit").style.display = "block";
}

function withdraw() {
  document.getElementById("withdrawButton").style.display = "none";
  document.getElementById("withdraw").style.display = "block";
}

async function withdrawtx() {
  document.getElementById("withdraw").style.display = "none";
  document.getElementById("progress").style.display = "block";

  let address = document.getElementById("owner").value;
  let amount = document.getElementById('amount').value;
  console.log(amount);

  let n = new nft();
  await n.withdrawAsync(amount, address);

  document.getElementById("progress").innerHTML = "Withdraw complete. Balance will appear on your address after processing in the vault (usually a few seconds).";
}

window.onclick = function(event) {
  if (event.target == document.getElementById("kusamaDeposit")) {
    document.getElementById("kusamaDeposit").style.display = "none";
  }
}

window.onload = async function() {

  const limit = document.getElementById("limit");
  limit.innerHTML = limitCount;

  let n = new nft();
  let extensionPresent = await n.checkExtension();
  if (!extensionPresent) {
    showExtensionWarning();
  } else {
    // Populate addresses from extension
    addrList = await n.getWalletAddresses();
    console.log(addrList);

    let sel = document.getElementById('owner');
    for(let i=0; i<addrList.length; i++)
    {
      let addr = addrList[i];
      console.log(addr);
      var opt = document.createElement("option");
      opt.value= addr.address;
      opt.innerHTML = `${addr.meta.name} - ${addr.address}`;
      sel.appendChild(opt);
    }    
  }

  update();
  showTokensForSale();

}

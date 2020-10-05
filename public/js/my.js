let punkId = 0;
let addrList = []; // List of extension addresses


function setPunkImage() {
  let img = document.getElementById("punkImg");
  img.src = `images/punks/image${punkId}.png`
}
function showExtensionWarning() {
  document.getElementById("punkDetails").style.display = "none";
  document.getElementById("extensionWarning").style.display = "block";
}
async function show() {
  let address = document.getElementById("address").value;

  // Request address punks from blockchain
  let n = new nft();
  const nfts = await n.getAddressTokens(address);

  let listhtml = "";
  for (let i=0; i<nfts.length; i++) {
    const id = nfts[i];
    const punk = await n.loadPunkFromChain(id);
    listhtml += getPunkCard(id, punk);
  }
  document.getElementById("tokenlist").innerHTML = listhtml;
}

window.onload = async function() {

  let url = new URL(window.location);
  punkId = parseInt(url.searchParams.get("id"));

  // setPunkImage();
  // setTitle();

  let n = new nft();
  let extensionPresent = await n.checkExtension();
  if (!extensionPresent) {
    showExtensionWarning();
  } else {
    // Populate addresses from extension
    addrList = await n.getWalletAddresses();
    console.log(addrList);

    let sel = document.getElementById('address');
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
    // await getPunkInfo(punkId);
  }


}

let punkId = 0;
let addrList = []; // List of extension addresses

function showError(msg) {
  try {
    const errMsg = `<p style='color:red;'>${msg}</p>`;
    document.getElementById('progress').style.display = "none";
    document.getElementById('msg').innerHTML = errMsg;
    document.getElementById('error').style.display = "block";
  } catch (e) {
    console.log('showError error', e);
    showError(e);
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

function updateProgress(msg) {
  try {
    document.getElementById('progress').innerHTML = `${msg}`;
  } catch (e) {
    showError(err);
  }
}

async function withdraw() {
  try {
    document.getElementById('progress').style.display = "block";
    document.getElementById('progress').innerHTML = "Mining transaction...";

    let n = new nft();
    let address = document.getElementById("address").value;
    const deposited = parseFloat(await n.getKsmBalance(address));
    console.log(`Withdrawing ${deposited}`);
    n.registerTxObserver(updateProgress);

    await n.withdrawAsync(deposited, address);
    pageState = 0;
  }
  catch (err) {
    showError(err);
  }
  finally {
    window.location = "index.html";
  }
}

async function showAddressInfo() {
  try {
    let address = document.getElementById("address").value;
    setCookie("userSelectedAddress", address, 365);

    document.getElementById("ksmdeposit").innerHTML = `You have previously deposited: ...`;
    const n = new nft();
    const deposited = parseFloat(await n.getKsmBalance(address));
    document.getElementById("ksmdeposit").innerHTML = `You have previously deposited: <b>${deposited} KSM</b> to escrow.`;
    document.getElementById("message").innerHTML = "Click withdraw if you'd like to get this KSM back to your Kusama wallet or just leave this page to keep this KSM in escrow to be used in the next trade(s).";

  } catch (e) {
    console.log('showAddressInfo error', e);
    showError();
  }
}

window.onclick = function(event) {
  try {
    if (event.target === document.getElementById("error") || event.target === document.getElementById("modal-error-hide-button")) {
      document.getElementById("error").style.display = "none";
    }
  } catch (e) {
    console.log('onclick error', e);
    showError(e);
  }
};


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
        showAddressInfo().then();
      }
    }
  } catch (e) {
    console.log('page initialization error', e);
    showError(e);
  }


};

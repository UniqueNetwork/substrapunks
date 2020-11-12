let punkId = 0;
let addrList = []; // List of extension addresses
let punk;
let marketContract;

const blackList = [ 7395, 1745, 8587, 573, 4732, 3248, 6986, 7202, 6079, 1732, 6494, 7553, 6840, 4541, 2102, 3503, 6560, 4269, 2659, 3912, 3470, 6290, 5811, 5209, 8322, 1813, 7771, 2578, 2661, 2983, 2119, 3310, 1547, 1740, 3187, 8194, 4651, 6188, 2167, 3487, 3106, 6070, 3446, 2407, 5870, 3745, 6389, 3246, 9385, 9680, 6457, 8462, 2350, 3927, 2269, 8485, 6198, 6787, 2047, 2197, 2379, 2466, 2558, 2682, 2759, 2979, 4232, 4273, 8187, 8190, 2935, 2673, 5228, 7683, 2075, 9845, 1645, 3198, 7490, 3192, 7907, 3167, 858, 239, 7613, 2790, 7043, 5536, 8277, 1134, 6378, 2416, 2373, 2240, 3952, 5017, 4999, 5986, 3159, 6155, 9329, 6445, 2117, 3935, 6091, 7841, 8725, 5194, 5744, 8120, 5930, 578, 6171, 6930, 2180, 6212, 5963, 7097, 8774, 5233, 7978, 2938, 2364, 1823, 1840, 8672, 5616, 737, 6122, 8769, 615, 9729, 3489, 427, 9883, 8678, 6579, 1776, 7061, 873, 5324, 2390, 6187, 9517, 2321, 3390, 3180, 6692, 2129, 9854, 1572, 7412, 3966, 1302, 1145, 1067, 3519, 7387, 8314, 648, 219, 2055, 825, 1195
];

function resetView() {
  try {
    document.getElementById("punkDetails").style.display = "block";
    document.getElementById("ownership").style.display = "block";
    document.getElementById("progress").style.display = "none";
    document.getElementById("trading").style.display = "none";
    document.getElementById("tradecontainer").style.display = "none";
    document.getElementById("ownershipcontainer").style.display = "block";
    document.getElementById('sellProgress').style.display = "none";
    document.getElementById('buyProgress').style.display = "none";
    document.getElementById("tradeTitle").innerHTML = "Selling this NFT";
    document.getElementById("walletselector").style.display = "none";
    document.getElementById("buy1").classList.remove("active");
    document.getElementById("buy2").classList.remove("active");
    document.getElementById("buy3").classList.remove("active");
    document.getElementById("sell1").classList.remove("active");
    document.getElementById("sell2").classList.remove("active");
    document.getElementById("sell3").classList.remove("active");
  } catch (e) {
    console.log('resetView error', e);
    showError(e);
  }
}

function isMyPunk(punk) {
  return (addrList.includes(punk.owner));
}

function showIOwnIt(punk) {
  try {
    let myPunksLink = '';
    if (justBought) myPunksLink = "Go to <a href='my.html'>My Punks</a> to see all your tokens";

    document.getElementById('ownership').innerHTML = `
      <p><b>You own it!</b> (address ${punk.owner})</p>
      ${myPunksLink}
    `;
  } catch (e) {
    console.log('showIOwnIt error', e);
    showError(e);
  }
}

function showSomeoneElseOwnsIt(punk) {
  try {
    if (punk.owner) document.getElementById('ownership').innerHTML = `<h4>Owner - someone else: ${punk.owner}</h4>`;
    else document.getElementById('ownership').innerHTML = `This NFT is in Escrow. This is temporary status. You can refresh this page in ~30 seconds for more details.`;
  } catch (e) {
    console.log('showSomeoneElseOwnsIt error', e);
    showError(e);
  }
}


////////////////////////////////////////////////////////////////////
// Page state

// 0 == user owns token, no offers placed
// 1 == user pressed Trade button
// 2 == token sent to vault, waiting for deposit (ownership cannot be determined)
// 3 == deposit ready, user can place ask
// 4 == Ask placed, user can cancel
// 5 == Someone else owns token, no offers placed
// 6 == Token is for sale, can buy
// 7 == User pressed buy button, should deposit KSM
// 8 == User deposited KSM, waiting to register
// 9 == KSM deposited, Can sign buy transaction
let pageState = 0; 
let justBought = false;

function displayPageState() {
  try {
    console.log("pageState: ", pageState);
    resetView();

    if (pageState === 0) {
      document.getElementById("trading").style.display = "none";
      document.getElementById('tradecontainer').style.display = "block";
      showIOwnIt(punk);
      showTradeSection();
      // No action, user will click the button
    }
    else if (pageState === 1) {
      document.getElementById("ownershipcontainer").style.display = "none";
      document.getElementById("trading").style.display = "none";
      document.getElementById('tradecontainer').style.display = "block";
      document.getElementById('sellProgress').style.display = "block";
      sellStep2();
    }
    else if ((pageState === 2) || (pageState === 3)) {
      document.getElementById("ownershipcontainer").style.display = "none";
      document.getElementById("trading").style.display = "none";
      document.getElementById('tradecontainer').style.display = "block";
      document.getElementById('sellProgress').style.display = "block";

      if (pageState === 2) sellStep3();
      if (pageState === 3) {
        document.getElementById("askPrice").style.display = "block";
      }
    }
    else if (pageState === 4) {
      document.getElementById("ownershipcontainer").style.display = "none";
      document.getElementById("trading").style.display = "block";
      document.getElementById('tradecontainer').style.display = "block";
      showCancelSection();
    }
    else if (pageState === 5) {
      document.getElementById("trading").style.display = "none";
      document.getElementById('tradecontainer').style.display = "none";
      showSomeoneElseOwnsIt(punk);
    }
    else if (pageState === 6) {
      document.getElementById("ownershipcontainer").style.display = "none";
      document.getElementById("tradecontainer").style.display = "block";
      document.getElementById("trading").style.display = "block";
      document.getElementById("tradeTitle").innerHTML = "Buying this NFT";
      showBuySection();
    }
    else if (pageState === 7) {
      document.getElementById("ownershipcontainer").style.display = "none";
      document.getElementById("trading").style.display = "none";
      document.getElementById('tradecontainer').style.display = "block";
      document.getElementById('buyProgress').style.display = "block";
      document.getElementById("tradeTitle").innerHTML = "Buying this NFT";
      buyStep2();
    } else if (pageState === 8) {
      document.getElementById("ownershipcontainer").style.display = "none";
      document.getElementById("trading").style.display = "none";
      document.getElementById('tradecontainer').style.display = "block";
      document.getElementById('buyProgress').style.display = "block";
      document.getElementById("buy1").classList.add("active");
      document.getElementById("tradeTitle").innerHTML = "Buying this NFT";
      buyStep3();
    } else if (pageState === 9) {
      document.getElementById("ownershipcontainer").style.display = "none";
      document.getElementById("trading").style.display = "none";
      document.getElementById('tradecontainer').style.display = "block";
      document.getElementById('buyProgress').style.display = "block";
      document.getElementById("buy1").classList.add("active");
      document.getElementById("buy2").classList.add("active");
      document.getElementById("tradeTitle").innerHTML = "Buying this NFT";
      buyStep4();
    }

    if (pageState > 1) document.getElementById("sell1").classList.add("active");
    if (pageState > 2) document.getElementById("sell2").classList.add("active");
    if (pageState > 3) document.getElementById("sell3").classList.add("active");
  } catch (e) {
    console.log('displayPageState error', e);
    showError(e);
  }
}

async function checkBalance(n, owner) {
  if (await n.getBalance(owner) == "0") throw `
    You need some Unique token balance in order to run a transaction.<br/>
    <br/>
    You can use our <a href='https://t.me/UniqueFaucetBot' target='_blank'>Telegram Unique Faucet Bot</a> to get a little Unique<br/>
  `;
}

async function checkKusamaBalance(n, owner, amount) {
  const bal = await n.getKusamaBalance(owner);
  console.log("Kusama balance: ", bal);
  console.log("Punk price: ", punk.price);
  if (bal < amount) throw `
    Your KSM balance is too low: ${bal}<br/>
    You need at least: ${amount} KSM<br/>
  `;
}

function expandTradeSectionAndStart() {
  pageState = 1;
  displayPageState();
}

function startBuy() {
  pageState = 7;
  displayPageState();
}

function showTradeSection() {
  try {
    document.getElementById("trading").style.display = "block";
    document.getElementById('trading').innerHTML = `
      <p>
        <button onclick='expandTradeSectionAndStart();' class="btn">Sell</button>
      </p>
      <p>Also you can use the <a href="https://uniqueapps.usetech.com/#/nft">NFT Wallet</a> to find SubstraPunks collection (search for Collection <b>#4</b> there) and transfer your character to someone else. By the way, the transfers for SubstraPunks collection are free!</p>
    `;
  } catch (e) {
    console.log('showTradeSection', e);
    showError(e);
  }
}

function showCancelSection() {
  try {
    document.getElementById('trading').innerHTML = `
      <p>
        <b>You own it!</b> (address ${punk.owner})</p><p>... and you have put it on sale. Give it a few minutes to appear in the <a href='index.html'>Marketplace</a>.
      </p>
      <p>
        <button onclick='canceltx();' class="btn">Cancel Sale</button>
        <button onclick='window.location="my.html"' class="btn">My Punks</button>
      </p>
    `;
  } catch (e) {
    console.log('showCancelSection error', e);
    showError(e);
  }
}

function getFee(price) {
  if (price <= 0.001) return 0;
  let fee = price * 0.02;
  // if (fee < 0.01) fee = 0.01;
  return fee;
}

function roundNum(num) {
  let roundedNum = '' + Math.round(num * 1000) / 1000;
  const dec = roundedNum.indexOf('.');
  if ((dec >= 0) && (roundedNum.length >= dec+4)) {
    roundedNum = roundedNum.substr(0, dec+4);
  }

  return roundedNum;
}

function showBuySection() {
  try {
    let fee = getFee(parseFloat(punk.price));

    document.getElementById("walletselector").style.display = "block";
    document.getElementById('trading').innerHTML = `
    <br/>
    <p>It's for sale for ${punk.price} KSM, yay!</p>
    <p>
      <button onclick='startBuy();' class="btn">Buy - ${roundNum(parseFloat(punk.price) + fee)} KSM</button>
      <p>Fee: <b>${roundNum(fee)}</b>, Price: <b>${punk.price}</b></p>
    </p>
  `;
  } catch (e) {
    console.log('showBuySection error', e);
    showError(e);
  }
}



async function getPunkInfo(punkId) {
  try {
    // IDs, which start from 1.
    let n = new nft();

    punk = await n.loadPunkFromChain(punkId);

    console.log(punk);

    if (!isNaN(punk.originalId)) {
      let gender = document.getElementById('gender');
      gender.innerHTML = punk.sex;

      let accHtml = '';

      for (let i=0; i < punk.attributes.length; i++) {
        accHtml += `<div class='col-md-4'><p>${punk.attributes[i]}</p></div>`;
      }

      document.getElementById('accessories').innerHTML = accHtml;

      let punkIsOnSale = false;

      if (punk.owner == n.getVaultAddress()) {
        punkIsOnSale = true;
        const ask = await n.getTokenAsk(punkId);
        console.log("ask: ", ask);

        if (ask) {
          punk.owner = ask.owner;
          punk.price = ask.price;
          pageState = 4;
        }
        else {
          // Get the owner from the deposit
          punk.owner = await n.getDepositor(punkId);
          if (punk.owner) pageState = 3;
          else pageState = 2;
        }
      }

      // Determine punk trading status (and state) and display corresponding section
      if (punkIsOnSale) {
        if (!isMyPunk(punk)) {
          if (pageState == 4) pageState = 6;
          else pageState = 5;
        }
      } else {
        // Show the ownership
        pageState = isMyPunk(punk) ? 0 : 5;
      }

    }
    else {
      let title = document.getElementById("title");
      title.innerHTML = `Punk ${punkId} does not exist :(`;
    }
  } catch (e) {
    console.log('getPunkInfo error', e);
    showError(e);
  }
}

function updateProgress(msg) {
  try {
    document.getElementById('progress').innerHTML = `${msg}`;
  } catch (e) {
    showError(err);
  }
}

async function sellStep2() {
  try {
    if (blackList.includes(punkId)) throw "This NFT was blacklisted from this marketplace due to fraudlent activities.";

    document.getElementById('progress').style.display = "block";
    document.getElementById('progress').innerHTML = "Mining transaction...";

    let owner = punk.owner;
    let n = new nft();
    n.registerTxObserver(updateProgress);
    await checkBalance(n, owner);

    // Transaction #1: Deposit NFT to the vault
    await n.depositAsync(punkId, owner);
    pageState = 2;
  }
  catch (err) {
    console.log('sellStep2 error', err);
    showError(err);
    pageState = 0;
  }
  finally {
    displayPageState();
  }
}

async function sellStep3() {
  try {
    document.getElementById('progress').style.display = "block";
    document.getElementById('progress').innerHTML = "Waiting for deposit to register in matching engine...";
    let n = new nft();
    n.registerTxObserver(updateProgress);
    // Step #2: Wait for Vault transaction
    punk.owner = await n.waitForDeposit(punkId, addrList);
    if (punk.owner) pageState = 3;
    else throw 'No connection to Unique node or market contract cannot be reached, try again later.';
  }
  catch (err) {
    console.log('sellStep3 error', err);
    showError(err);
  }
  finally {
    displayPageState();
  }
}

async function sellStep4() {
  try {
    document.getElementById('progress').style.display = "block";
    document.getElementById('progress').innerHTML = "Mining transaction...";
    document.getElementById('askPrice').style.display = "none";

    const price = document.getElementById('price').value;
    console.log('price: ', price);
    let owner = punk.owner;

    let n = new nft();
    n.registerTxObserver(updateProgress);
    if ((parseFloat(price) < 0.01) || (parseFloat(price) > 10000) || isNaN(parseFloat(price))) throw `
      Sorry, price should be in the range between 0.01 and 10000 KSM. You have input: ${price}
    `;

    // Step #3: Invoke ask method on market contract to set the price
    await n.trade(punkId, price, owner);
    pageState = 4;
  }
  catch (err) {
    showError(err);
  }
  finally {
    displayPageState();
  }
}

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

async function canceltx() {
  try {
    document.getElementById('tradecontainer').style.display = "block";
    document.getElementById('trading').style.display = "none";
    document.getElementById('progress').style.display = "block";
    document.getElementById('progress').innerHTML = "Mining transaction...";

    let n = new nft();
    n.registerTxObserver(updateProgress);
    await checkBalance(n, punk.owner);

    await n.cancelAsync(punkId, punk.owner);
    pageState = 0;
  }
  catch (err) {
    showError(err);
  }
  finally {
    displayPageState();
  }
}

async function buyStep2() {
  try {
    if (blackList.includes(punkId)) throw "This NFT was blacklisted from this marketplace due to fraudlent activities.";

    document.getElementById('progress').style.display = "block";
    let newOwner = document.getElementById("newowner").value;
    let n = new nft();
    n.registerTxObserver(updateProgress);
    await checkBalance(n, newOwner);

    // Check if KSM deposit is needed and deposit
    const deposited = parseFloat(await n.getKsmBalance(newOwner));
    console.log("Deposited KSM: ", deposited);
    const price = parseFloat(punk.price);
    const feeFull = getFee(price);
    const feePaid = getFee(deposited);
    if (deposited < price) {
      const fee = feeFull - feePaid;
      const needed = price + fee - deposited;
      await checkKusamaBalance(n, newOwner, needed + 0.003);
      await n.sendKusamaBalance(newOwner, n.getVaultAddress(), needed);
    }

    pageState = 8;
  }
  catch (err) {
    console.log(err);
    showError(err);
    pageState = 6;
  }
  finally {
    displayPageState();
  }
}

async function buyStep3() {
  try {
    document.getElementById('progress').style.display = "block";
    let newOwner = document.getElementById("newowner").value;

    let n = new nft();
    n.registerTxObserver(updateProgress);

    let deposited = 0;
    let block = 0;
    while (true) {
      deposited = parseFloat(await n.getKsmBalance(newOwner));
      if (deposited < parseFloat(punk.price)) {
        updateProgress(`Waiting for deposit: ${block} of 3 block(s) passed`);
        if (block < 3) block++;
        await n.delay(6000);
      } else break;
    }

    pageState = 9;
  }
  catch (err) {
    showError(err);
    pageState = 7;
  }
  finally {
    displayPageState();
  }
}


async function buyStep4() {
  try {
    document.getElementById('progress').style.display = "block";
    let newOwner = document.getElementById("newowner").value;

    let n = new nft();
    n.registerTxObserver(updateProgress);

    // Buy
    await n.buyAsync(punkId, newOwner);

    // Wait for the token to arrive
    let block = 0;
    while (true) {
      updateProgress(`Waiting for escrow to return NFT: ${block} of up to 3 block(s) passed`);
      await getPunkInfo(punkId);
      if (punk.owner == newOwner) break;
      await n.delay(6000);
      block++;
    }

    pageState = 0;
    justBought = true;
  }
  catch (err) {
    showError(err + ' (this may happen when two people are trying to buy one NFT at the same time). When you close this window, you will be forwarded to the page where you can get your KSM back.');
    pageState = 6;

    // Forward to oops page when error window is closed
    window.onclick = function(event) {
      try {
        if (event.target === document.getElementById("error") || event.target === document.getElementById("modal-error-hide-button")) {
          document.getElementById("error").style.display = "none";
          window.location = 'ksmreturn.html';
        }
      } catch (e) {
        console.log('onclick error', e);
        showError(e);
      }
    };
    
  }
  finally {
    await getPunkInfo(punkId);    
    displayPageState();
  }
}


function setPunkImage() {
  try {
    let img = document.getElementById("punkImg");
    img.src = `images/punks/image${punkId}.png`
  } catch (e) {
    console.log('setPunkImage error', e);
    showError(e);
  }
}
function setTitle() {
  try {
    let title = document.getElementById("title");
    title.innerHTML = `SubstraPunk #${punkId}`;
  } catch (e) {
    console.log('setTitle error', e);
    showError(e);
  }
}

function showExtensionWarning() {
  const msg = `
    <h3>Please enable Polkadot{.js} browser extension and create or import an address!</h3>
    <p>
        For <a href="https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopnmbcafieddcagagdcbnhejhlodfdd">Chrome</a><br>
        For <a href="https://addons.mozilla.org/en-US/firefox/addon/polkadot-js-extension/">Firefox</a>
    </p>
  `;
  showError(msg);
}

async function walletupdate() {
  try {
    let address = document.getElementById("newowner").value;
    setCookie("userSelectedAddress", address, 365);

    // Show KSM deposit
    const n = new nft();
    document.getElementById("ksmBalance").innerHTML = `KSM Balance: ...`;
    const balance = await n.getKusamaBalance(address);
    document.getElementById("ksmBalance").innerHTML = `KSM Balance: ${balance}`;
  } catch (e) {
    console.log('walletupdate error', e);
    showError(e);
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
  try {
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
      const accounts = await n.getWalletAddresses();

      let sel = document.getElementById('newowner');
      for(let i=0; i<accounts.length; i++)
      {
        let addr = accounts[i];
        addrList.push(addr.address);
        var opt = document.createElement("option");
        opt.value= addr.address;
        opt.innerHTML = `${addr.meta.name} - ${addr.address}`;
        sel.appendChild(opt);
      }

      let userSelectedAddress = getCookie('userSelectedAddress');
      if (userSelectedAddress) {
        sel.value = userSelectedAddress;
      }

      // Show punk info
      await getPunkInfo(punkId);

      if (blackList.includes(punkId)) showError("This NFT was blacklisted from this marketplace due to fraudlent activities. It will not be possible to buy or sell it.");
    }

    walletupdate();
    displayPageState();
  } catch (e) {
    console.log('initialization error', e);
  }
};

const limitCount = 100;
let addrList = []; // List of extension addresses
let marketNfts = null;
let traitFilter = [];
let traitCountFilter = [];
let sexFilter = [];

function showExtensionWarning() {
  try {
    document.getElementById("extensionWarning").style.display = "block";
  } catch (e) {
    console.log('showExtensionWarning error', e);
  }
}

function isFilterPassed(punk) {
  const attributes = [
    "Black Lipstick", "Red Lipstick", "Smile", "Teeth Smile", "Purple Lipstick",
    "Nose Ring", "Left Earring", "Right Earring", "Two Earrings", 
    "Asian Eyes", "Sun Glasses", "Red Glasses", "Round Eyes", 
    "Brown Beard", "Mustache-Beard", "Mustache", "Regular Beard", 
    "Up Hair", "Down Hair", "Mahawk", "Red Mahawk", "Orange Hair", "Bubble Hair", "Emo Hair", "Thin Hair", "Bald", "Blonde Hair", "Caret Hair", "Pony Tails",
    "Cigar", "Pipe"
  ];

  // Sex filter
  if (sexFilter.length > 0) {
    if (punk.sex == "Male" && !sexFilter.includes(2)) return false;
    else if (punk.sex == "Female" && !sexFilter.includes(1)) return false;
  }

  // Check trait count filter
  if (traitCountFilter.length > 0) {
    if (!traitCountFilter.includes(punk.attributes.length)) return false;
  }

  // Check trait filters
  let pass = false;
  if (traitFilter.length > 0) {
    for (let i=0; i<traitFilter.length; i++) {
      if (punk.attributes.includes(attributes[traitFilter[i]-1])) return true;
    }
  } else {
    pass = true;
  }
  
  return pass;
}

async function showTokensForSale() {
  try {
    if (!marketNfts) {
      let n = new nft();
      marketNfts = await n.getRecentAsks(addrList[0]);
    }

    let listhtml = "";
    let count = 0;
    for (let i=marketNfts.length-1; i>=0; i--) {
      if (isFilterPassed(marketNfts[i])) {
        const id = marketNfts[i].id;
        const punk = {
          price: marketNfts[i].price,
          isOwned: true
        }
        punk["price"] = marketNfts[i].price;
        listhtml += getPunkCard(id, punk, addrList.includes(marketNfts[i].owner));
        document.getElementById("tokenlist").innerHTML = listhtml;
        count++;
      }
      if (count >= limitCount) break;
    }
    if (count == 0)
      listhtml = "None available, come back later!";

    document.getElementById("tokenlist").innerHTML = listhtml;
  } catch (e) {
    console.log('showTokensForSale error', e);
  }
}

function composeFilter() {
  try {
    traitFilter = [];
    traitCountFilter = [];
    sexFilter = [];
    
    const traitNumber = 31;
    for (let i=1; i<=traitNumber; i++) {
      if (document.getElementById(`trait${i}`).checked)
        traitFilter.push(i);
    }

    const traitCountMax = 7;
    for (let i=1; i<=traitCountMax; i++) {
      if (document.getElementById(`traitcount${i}`).checked)
        traitCountFilter.push(i);
    }

    if (document.getElementById(`sexf`).checked)
      sexFilter.push(1);
    if (document.getElementById(`sexm`).checked)
      sexFilter.push(2);

  } catch (e) {
    console.log(e);
  }
}

let timeout = 0;
function applyFilter() {
  if (timeout > 0) clearTimeout(timeout);
  timeout = setTimeout(() => {
    composeFilter();
    showTokensForSale().then();
  }, 1000);
}

function expandFilter() {
  try {
    document.getElementById("filterBox").style.display =
      document.getElementById("filterBox").style.display == "block" ? "none" : "block";
  } catch (e) {
    console.log(e);
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

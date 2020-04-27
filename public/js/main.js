function isOwned(adminAddr, punk) {
  return (adminAddr != punk.owner);
}

async function getPunkInfo(endpoint, collectionId, punkId, adminAddr) {
  // Need to use punkId+1 here to map between original punk IDs and NDT module punk 
  // IDs, which start from 1.
  const punk = await new nft().loadPunkFromChain(endpoint, collectionId, punkId+1);

  let gender = document.getElementById('gender');
  gender.innerHTML = punk.sex;

  let accHtml = '';
  for (let i=0; i<punk.attributes.length; i++) {
    accHtml += `<div class='col-md-4'><p>${punk.attributes[i]}</p></div>`;
  }
  document.getElementById('accessories').innerHTML = accHtml;

  let ownershipHtml = '';
  if (isOwned(adminAddr, punk)) {
    ownershipHtml += `<h4>Owner: ${punk.owner}</h4>`;
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

async function claimtx(punkId) {
  document.getElementById('claim').style.display = "none";
  document.getElementById('claimprogress').style.display = "block";
    
  let newOwner = document.getElementById("newowner").value;
  let xmlhttp = new XMLHttpRequest();
  
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == XMLHttpRequest.DONE) {
      if (xmlhttp.status == 200) {
        window.location=`/details/${punkId}`;
      }
      else {
        alert('There was an error');
        window.location=`/details/${punkId}`;
      }
    }
  };
  
  xmlhttp.open("GET", `/claim/${punkId}/${newOwner}`, true);
  xmlhttp.send();  
}

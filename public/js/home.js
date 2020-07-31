function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

window.onload = function() {
  // Fill random punks
  let randompunks = document.getElementById('randompunks');
  let randompunksHtml = "";
  for (let i=0; i<12; i++) {
    let id = getRandomInt(1000);
    let html = `
      <div class="col-md-2 col-sm-3 col-xs-6" style='line-height: 1.2em; margin-top: 20px; min-height: 240px'>
        <div><a title="Punk #${id}" href="details.html?id=${id}" ><img src="images/punks/punk${id}.png" width="144" height="144" alt="Punk ${id}" class="pixelated" style="background: #95554f"></a></div>
        <div style='margin-top: 10px;'><a href="details.html?id=${id}">#${id}</a></div>
      </div>
    `;
    randompunksHtml += html;
  }
  randompunks.innerHTML = randompunksHtml;
}

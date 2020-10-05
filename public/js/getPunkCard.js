function getPunkCard(id, punk) {

  let status = "Claimed";
  if (true) {
    const price = "1.23 KSM";
    status = `For sale:<br/>${price}`;
  }

  let backgroundColor = 'd6adad';
  if (punk.isOwned) {
    backgroundColor = 'adc9d6';
  }

  let html = `
    <div class="col-md-2 col-sm-3 col-xs-6" style='line-height: 1.2em; margin-top: 20px; min-height: 200px'>
      <div><a title="Punk #${id}" href="details.html?id=${id}" ><img src="images/punks/image${id}.png" width="144" height="144" alt="Punk ${id}" class="pixelated" style="background: #${backgroundColor}"></a></div>
      <div style='margin-top: 10px;'><a href="details.html?id=${id}">#${id}</a></div>
      <div style='margin-top: 10px;'>${status}</div>
    </div>
  `;
    
  return html;
}

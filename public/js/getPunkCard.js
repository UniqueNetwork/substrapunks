function getPunkCard(id, punk, my) {

  let status = "Idle";

  if (punk.price) {
    if (my) {
      status = `I'm selling:<br/>${punk.price} KSM`;
    }
    else {
      status = `For sale:<br/>${punk.price} KSM`;
    }
  }

  let backgroundColor = 'd6adad';

  if (punk.isOwned) {
    backgroundColor = 'adc9d6';
  } if (punk.price) {
    backgroundColor = 'b8a7ce';
  }
    
  return `
    <div class="col-md-2 col-sm-3 col-xs-6" style='line-height: 1.2em; margin-top: 20px; min-height: 200px'>
      <div>
        <a title="Punk #${id}" href="details.html?id=${id}" >
          <img src="images/punks/image${id}.png" width="144" height="144" alt="Punk ${id}" class="pixelated" style="background: #${backgroundColor}">
        </a>
      </div>
      <div style='margin-top: 10px;'>
        <a href="details.html?id=${id}">#${id}</a>
      </div>
      <div style='margin-top: 10px;height:50px'>${status}</div>
    </div>
  `;
}

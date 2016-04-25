var gwUrlBase = "https://api.guildwars2.com/v2/";
var gwUrlPrices = "commerce/prices";
var gwUrlPaging = "?page_size=200&page=";
var gwPrices;

function getPrices(callback) {
  if gwPrices.length > 0 {
    callback();
    return;
  }
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      gwPrices = JSON.parse(xmlhttp.responseText);
      callback();
    }
  };
}
xmlhttp.open("GET", gwUrlBase + gwUrlPrices + gwUrlPaging + 0, true);
xmlhttp.send();
  
function removeNoDemand(currentValue,index,arr) {
  if (currentValue.buys.quantity == 0) {
    arr.splice(index, 1);
  }
}
  
function calculateSpread(currentValue) {
  currentValue.spread = currentValue.sells.unit_price -currentValue.buys.unit_price;
}
  
function comparePrices(arr1, arr2) {
  return (arr1.spread - arr2.spread);
}

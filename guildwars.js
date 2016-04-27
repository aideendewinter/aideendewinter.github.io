var gwUrlBase = "https://api.guildwars2.com/v2/";
var gwUrlPrices = "commerce/prices";
var gwUrlItems = "items"
var gwUrlIds = "?ids="
var gwUrlPaging = "?page_size=200&page=";
var gwPrices=[];
var gwPricesLoaded = false;
var gwPriceRequests = 0;

function getPrices(callback, page) {
  if (gwPricesLoaded) {
    callback();
    return;
  }
  gwPriceRequests++;
  if (page === undefined) {
    page = 0;
  }
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      gwPrices = gwPrices.concat(JSON.parse(xmlhttp.responseText));
      if (xmlhttp.getResponseHeader("X-Page-Total") > (page+1)) {
        getPrices(callback, page+1);
        gwPriceRequests--;
      } else {
        gwPriceRequests--;
        if (gwPriceRequests <= 0) {
          gwPricesLoaded=true;
          callback();
        }
      }
    }
  };
  xmlhttp.open("GET", gwUrlBase + gwUrlPrices + gwUrlPaging + page, true);
  xmlhttp.send();
}

function getItem(id, callback) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      var item = JSON.parse(xmlhttp.responseText);
      callback(item[0]);
    }
  };
  xmlhttp.open("GET", gwUrlBase + gwUrlItems + gwUrlIds + id, true);
  xmlhttp.send();
}

function hasDemand(currentValue) {
  return (currentValue.buys.quantity !== 0);
}

function hasSupply(currentValue) {
  return (currentValue.sells.quantity !== 0);
}
  
function calculateSpread(currentValue) {
  currentValue.spread = currentValue.sells.unit_price -currentValue.buys.unit_price;
}
  
function comparePrices(arr1, arr2) {
  return (arr1.spread - arr2.spread);
}

var gwUrlBase = "https://api.guildwars2.com/v2/";
var gwUrlPrices = "commerce/prices";
var gwUrlItems = "items"
var gwUrlIds = "?ids="
var gwUrlPaging = "?page_size=200&page=";
var gwPrices=[];
var gwPricesLoaded = false;

function getPrices(callback, page) {
  if (gwPricesLoaded) {
    callback();
    return;
  }
  if (page === undefined) {
    page = 0;
  }
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      gwPrices = gwPrices.concat(JSON.parse(xmlhttp.responseText));
      if (xmlhttp.getResponseHeader("X-Page-Total") > (page+1)) {
        getPrices(callback, page+1);
      } else {
        pricesLoaded = true;
        $("#loading-progess").text("Finished loading prices.");
        callback();
      }
    }
  };
  $("#loading-progess").text("Loading Prices Page " + page + ".");
  xmlhttp.open("GET", gwUrlBase + gwUrlPrices + gwUrlPaging + page, true);
  xmlhttp.send();
}

function getItem(id, callback) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      var item = JSON.parse(xmlhttp.responseText);
      $("#loading-progess").text("Loaded item.");
      callback(item[0]);
    }
  };
  $("#loading-progess").text("Loading item.");
  xmlhttp.open("GET", gwUrlBase + gwUrlItems + gwUrlIds + id, true);
  xmlhttp.send();
}

function removeNoDemand(currentValue,index,arr) {
  if (currentValue.buys.quantity == 0) {
    arr.splice(index, 1);
  }
}

function removeNoSupply(currentValue,index,arr) {
  if (currentValue.sells.quantity == 0) {
    arr.splice(index, 1);
  }
}
  
function calculateSpread(currentValue) {
  currentValue.spread = currentValue.sells.unit_price -currentValue.buys.unit_price;
}
  
function comparePrices(arr1, arr2) {
  return (arr1.spread - arr2.spread);
}

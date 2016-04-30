var gwUrlBase = "https://api.guildwars2.com/v2/";
var gwUrlPrices = "commerce/prices";
var gwUrlItems = "items"
var gwUrlIds = "?ids="
var gwUrlPaging = "?page_size=200&page=";
var gwPrices=[];
var gwPricesLoaded = false;
var gwPriceRequests = 0;
var priceSpread;

function makeRequest (method, url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send();
  });
}

$(document).ready(function(){
  getPrices(displayGreatestSpread);
});
    
function displayGreatestSpread(pricesSpread) {
  priceSpread = gwPrices.filter(hasDemand);
  priceSpread = priceSpread.filter(hasSupply);
  priceSpread.forEach(calculateSpread);
  priceSpread.sort(comparePrices);
  getItem(priceSpread[0].id, displayItem, "#current-item");
  getItem(priceSpread[1].id, displayItem, "#next-item");
}

function displayItem(item, boxId) {
  $("#item-name-GS").text(item.name);
  $("#item-icon-GS").attr("src", item.icon);
  $("#item-icon-GS").attr("alt", item.name + "'s Icon");
  $("#buy-price-GS").text(greatestSpread.buys.unit_price);
  $("#sell-price-GS").text(greatestSpread.sells.unit_price);
}

var getPrices = loadPrices();

function loadPrices() {
  var allPages = new Promise(function (resolve, reject) {
    var firstPage = makeRequest("GET", gwUrlBase + gwUrlPrices + gwUrlPaging + 0);
    firstPage.then(function(result){
      resolve(JSON.parse(result));
    }, function(err) {
      reject(err);
    });
  });
  return function(callback) {
    allPages.then(callback);
  };
}

function PriceReadyChange() {
  
}

function getItem(id, callback, boxId) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      var item = JSON.parse(xmlhttp.responseText);
      callback(item[0], boxId);
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
  return (arr2.spread - arr1.spread);
}

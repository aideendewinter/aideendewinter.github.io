// http://stackoverflow.com/questions/30008114/how-do-i-promisify-native-xhr
function makeRequest (method, url) {
	return new Promise(function (resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open(method, url);
		xhr.onload = function () {
			if (this.status >= 200 && this.status < 300) {
				resolve({
					respone: xhr.response,
					pageCount: xhr.getResponseHeader("X-Page-Total")
				});
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
// http://stackoverflow.com/questions/8034918/jquery-switch-elements-in-dom
function swapElements(elm1, elm2) {
    var parent1, next1,
        parent2, next2;

    parent1 = elm1.parentNode;
    next1   = elm1.nextSibling;
    parent2 = elm2.parentNode;
    next2   = elm2.nextSibling;

    parent1.insertBefore(elm2, next1);
    parent2.insertBefore(elm1, next2);
}

// My code.
// String constants for constructing GW API requests.
var gwUrlBase = "https://api.guildwars2.com/v2/";
var gwUrlPrices = "commerce/prices";
var gwUrlItems = "items"
var gwUrlCharacters = "characters"
var gwUrlIds = "?ids="
var gwUrlPaging = "?page_size=200&page=";
var gwUrlAuth = "?access_token=";

// Current index of priceSpread item.
var pS=0;
// Entry to AJAX code.
$(document).ready(function(){
	// Fetch GW Price data and display two greatest spreads.
	$('#craftingprofit').submit(function (evt) {
    	evt.preventDefault();
    	window.history.back();
	});
	getPrices(displayGreatestSpread);
	
	// Allow navigation of prices.
	$(".stack.next").on("click",function(){
		$(".stack.current").fadeOut();
		$(this).css("z-index", "1");
		$(this).animate({
			left: '0',
			bottom: $(".stack.current").innerHeight()
		}, stackForwardReset);
	});
	$(".stack.current").on("click",function(){
		$(".stack.next").fadeOut();
		var targetHeight = (60 - $(".stack.next").innerHeight()) + "px";
		$(this).animate({
			left: '75px',
			bottom: targetHeight
		}, stackBackwardReset);
	});
});

function stackForwardReset() {
	$('.stack.current').html($('.stack.next').html());
	$('.stack.current').show();
	$('.stack.next').hide();
	$('.stack.next').css("z-index", '');
	$('.stack.next').css("left", '');
	$('.stack.next').css("bottom", '');
	pS++;
	setSpreadFilters(pS);
}
function stackBackwardReset() {
	$('.stack.next').html($('.stack.current').html());
	$('.stack.next').show();
	$('.stack.current').css("opacity", '.01');
	$('.stack.current').css("left", '');
	$('.stack.current').css("bottom", '');
	pS--;
	setSpreadFilters(pS);
}

// 
function displayGreatestSpread(priceSpread) {
  priceSpread = priceSpread.filter(function(currentValue) {
  	return ((currentValue.buys.quantity !== 0) && (currentValue.sells.quantity !== 0));
  });
  priceSpread.forEach(calculateSpread);
  priceSpread.sort(comparePrices);
  getItem(priceSpread[0].id, function(item) {
	  displayItem(item, "#current-item", priceSpread[0]);
  });
  getItem(priceSpread[1].id, function(item) {
	  displayItem(item, "#next-item", priceSpread[1]);
  });
}

function displayItem(item, boxId, tpData) {
  $(boxId + " .item-name").text(item.name);
  $(boxId + " .item-icon").attr("src", item.icon);
  $(boxId + " .item-icon").attr("alt", item.name + "'s Icon");
  if (tpData !== undefined) {
	$(boxId + " .buy-price").text(tpData.buys.unit_price);
	$(boxId + " .sell-price").text(tpData.sells.unit_price);
  }
}

var getPrices = loadPrices();

function loadPrices() {
  var allPages = new Promise(function (resolve, reject) {
    var firstPage = makeRequest("GET", gwUrlBase + gwUrlPrices + gwUrlPaging + 0);
    firstPage.then(function(result){
		if (result.pageCount > 1) {
			var promises = [];
			var priceData = JSON.parse(result.respone);
			for(i = 1; i < result.pageCount; i++) {
				promises.push(makeRequest("GET", gwUrlBase + gwUrlPrices + gwUrlPaging + i));
			}
			var allPromises = Promise.all(promises);
			allPromises.then(function(results) {
				for(i = 0; i < results.length; i++) {
					priceData = priceData.concat(JSON.parse(results[i].respone));
				}
				resolve(priceData);
			}, function(e) {
				reject(e);
			});
		} else {
			resolve(JSON.parse(result.respone));
		}
    }, function(err) {
      reject(err);
    });
  });
  return function(callback) {
    allPages.then(callback);
  };
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

function setSpreadFilters(pSIndex) {
	if (pSIndex === undefined) {
		pS = 0;
		pSIndex = 0;
	}
    var goldMax = document.forms["spreadfilters"]["goldmax"].value;
    var silverMax = document.forms["spreadfilters"]["silvermax"].value;
    var goldMin = document.forms["spreadfilters"]["goldmin"].value;
    var silverMin = document.forms["spreadfilters"]["silvermin"].value;
    var goldMaxBuy = document.forms["spreadfilters"]["goldmaxbuy"].value;
    var silverMaxBuy = document.forms["spreadfilters"]["silvermaxbuy"].value;
    
    var max = (goldMax * 10000 + silverMax * 100);
    var min = (goldMin * 10000 + silverMin * 100);
    var maxBuy = (goldMaxBuy * 10000 + silverMaxBuy * 100)
    
    if (goldMax == 0 && silverMax == 0) {
    	document.forms["spreadfilters"]["silvermax"].value = 1;
    	silverMax = 1;
    	max = (goldMax * 10000 + silverMax * 100);
    }
    if (max < min) {
    	document.forms["spreadfilters"]["goldmax"].value = goldMin;
    	document.forms["spreadfilters"]["silvermax"].value = silverMin;
    	goldMax = goldMin;
    	silverMax = silverMin;
    	max = (goldMax * 10000 + silverMax * 100);
    }
    
    getPrices(function(priceSpread) {
    	var filteredSpread = priceSpread.filter(function(currentValue) {
    		return ((currentValue.spread <= max) && (currentValue.spread >= min) &&
    		(currentValue.buys.unit_price <= maxBuy));
    	});
    	filteredSpread.sort(comparePrices);
    	getItem(filteredSpread[pSIndex].id, function(item) {
    		displayItem(item, "#current-item", filteredSpread[pSIndex]);
			if ($('.stack.current').css("opacity") < 1) {
				$('.stack.current').css("opacity", '');
				$('.stack.current').hide();
			}
    		$('.stack.current').fadeIn();
    	});
    	getItem(filteredSpread[pSIndex+1].id, function(item) {
    		displayItem(item, "#next-item", filteredSpread[pSIndex+1]);
    		$('.stack.next').fadeIn();
    	});	
    });
}

var apikey;
function setProfitFilters() {
	if (apikey != document.forms["craftingprofit"]["apikey"].value) {
		apikey = document.forms["craftingprofit"]["apikey"].value;
		var characters = makeRequest("GET", gwUrlBase + gwUrlCharacters + gw2UrlAuth + apikey);
		characters.then(function(result){
			var characterNames = JSON.parse(result.respone);
			var characterHTML = "";
			for(i=0; i<characterNames.length; i++) {
				characterHTML.concat('<option value="' + encodeURIComponent(characterNames[i]) +
					'">' + characterNames[i] + '</option>');
			}
			$("#characterDD").html = characterHTML;
		}, function(err) {
			
		});
	}
}

function calculateSpread(currentValue) {
  currentValue.spread = currentValue.sells.unit_price - currentValue.buys.unit_price;
}
  
function comparePrices(arr1, arr2) {
  return (arr2.spread - arr1.spread);
}

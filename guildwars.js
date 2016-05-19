// http://stackoverflow.com/questions/30008114/how-do-i-promisify-native-xhr
function makeRequest (method, url) {
	return new Promise(function (resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open(method, url);
		xhr.onload = function () {
			if (this.status >= 200 && this.status < 300) {
				resolve({
					respone: xhr.response,
					pageCount: ((xhr.getAllResponseHeaders().includes("X-Page-Total")) ? 
						xhr.getResponseHeader("X-Page-Total") : 1)
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
var gwUrlMatStorage = "account/materials";
var gwUrlBank = "account/bank";
var gwUrlItems = "items";
var gwUrlCharacters = "characters";
var gwUrlIds = "?ids=";
var gwUrlPaging = "?page_size=200&page=";
var gwUrlAuth = "?access_token=";

// Current index of priceSpread item.
var pS=0;
// Entry to AJAX code.
$(document).ready(function(){
	// Fetch GW Price data and display two greatest spreads.
	$('#craftingprofit').submit(function (evt) {
    	evt.preventDefault();
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

function displayIngredients(selector, ingredients) {
	var ingredientHTML = "";
	ingredients.forEach(function(current) {
		ingredientHTML = ingredientHTML.concat('<li><img alt="'
			+ current.name + '" src="' + current.icon +'"</img>' + current.count + '</li>'
		);
	});
	$(selector).html = ingredientHTML;
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
				priceData = priceData.filter(function(currentValue) {
					return (currentValue != null);
				});
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

function loadIngredients() {
  var promises = [];
  var mats = new Promise(function (resolve, reject) {
  	var request = makeRequest("GET", gwUrlBase + gwUrlMatStorage + gwUrlAuth + apikey);
  	request.then(function (result) {
  		var slots = JSON.parse(result.respone);
  		var ids = slots.map(function(current) {
  			return current.id;
  		});
  		getItems(ids).then(function (result) {
  			var items = [].concat.apply([], result);
  			items.forEach(function(current) {
  				current.count = slots.find(function(slot) {
  					return slot.id == current.id;
  				}).count;
  			});
  			
  			resolve (items);
  		});
  	});
  });
  promises.push(mats);
  var bank = new Promise(function (resolve, reject) {
  	var request = makeRequest("GET", gwUrlBase + gwUrlBank + gwUrlAuth + apikey);
  	request.then(function (result) {
  		var bankSlots = JSON.parse(result.respone);
  		bankSlots = bankSlots.filter(function (current) {
  			return current != null;
  		});
  		var ids = bankSlots.map(function(current) {
  			return current.id;
  		});
  		getItems(ids).then(function (result) {
  			var items = [].concat.apply([], result);
  			items.filter(function(current){
  				return current.type == "CraftingMaterial";
  			});
  			items.forEach(function(current) {
  				current.count = bankSlots.find(function(slot) {
  					return slot.id == current.id;
  				}).count;
  			});
  			
  			resolve (items);
  		});
  	});
  });
  promises.push(bank);
  var allPromises = Promise.all(promises);
  return function(callback) {
    allPromises.then(callback);
  };
}

function getItems(ids) {
  var promises = [];
  var pageRequests = createPageRequests(ids);
  pageRequests.forEach(function(current) {
  	promises.push(new Promise(function (resolve, reject) {
  		var request = makeRequest("GET", gwUrlBase + gwUrlItems + current);
  		request.then(function(result){
  			resolve(JSON.parse(result.respone));
  		});
  	}));
  });
  var allPromises = Promise.all(promises);
  return allPromises;
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
var activeCharacter;
var activeDiscipline;
function setProfitFilters() {
	if (apikey != document.forms["craftingprofit"]["apikey"].value) {
		apikey = document.forms["craftingprofit"]["apikey"].value;
		var characters = makeRequest("GET", gwUrlBase + gwUrlCharacters + gwUrlAuth + apikey);
		characters.then(function(result){
			var characterNames = JSON.parse(result.respone);
			var characterHTML = "";
			for(i=0; i<characterNames.length; i++) {
				characterHTML = characterHTML.concat('<option value="' + encodeURIComponent(characterNames[i]) +
					'">' + characterNames[i] + '</option>');
			}
			$("#characterDD").html(characterHTML);
			loadIngredients()(function (ingredients) {
				displayIngredients("#ingredientsCP #ingredients", ingredients);
			});
		}, function(err) {
			
		});
	}
	if ((activeCharacter == undefined) && (document.forms["craftingprofit"]["characters"].value != "")) {
		var character = makeRequest("GET", gwUrlBase + gwUrlCharacters + '/' +
			document.forms["craftingprofit"]["characters"].value + gwUrlAuth + apikey);
		character.then(function(result){
			activeCharacter = JSON.parse(result.respone);
			var disciplineHTML = "";
			for(i=0; i<activeCharacter.crafting.length; i++) {
				disciplineHTML = disciplineHTML.concat('<option value="' + activeCharacter.crafting[i].discipline +
					'">' + activeCharacter.crafting[i].discipline + '</option>');
			}
			$("#disciplineDD").html(disciplineHTML);
		}, function(err) {
			
		});
	} else if (activeCharacter == undefined) {
	} else if (encodeURIComponent(activeCharacter.name) != document.forms["craftingprofit"]["apikey"].value) {
		var character = makeRequest("GET", gwUrlBase + gwUrlCharacters + '/' +
			document.forms["craftingprofit"]["characters"].value + gwUrlAuth + apikey);
		character.then(function(result){
			activeCharacter = JSON.parse(result.respone);
			var disciplineHTML = "";
			for(i=0; i<activeCharacter.crafting.length; i++) {
				disciplineHTML = disciplineHTML.concat('<option value="' + activeCharacter.crafting[i].discipline +
					'">' + activeCharacter.crafting[i].discipline + '</option>');
			}
			$("#disciplineDD").html(disciplineHTML);
		}, function(err) {
			
		});
	}
	if ((activeDiscipline == undefined) && (document.forms["craftingprofit"]["discipline"].value != "")) {
	} else if (activeDiscipline == undefined) {
	} else if (activeDiscipline != document.forms["craftingprofit"]["apikey"].value) {
	}
}

function createPageRequests(idArray) {
	var pageRequests = [];
	for(i=0; i<idArray.length; i+=200) {
		var currentRequest = gwUrlIds + idArray[i];
		for(j=i+1; j<((idArray.length < i+200) ? idArray.length : i+200); j++) {
			currentRequest = currentRequest + "," + idArray[j];
		}
		pageRequests.push(currentRequest);
	}
	return pageRequests;
}

function calculateSpread(currentValue) {
  currentValue.spread = currentValue.sells.unit_price - currentValue.buys.unit_price;
}
  
function comparePrices(arr1, arr2) {
  return (arr2.spread - arr1.spread);
}

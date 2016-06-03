// String constants for constructing GW API requests.
var gwUrlBase = "https://api.guildwars2.com/v2/";
var gwUrlAuth = "?access_token=";
var gwUrlPaging = "?page_size=200&page=";
var gwUrlIds = "?ids=";
var gwUrlPrices = "commerce/prices";
var gwUrlMatStorage = "account/materials";
var gwUrlBank = "account/bank";
var gwUrlItems = "items";
var gwUrlCharacters = "characters";

// Current index of priceSpread item.
var pS=0;
var currentTool = 'craftingNav';
// Entry to AJAX code.
$(document).ready(function(){
	$('.content').load('gw2tools.html', function() {
		$('#craftingprofit').submit(function (evt) {
	    	evt.preventDefault();
		});
		// Fetch GW Price data and display two greatest spreads.
		getPrices(displayGreatestSpread);
		
		$(".menu").on("click", function(){
			if($(this).attr('id') == currentTool)
				return;
			$('#' + currentTool).removeClass('activeNav');
			currentTool = $(this).attr('id');
			$('#' + currentTool).addClass('activeNav');
			if(currentTool == "spreadNav") {
				$('#craftprofit').css('display', '');
				$('#tpspread').fadeIn();
			} else if (currentTool == "craftingNav") {
				$('#tpspread').css('display', '');
				$('#craftprofit').fadeIn();
			}
		});
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
			if (pS == 0)
				return;
			$(".stack.next").fadeOut();
			var targetHeight = (60 - $(".stack.next").innerHeight()) + "px";
			$(this).animate({
				left: '75px',
				bottom: targetHeight
			}, stackBackwardReset);
		});
		$('#craftprofit').fadeIn();
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
		
		displayItem(item, "#current-item");
		$("#current-item .buy-price").text(displayGold(tpData.buys.unit_price));
		$("#current-item .sell-price").text(displayGold(tpData.sells.unit_price));
		$("#current-item .sell-price").after("<dt>Spread</dt>");
	});
	getItem(priceSpread[1].id, function(item) {
  		displayItem(item, "#next-item");
		$("#next-item .buy-price").text(displayGold(tpData.buys.unit_price));
		$("#next-item .sell-price").text(displayGold(tpData.sells.unit_price));
		$("#next-item .sell-price").after("<dt>Spread</dt>");
  });
}

function displayItem(item, boxId) {
  $(boxId + " .item-name").text(item.name);
  $(boxId + " .item-icon").attr("src", item.icon);
  $(boxId + " .item-icon").attr("alt", item.name + "'s Icon");
}

function displayIngredients(selector, ingredients) {
	for(i=0; i<ingredients.length; i++) {
		var matches = getAllIndices(ingredients, function(current) {
			return current.id == ingredients[i].id;
		});
		for(j=matches.length-1; j>0; j--) {
			ingredients[i].count += ingredients[matches[j]].count;
			ingredients.splice(matches[j], 1);
		}
	}
	var ingredientHTML = "";
	ingredients.forEach(function(current) {
		ingredientHTML = ingredientHTML.concat('<li name="' + current.id + '"><img alt="'
			+ current.name + '" title="' + current.name + '" src="' + current.icon
			+ '"</img><span class="count">' + current.count + '</span></li>'
		);
	});
	$(selector).html(ingredientHTML);
}

function displayCraftProfitCalc(selector, itemId, prices, ingredients) {
	var item = ingredients.find(function(current) {
		return current.id == itemId;
	});
	var price = prices.find(function(current) {
		return current.id == item.id;
	});
	
	$(selector).after('<div id="craft-profit-calc"><h2>' + item.name + ' Profit Sheet</h2>'
	+ '<ul><li>Sell Instantly: ' + displayGold((price.buys.unit_price - tpFees(price.buys.unit_price)) * item.count) + '</li>'
	+ '<li>List on TP: ' + displayGold((price.sells.unit_price - tpFees(price.sells.unit_price)) * item.count) + '</li>'
	+ '</ul>'
	+ '</div>');
}

function tpFees(amount) {
	return Math.max(1, Math.floor(amount * .1)) + Math.max(1, Math.floor(amount *.05));
}

function displayGold(amount) {
	var gold = Math.floor(amount / 10000);
	var silver = Math.floor((amount / 100) - (gold * 100));
	var copper = (amount) - (gold * 10000) - (silver * 100)
	return (gold + "G " + silver + "S " + copper + "C");
}

var getPrices = loadPrices();

function loadPrices() {
  var allPages = new Promise(function (resolve, reject) {
    var firstPage = makeRequest("GET", gwUrlBase + gwUrlPrices + gwUrlPaging + 0);
    firstPage.then(function(result){
		if (result.pageCount > 1) {
			var promises = [];
			var priceData = JSON.parse(result.response);
			for(i = 1; i < result.pageCount; i++) {
				promises.push(makeRequest("GET", gwUrlBase + gwUrlPrices + gwUrlPaging + i));
			}
			var allPromises = Promise.all(promises);
			allPromises.then(function(results) {
				for(i = 0; i < results.length; i++) {
					priceData = priceData.concat(JSON.parse(results[i].response));
				}
				priceData = priceData.filter(function(currentValue) {
					return (currentValue != null);
				});
				resolve(priceData);
			}, function(e) {
				reject(e);
			});
		} else {
			resolve(JSON.parse(result.response));
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
  		var slots = JSON.parse(result.response);
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
  		var bankSlots = JSON.parse(result.response);
  		bankSlots = bankSlots.filter(function (current) {
  			return current != null;
  		});
  		var ids = bankSlots.map(function(current) {
  			return current.id;
  		});
  		getItems(ids).then(function (result) {
  			var items = [].concat.apply([], result);
  			items = items.filter(function(current){
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
  var characters = new Promise(function (resolve, reject) {
  	var request = makeRequest("GET", gwUrlBase + gwUrlCharacters + gwUrlAuth + apikey);
  	request.then(function (result) {
  		var characterNames = JSON.parse(result.response);
  		var inventoryRequests = [];
  		characterNames.forEach(function(current) {
  			inventoryRequests.push(makeRequest("GET", gwUrlBase + gwUrlCharacters + '/' +
				encodeURIComponent(current) + '/inventory' + gwUrlAuth + apikey));
  		});
  		var allInventories = Promise.all(inventoryRequests);
  		allInventories.then(function(responses) {
  			var bags = [];
			responses.forEach(function (current) {
				bags = bags.concat((JSON.parse(current.response)).bags);
			});
  			bags = bags.filter(function (current) {
  				return current != null;
  			});
			var charInvs = bags.map(function(current) {
				return current.inventory;
			});
			charInvs = [].concat.apply([], charInvs);
  			charInvs = charInvs.filter(function (current) {
  				return current != null;
  			});
  			var ids = charInvs.map(function(current) {
  				return current.id;
  			});
  			getItems(ids).then(function (result) {
  				var items = [].concat.apply([], result);
  				items = charInvs.map(function(current) {
  					var item = items.find(function(slot) {
  						return slot.id == current.id;
  					});
					item = jQuery.extend({}, item);
  					item.count = current.count;
  					return item;
  				});
  				items = items.filter(function(current){
  					return current.type == "CraftingMaterial";
  				});
  				
  				resolve (items);
  			});
  		});
  	});
  });
  promises.push(characters);
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
  			resolve(JSON.parse(result.response));
  		});
  	}));
  });
  var allPromises = Promise.all(promises);
  return allPromises;
}

// Needs to be converted to promise.
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
		getPrices(function(prices) {
			loadIngredients()(function (ingredients) {
				ingredients = [].concat.apply([], ingredients);
				displayIngredients("#ingredientsCP #ingredients", ingredients);
				$("#ingredientsCP #ingredients li").on("click", function() {
					displayCraftProfitCalc("#ingredientsCP", $(this).attr("name"), prices, ingredients);
				});
			});
		});
		var characters = makeRequest("GET", gwUrlBase + gwUrlCharacters + gwUrlAuth + apikey);
		characters.then(function(result){
			var characterNames = JSON.parse(result.response);
			var characterHTML = "";
			for(i=0; i<characterNames.length; i++) {
				characterHTML = characterHTML.concat('<option value="' + encodeURIComponent(characterNames[i]) +
					'">' + characterNames[i] + '</option>');
			}
			$("#characterDD").html(characterHTML);
		}, function(err) {
			
		});
	}
	if ((activeCharacter == undefined) && (document.forms["craftingprofit"]["characters"].value != "")) {
		var character = makeRequest("GET", gwUrlBase + gwUrlCharacters + '/' +
			document.forms["craftingprofit"]["characters"].value + gwUrlAuth + apikey);
		character.then(function(result){
			activeCharacter = JSON.parse(result.response);
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
			activeCharacter = JSON.parse(result.response);
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

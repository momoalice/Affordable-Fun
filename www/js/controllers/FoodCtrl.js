angular.module('app.controllers')

.controller('FoodCtrl', function($scope, $state, $stateParams) {

	$scope.$on('$ionicView.enter', function(){
		$scope.lat = $stateParams.lat;
		$scope.lng = $stateParams.lng;

		var auth = {consumerKey : "1IdjCjDW9bNsu4OpUaRs7w",
		consumerSecret : "ZHmS5OCHnQW_CW_abKbLfgNmDw4",
		accessToken : "qQTr5yOpArxf3PB3O_2YCoSKEVddyTKx",
		accessTokenSecret : "2vE5yMisma5qHF1QRa1PfsDYi9w",
		serviceProvider : {
			signatureMethod : "HMAC-SHA1"
		}
	};
	var accessor = {
		consumerSecret : auth.consumerSecret,
		tokenSecret : auth.accessTokenSecret
	};
	var par = $stateParams;
	var lat = par.event.venue.venueLatitude;
	var lng = par.event.venue.venueLongitude;
	var terms = 'food';
	var object = $scope;
	var parameters = [];
	parameters.push(['term', terms]);
	parameters.push(['location', "Portland, Oregon"]);
	parameters.push(['oauth_consumer_key', auth.consumerKey]);
	parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
	parameters.push(['oauth_token', auth.accessToken]);
	parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
	parameters.push(['callback', 'cb']);
	parameters.push(['latitude',lat]);
	parameters.push(['longitude',lng]);
	parameters.push(['radius_filter', 1000]);

	var cb = function(data) {  
		object.$apply();
	};

	var message = {
		'action' : 'https://api.yelp.com/v2/search',
		'method' : 'GET',
		'parameters' : parameters
	};

	OAuth.setTimestampAndNonce(message);
	OAuth.SignatureMethod.sign(message, accessor);
	var parameterMap = OAuth.getParameterMap(message.parameters);
	object.restaurants = [];
	$.ajax({
		url : message.action,
		data : parameterMap,
		async:false,
		dataType : 'jsonp',
		contentType: "application/json",
		jsonpCallback : 'cb',
		cache: true,
		success: function(jsonp) {
			var list = jsonp.businesses;
			for (var i = 0; i < list.length; i++) {
				object.restaurants.push(list[i]);
			}
			object.$apply();
		},
		error: function(xhr, status, err) {
			alert(err);
		}

	});

	$scope.clicked = function(item, lat, lng) {
    	$state.go("checkout",{event : par.event,food : item, lat : lat, lng:lng});
    };
});

});
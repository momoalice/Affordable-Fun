angular.module('app.controllers')

.controller('FoodCtrl', function($scope, $state) {

	$scope.$on('$ionicView.enter', function(){
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
	var lat = $stateParams.event.venue.venueLatitude;
	var lng = $stateParams.event.venue.venueLongitude;
	var terms = 'food';
	var object = $scope;
	var parameters = [];
	parameters.push(['term', terms]);
	parameters.push(['oauth_consumer_key', auth.consumerKey]);
	parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
	parameters.push(['oauth_token', auth.accessToken]);
	parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
	parameters.push(['latitude',lat]);
	parameters.push(['longitude',lng]);

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
		cache: true,
		success: function(jsonp) {
			var list = jsonp.businesses;
			alert(list.length);
			for (var i = 0; i < list.length; i++) {
				restaurants.push(list[i]);
			}
		},
		error: function(xhr, status, err) {
			alert(err);
		}

	})
	alert(objects.restaurants[0].name);
});

});
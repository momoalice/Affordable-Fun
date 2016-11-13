angular.module('app.controllers')

.controller('CheckoutCtrl', function($scope, $state, $stateParams) {

	$scope.$on('$ionicView.enter', function(){
		var event = $stateParams.event;
		var food = $stateParams.food;
		var object = $scope;
		var lat = $stateParams.lat;
		var lng = $stateParams.lng;
		object.url = event.eventDetailsLink;

		var directionsService = new google.maps.DirectionsService();
		var directionsDisplay = new google.maps.DirectionsRenderer();
		var start = new google.maps.LatLng(lat, lng);
		var mapOptions = {
			zoom:7,
			center: start
		}
		var map = new google.maps.Map(document.getElementById('map'), mapOptions);
		directionsDisplay.setMap(map);
		
		var mid1 = new google.maps.LatLng(event.venue.venueLatitude, event.venue.venueLongitude);
		var mid2 = new google.maps.LatLng(food.location.coordinate.latitude, food.location.coordinate.longitude);
		var end = new google.maps.LatLng(lat, lng);
		var wpoints = [];
		wpoints.push({location:mid1, stopover:true});
		wpoints.push({location:mid2, stopover:true});
		var request = {
			origin : start,
			destination: end,
			waypoints : wpoints,
			optimizeWaypoints : false,
			travelMode: 'DRIVING'
		}
		directionsService.route(request, function(response, status){
			if (status === 'OK') {
				directionsDisplay.setDirections(response);
				var route = response.routes[0];
				var summaryPanel = document.getElementById('directions-panel');
				summaryPanel.innerHTML = '';
				for (var i = 0; i < route.legs.length; i++) {
					var routeSegment = i + 1;
					summaryPanel.innerHTML += '<b>Route Segment: ' + routeSegment +
					'</b><br>';
					summaryPanel.innerHTML += route.legs[i].start_address + ' to ';
					summaryPanel.innerHTML += route.legs[i].end_address + '<br>';
					summaryPanel.innerHTML += route.legs[i].distance.text + '<br><br>';
				}
				object.$apply();
			} else {
				window.alert('Directions request failed due to ' + status);
			}
		});
	});

});
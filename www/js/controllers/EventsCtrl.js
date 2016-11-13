angular.module('app.controllers')

.controller('EventsCtrl', function($scope, $state, $stateParams) {

	$scope.$on('$ionicView.enter', function(){

		var latitude = 45.58699530000001;
		var longitude =  -122.71017280000001;
		$scope.lat = latitude;
		$scope.lng = longitude;
		var radius = 10;
		var genreName = $stateParams.search;
		var genreCode;
		var options = {
			weekday: "long", year: "numeric", month: "short",
			day: "numeric", hour: "2-digit", minute: "2-digit"
		};
		if (genreName == "music") {
			genreCode = 10001;
		} else if (genreName == "movie") {
			genreCode = 10002;
		} else if (genreName == "family") {
			genreCode = 10003;
		} else if (genreName == "sports") {
			genreCode = 10004;
		}
		var link = "https://app.ticketmaster.com/dc/content/v1/deals/events?apikey=4tNhGvFc0RHDLrfAeZJMmbAOKh7wFGna" + "&latitude=" + latitude + "&longitude=" + longitude;
		if (genreCode) {
			link = link + "&majorGenreId=" + genreCode;
		}
		var object = $scope;
		var transcribe = function(list) {
			for (var i = 0; i < list.length; i++) {
				if (list[i].minPrice) {
					var event = list[i];
					event.fee = 0;
					event.id = i;
					temp = event.eventDate;
					temp = new Date(temp).toLocaleTimeString("en-us", options);
					event.eventDateString = temp;
					object.events.push(event);
				}
			}
		}

		var fetchFee1 = function(lat1, lat2, lng1, lng2, index, callback) {
			var directionsService = new google.maps.DirectionsService;
			var ori = new google.maps.LatLng(lat1, lng1);
			var des = new google.maps.LatLng(lat2, lng2);

			directionsService.route({
				origin: ori,
				destination: des,
				travelMode: 'TRANSIT'
			}, function(response, status) {
				if (status === 'OK') {
					object.events[index].fee = response.routes[0].fare.value;
					object.events[index].cost = object.events[index].fee + object.events[index].minPrice;
					callback(true);
				} else {
					callback(false);
				}
			});
		}

		var fetchFee2 = function(lat1, lat2, lng1, lng2, index, callback) {
			var directionsService = new google.maps.DirectionsService;
			var ori = new google.maps.LatLng(lat1, lng1);
			var des = new google.maps.LatLng(lat2, lng2);

			directionsService.route({
				origin: des,
				destination: ori,
				travelMode: 'TRANSIT'
			}, function(response, status) {
				if (status === 'OK') {
					object.events[index].back = response.routes[0].fare.value;
					object.events[index].cost = object.events[index].cost + object.events[index].back;
					callback(true);
				} else {
					callback(false);
				}
			});
		}

		var recursiveFill = function(max, start,timeout, callback) {
			var i = start;
			var idx = Math.floor(i / 2);
			if (idx < max) {
				var deslat = parseFloat(object.events[idx].venue.venueLatitude);
				var deslng = parseFloat(object.events[idx].venue.venueLongitude);
				if ((i % 2) == 0) {
					setTimeout(function() {
						fetchFee1(latitude, deslat, longitude, deslng, idx, function(cont) {
							if (cont) {
								recursiveFill(max, i + 1, timeout, callback);
							} else {
								recursiveFill(max, i, timeout, callback);
							}
						});
					}, timeout);
				} else {
					setTimeout(function() {
						fetchFee1(latitude, deslat, longitude, deslng, idx, function(cont) {
							if (cont) {
								recursiveFill(max, i + 1, timeout, callback);
							} else {
								recursiveFill(max, i, timeout, callback);
							}
						});
					}, timeout);
				}
				object.$apply();
			} else {
				callback();
			}
		}

		$scope.events = [];
		$.ajax({
			type:"GET",
			url:link,
			async:false,
			dataType: "json",
			success: function(json) {
				var list = json.events;
				transcribe(list);
			},
			error: function(xhr, status, err) {
				alert(err);
			}
		});
		recursiveFill(object.events.length, 0, 100, function() {
			object.events.sort(function(a, b) {
				return a.cost - b.cost;
			});
			object.$apply();
		});
	});

	$scope.next = function(item, lat, lng) {
    	$state.go("food",{event : item, lat : lat, lng : lng});
    };

});
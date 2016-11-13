angular.module('app.controllers')

.controller('SearchCtrl', function($scope, $state) {

    $scope.$on('$ionicView.enter', function(){
        
    });

    $scope.clicked = function() {
    	$state.go("events",{search : document.getElementById("input").value});
    };

});
angular.module('app', ['ionic', 'app.controllers','ngCordova'])

.run(function($ionicPlatform, $cordovaKeyboard, $cordovaStatusbar) {
    $ionicPlatform.ready(function() {

        console.log('########################  $ionicPlatform.ready() called  ########################');

        $cordovaKeyboard.hideAccessoryBar(true);
        $cordovaKeyboard.disableScroll(true);

        $cordovaStatusbar.style();
    });
})

.config(function($stateProvider, $urlRouterProvider) {

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider        
    .state('search', {
        url: '/',
        templateUrl: 'templates/search.html',
        controller: 'SearchCtrl'
    })

    .state('events', {
        url: '/events',
        params:{"search":null},
        templateUrl: 'templates/events.html',
        controller: 'EventsCtrl'
    })

    .state('food', {
        url: '/food',
        params:{"event":null, lat:0, lng:0},
        templateUrl: 'templates/food.html',
        controller: 'FoodCtrl'
    })

    .state('checkout', {
        url: '/checkout',
        params:{"event":null, "food": null, lat:0, lng:0},
        templateUrl: 'templates/checkout.html',
        controller: 'CheckoutCtrl'
    })

    $urlRouterProvider.otherwise('/');

})

.constant('$ionicLoadingConfig', {
    template: '<ion-spinner icon="spiral"></ion-spinner>', 
    noBackdrop: true
});

angular.module('app.controllers', []);
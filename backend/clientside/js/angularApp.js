var app = angular.module('app', []);

app.controller('indexController', function ($scope, $http) {
    $scope.linesModel='none';
    
    /*$http({method: 'GET', url: '/train'}).
    success(function(data, status, headers, config) {
        $scope.result = data;
        console.log(data);
    }).
    error(function(data, status, headers, config) {
        console.log(data);
        alert('error');
    });*/
    
    $scope.getStations = function(){
        if($scope.linesModel != 'none'){
            $http({method: 'GET', url: '/stations?line='+encodeURI($scope.linesModel)}).
            success(function(data, status, headers, config) {
                $scope.stationsList = data;
            }).
            error(function(data, status, headers, config) {
                console.log(data);
                alert('error');
            });  
        }
    }
    $scope.getStationsNearMe = function(){
        $http.post( '/close_stations', {lat: 41.806737, lon:-87.896065, radius:15, max: 10}).
            success(function(data, status, headers, config) {
                $scope.stationsList = data;
                console.log(data);
            }).
            error(function(data, status, headers, config) {
                console.log(data);
                alert('error');
            }); 
    }
    $scope.getFutureTrains = function(){
        $http.post( '/future_trains', {stopId: 'WESTSPRING', routeId: 'BNSF'}).
            success(function(data, status, headers, config) {
                $scope.stationsList = data;
                console.log(data);
            }).
            error(function(data, status, headers, config) {
                console.log(data);
                alert('error');
            }); 
    }
    $scope.getCrossings = function(){
        $http.post( '/close_crossings', {lat: 41.806737, lon:-87.896065, radius:1, max: 10}).
            success(function(data, status, headers, config) {
                $scope.result = data;
                console.log(data);
            }).
            error(function(data, status, headers, config) {
                console.log(data);
                alert('error');
            }); 
    }
     $scope.getBlockedCrossings = function(){
        $http.post( '/blocked_crossings', {stopId: "WESTSPRING"}).
            success(function(data, status, headers, config) {
                $scope.result = data;
                console.log(data);
            }).
            error(function(data, status, headers, config) {
                console.log(data);
                alert('error');
            }); 
    }
    $scope.test = function(){
        console.log($scope.departStationsModel);
        console.log($scope.arriveStationsModel);
    }
});
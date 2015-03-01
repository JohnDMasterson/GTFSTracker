var app = angular.module('app', []);

app.controller('indexController', function ($scope, $http) {
    $scope.linesModel='none';
    
    $http({method: 'GET', url: '/train'}).
    success(function(data, status, headers, config) {
        $scope.result = data;
        console.log(data);
    }).
    error(function(data, status, headers, config) {
        console.log(data);
        alert('error');
    });
    
    $scope.getStations = function(){
        if($scope.linesModel != 'none'){
            $http({method: 'GET', url: '/stations?l='+encodeURI($scope.linesModel)}).
            success(function(data, status, headers, config) {
                $scope.stationsList = data;
            }).
            error(function(data, status, headers, config) {
                console.log(data);
                alert('error');
            });  
        }
    }
    
    $scope.test = function(){
        console.log($scope.departStationsModel);
        console.log($scope.arriveStationsModel);
    }
});
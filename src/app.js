/*
GTFS Tracker
-Favorites
   [Saved Locations]
     -Remove From Favorites
     -Next trains to arrive and when
    -Clear Saved Locations
   [Saved Stations]
     -Remove From Favorites
     -Next trains to arrive and when
    -Clear Saved Stations
-Schedule
  -Stations Near Me
    [Stations Near You]
  -All Stations
    [All Stations]
-Current Location
  -Add Current to Favorites
  -Next trains to arrive and when
*/

//Require stuff
var ajax = require('ajax');
var UI = require('ui');

//General variables
var URL = 'http://172.17.70.167:5000';
var locationOptions = {
  enableHighAccuracy: true, 
  maximumAge: 10000, 
  timeout: 10000
};

//Local Storage Variables
var favCoords = JSON.parse(localStorage.getItem('favCoords') || null );
if(favCoords === null) {
  favCoords = [];
}
//localStorage.setItem('favCoords', JSON.stringify(favCoords));
//var favStations = JSON.parse(localStorage.getItem('favStations') || null);

var selectedStation = {
  line: '',
  id: '',
  name: ''
};


//Card to show when fetching data
var fetchCard = new UI.Card({
  title: "Please Wait",
  body: "Fetching Data..."
});

//Function for generic post requests
function postData(path, request, onSuccess, onFail) {
  fetchCard.show();
  var urlpath = URL + path;
  ajax({url: urlpath,
        method: 'post',
        data: request,
        type: 'json'
       },
       function(json) {
         onSuccess(json);
         fetchCard.hide();
       },
       function(error) {
         onFail(error);
         fetchCard.hide();
       }
  );
}

//Gets a list of stations and creates a menu for them
function getStations() {
  postData("/stations",
           {line: "BNSF"},
    function(stations) {
      console.log("successfully retrieved\n");
      var sList = [];
      for(var i = 0; i < stations.length; i++) {
        sList[i]={
          title: stations[i].name,
          subtitle: stations[i].id,
          line: "BNSF"};
        console.log(i + ':' + stations[i].name + ' ' + stations[i].id + '\n');
      }
      var stationMenu = new UI.Menu({
        sections: [{
          title: 'Stations',
          items: sList
        }]
      });
      stationMenu.on('select', function(e){
        selectedStation.name = e.item.name;
        selectedStation.line = e.item.line;
        selectedStation.title = e.item.title;
        console.log(selectedStation + '\n');
        ssm();
      });
      stationMenu.show();
    }, 
    function(error) {
      console.log(error+'\n');
    });
}

//Requests stations close to you, and lists them
function getStationsCloseToMe(pos){
  var req = {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    radius: 10
  };
  postData("/close_stations", req, 
    function (stations) {
      var sList = [];
      for(var i = 0; i < stations.length; i++) {
        sList[i]={
          title: stations[i].name,
          subtitle: stations[i].id
        };
      }
      var stationMenu = new UI.Menu({
      sections: [{
        title: 'Stations',
        items: sList
      }]
    });
    stationMenu.show();
  }, 
  function(error) {
    console.log(error);
  });
}

function getLocation() {
  function locationSuccess(pos) {
    return pos;
  }
  function locationError(err) {
    console.log('location error (' + err.code + '): ' + err.message + '\n');
    return null;
  }
  navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
}

//Adds current location to favorites list
function addCurrentLocationToFavorites() {
  function locationSuccess(pos) {
    var newLoc = {
      title: 'Pootis',
      lat: pos.coords.latitude,
      lon: pos.coords.longitude
    };
    favCoords[favCoords.length] = newLoc;
    localStorage.setItem('favCoords', JSON.stringify(favCoords));
  }
  function locationError(err) {
    console.log('location error (' + err.code + '): ' + err.message + '\n');
  }
  navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
}

//gets trains arriving at position
function arrivingTrainsAtCurrent() {
  function locationSuccess(pos) {
    var req = {lat: pos.coords.latitude,
               lon: pos.coords.longitude,
               time: 30};
    postData("/next_trains_coords", req, 
            function(trains){
              console.log(trains);
            }, function(error){   
              console.log(error+'\n');
            });
  }
  function locationError(err) {
    console.log('location error (' + err.code + '): ' + err.message + '\n');
  }
  navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
}

//Favorites Menu
function fm() {
  var favoritesMenu = new UI.Menu({
    sections: [{
      title: "Saved Locations",
      items: favCoords
    }]
  });
  favoritesMenu.show();
}

//Setting up the stations menu
function sm() {
  var stationsMenu = new UI.Menu({
    sections: [{
      items: [{
        title: 'Stations Near Me'
      },{
        title: 'All Stations' 
      }]
    }]
  });

  //Stations callbacks
  stationsMenu.on('select', function(e){
    if(e.item.title === 'Stations Near Me') {
      getStationsCloseToMe(getLocation());
    }else if(e.item.title === 'All Stations') {
      getStations();
    }
  });
  stationsMenu.show();
}

function ssm() {
  var stationsSelectMenu = new UI.Menu({
    sections: [{
      items: [{
        title: 'Add Station to Favorites'
      },{
        title: 'View Station Schedule'
      }]
    }]
  });
  stationsSelectMenu.on('select', function(e){
    if(e.item.title === 'Stations Near Me') {
      getStationsCloseToMe(getLocation());
    }else if(e.item.title === 'All Stations') {
      getStations();
    }
  });
  stationsSelectMenu.show();
}

//Setting up the locations menu
function lm() {
  var locationsMenu = new UI.Menu({
    sections: [{
      items: [{
        title: 'Add to Favorites'
      },{
        title: 'Time Till Train Arrives' 
      }]
    }]
  });

  //Locations callbacks
  locationsMenu.on('select', function(e){
    if(e.item.title === 'Add to Favorites') {
      addCurrentLocationToFavorites();
    }else if(e.item.title === 'Trains Coming Soon') {
      arrivingTrainsAtCurrent();
    }
  });
  locationsMenu.show();
}

//Setting up the main menu
var mainMenu = new UI.Menu({
  sections: [{
    items: [{
      title: 'Favorites'
    },{
      title: 'Stations'
    },{
      title: 'Current Location'
    }]
  }]
});

//Main menu callbacks
mainMenu.on('select', function(e){
  if(e.item.title === 'Favorites') {
    fm();
  }else if (e.item.title === 'Stations') {
    sm();
  }else if (e.item.title === 'Current Location') {
    lm();
  }
});

//Show main menu
mainMenu.show();
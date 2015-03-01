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
var Vector2 = require('vector2');
var UI = require('ui');

//General variables
var URL = 'http://172.17.70.167:5000';
var locationOptions = {
  enableHighAccuracy: true, 
  maximumAge: 10000, 
  timeout: 10000
};

//Data stored on phone
var favCoords = JSON.parse(localStorage.getItem('favCoords') || null );
if(favCoords === null) {
  favCoords = [];
}
var favStations = JSON.parse(localStorage.getItem('favStations') || null);
if(favStations === null) {
  favStations = [];
}

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
      var stationMenu = new UI.Menu({
        sections: [{
          title: 'Stations',
          items: sList
        }]
      });
      for(var station in stations) {
        sList.push({
          title: station.name,
          subtitle: station.id,
          line: "BNSF"});
        console.log(station.name + ' ' + station.id + '\n');
      }
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
function getStationsCloseToMe(){
  function locationSuccess(pos) {
    var req = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      radius: 10,
      max: 10
    };
    postData("/close_stations", req, 
      function (stations) {
        var sList = [];
        var stationMenu = new UI.Menu({
        sections: [{
          title: 'Stations',
          items: sList
        }]
      });
      for(var station in stations) {
        sList.push({
          title: station.stop.stop_name,
          subtitle: station.distance
        });
      }
      stationMenu.show();
    }, 
    function(error) {
      console.log(error);
    });
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

function mapMyLocation(){
  function locationSuccess(pos) {
    var url = "https://maps.googleapis.com/maps/api/staticmap";
    var args = "?zoom=12&scale=1&size=100x120&format=png32&style=feature:all%7Cvisibility:simplified&style=feature:all%7Celement:labels%7Cvisibility:off&style=feature:all%7Csaturation:+100&key=AIzaSyBN4-GpcNRDWsfyfzMdDZ52YEWWouCkOc4";
    var args2 = "&style=feature:road%7Celement:geometry%7Ccolor:0x000000%7Cvisibility:on&center="+pos.coords.latitude+","+pos.coords.longitude + "#width:100";
    var completeURL = url + args + args2;
    console.log("URL is :" + completeURL);
    var win = new UI.Window();
    var map = new UI.Image({
      position: new Vector2(0, 0),
      image: completeURL
    });
    win.add(map);
    win.show();
        
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
    },{
      title: "Saved Stations",
      items: favStations
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
    if(e.itemIndex === 0) {
      getStationsCloseToMe();
    }else if(e.itemIndex === 1) {
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
    if(e.itemIndex === 0) {
          var newStation = {
            title: selectedStation.name,
            line: selectedStation.line,
            subtitle: selectedStation.id
          };
          favStations[favStations.length] = newStation;
          localStorage.setItem('favStations', JSON.stringify(favStations));
    }else if(e.itemIndex === 1) {
      //viewStationSchedule();
    }
  });
  stationsSelectMenu.show();
}

function closeCrossings(){
    function locationSuccess(pos) {
    var req = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      radius: 10,
      max: 10
    };
    postData("/close_crossings", req, 
      function (crossings) {
        var cList = [];
        var closeMenu = new UI.Menu({
        sections: [{
          title: 'crossings',
          items: cList
        }]
      });
      for(var crossing in crossings) {
        cList.push({
          title: crossing.street,
          subtitle: crossing.latitude + ',' + crossing.longitud
        });
      }
      closeMenu.show();
    }, 
    function(error) {
      console.log(error);
    });
        }
    function locationError(err) {
      console.log('location error (' + err.code + '): ' + err.message + '\n');
      return null;
    }
    navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);


}

function downCrossings(){
    function locationSuccess(pos) {
    var req = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      radius: 10,
      max: 10
    };
    postData("/blocked_crossings", req, 
      function (crossings) {
        var cList = [];
        var downMenu = new UI.Menu({
        sections: [{
          title: 'crossings',
          items: cList
        }]
      });
      for(var crossing in crossings) {
        cList.push({
          title: crossing.street,
          subtitle: crossing.latitude + ',' + crossing.longitud
        });
      }
      downMenu.show();
    }, 
    function(error) {
      console.log(error);
    });
        }
    function locationError(err) {
      console.log('location error (' + err.code + '): ' + err.message + '\n');
      return null;
    }
    navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);

}

function cm() {
  var crossingsMenu = new UI.Menu({
    sections: [{
      items: [{
        title: 'Close Crossings'
      },{
        title: 'Down Crossings' 
      }]
    }]
  });

  //Locations callbacks
  crossingsMenu.on('select', function(e){
    if(e.itemIndex === 0) {
      closeCrossings();
    }else if(e.itemIndex === 1) {
      downCrossings();
    }
  });
  crossingsMenu.show();
}

//Setting up the locations menu
function lm() {
  var locationsMenu = new UI.Menu({
    sections: [{
      items: [{
        title: 'Add to Favorites'
      },{
        title: 'Trains Coming Soon' 
      },{
        title: 'Map My Location'
      }]
    }]
  });

  //Locations callbacks
  locationsMenu.on('select', function(e){
    if(e.itemIndex === 0) {
      addCurrentLocationToFavorites();
    }else if(e.itemIndex === 1) {
      arrivingTrainsAtCurrent();
      locationsMenu.hide();
    }else if(e.itemIndex === 2){
      mapMyLocation();
      locationsMenu.hide();
    }
  });
  locationsMenu.show();
}

function init(){
  //Setting up the main menu
  var mainMenu = new UI.Menu({
    sections: [{
      items: [{
        title: 'Favorites'
      },{
        title: 'Stations'
      },{
        title: 'Crossings'
      },{
        title: 'My Location'
      }]
    }]
  });

  //Main menu callbacks
  mainMenu.on('select', function(e){
    if(e.itemIndex === 0) {
      fm();
    }else if (e.itemIndex === 1) {
      sm();
    }else if (e.itemIndex === 2) {
      cm();
    }else if (e.itemIndex === 3) {
      lm();
    }
  });

  //Show main menu
  mainMenu.show();
}
init();
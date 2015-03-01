// Import main libraries
var express = require('express');
var request = require('request');
var querystring = require('querystring');
var unzip = require('unzip');
var fs = require('fs');
var csvparse = require('csv-parse');
var htmlparser = require('htmlparser2');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var colors = require('colors');
var _ = require('underscore-node');
var geocoderProvider = 'google';
var httpAdapter = 'http';
var geocoder = require('node-geocoder').getGeocoder(geocoderProvider, httpAdapter);

var trackerURL = "http://metrarail.com/content/metra/en/home/jcr:content/trainTracker.get_train_data.json?";
var lineStationsURL = "http://metrarail.com/content/metra/wap/en/home/RailTimeTracker/jcr:content/trainTracker.get_stations_from_line.json?" 
var currentGTFSURL = "http://metrarail.com/content/dam/metra/documents/GTFS_Feed/GTFSdata082514.zip";
var updateGTFSURL = "http://metrarail.com/metra/en/home/about_metra/obtaining_records_from_metra.html";

// Set up the object for our app
app = express();

var logger = function (req,res,next) {
    console.log("   info  (backend) - ".cyan+req.method+" "+req.url);
    next();
}

var error = function (req,res,next) {
    res.send('You requested '+req.url+', which we don\'t have');
    console.log('   error (backend) - '.red+'client tried to '+req.method+' '+req.url+' which is an undefined route :(');
    // No call to next(). Let it die. If you love it, set it free.
}

app.use(cookieParser());
app.use(bodyParser.json());
app.use(logger);
app.use(express.static(__dirname + '/clientside'));

/*if(checkForGTFSURL){
    getGTFSData();
}*/

var gtfsData = null;
var invalidIds = null;
var rrData = null;
var gtfsCallback = function(result){
    gtfsData = result;
    invalidIds = getInvalidServiceIds();
    gtfsData = removeInvalidServiceIds();
    console.log('done');
}
parseGTFSData(gtfsCallback);

var rrCallback = function(result){
    rrData = result;
    console.log('done2');
}
parserrData(rrCallback);

app.get('/train', function(req, res){
    //res.send(getStopsByRouteId('BNSF'));
    //res.send(getFutureTrainsAtStation('WESTSPRING'));
    //getCurrentTrains('BNSF','CUS','WESTSPRING', callback);
    res.send(rrData);
    //checkForGTFSURL(callback);
    //res.send(gtfsData);
});

app.post('/stations', function (req, res){
    
   var callback = function(result){
       res.send(result);
   }
   getStationsList(req.body.line, callback);
});

app.post('/close_stations', function (req, res){
    var results = findNearStations({lat:req.body.lat, lon:req.body.lon},req.body.radius);
    results = results.splice(0,req.body.max);
    var temp = [];
    for (index in results){
        var distRnd = Math.round(results[index].distance * 100) / 100;
        temp.push({stop_id: results[index].stop.stop_id, stop_name: results[index].stop.stop_name, distance: distRnd});
    }
    res.send(temp);
});
app.post('/close_crossings', function(req, res){
    res.send(getNearCrossingsGPS(req.body.lat,req.body.lon,req.body.radius));
});
app.post('/blocked_crossings', function(req, res){
    var callback = function(result){
        res.send(result);
    }
    getBlockedCrossings(req.body.stopId, callback);
});
app.post('/future_trains', function (req, res){
    var callback = function(result){
        res.send(result);
    }
    getAllFutureTrains(req.body.stopId,req.body.routeId,callback);
});

function parserrData(callback){
        fs.readFile('./rrdata/illinois.txt','utf8', function(err,data){
            csvparse(data,{'columns': true, 'trim': true}, function(err,data){
                callback(data)
            });
        });

}
/*var getNearCrossingsGPS = function(lat,lon,radius,callback){
    var crossings = null;
    geocoder.reverse(lat, lon, function(err, data) {
        for(index in data){
            data[index].city = data[index].city.toUpperCase();
            if(data[index].city == 'WESTERN SPRINGS'){
                data[index].city = "WESTERN SPGS";
            }
        }*
            crossings = _.filter(rrData,function(item){
                for(index in data){
                    if(item.CITYNAM == data[index].city.toUpperCase()){
                        return true;
                    }
                }
            });
            for(crossIndex in crossings){
                crossings[crossIndex] = _.pick(crossings[crossIndex],'STREET','CROSSING')
            }
            callback(crossings);
    });
}*/
var getNearCrossingsGPS = function(lat,lon,radius){
    var crossings = _.filter(rrData,function(item){
        var loc1 = {lat: lat, lon: lon};
        var loc2 = {lat: item.LATITUDE/10000000, lon: item.LONGITUD/10000000};
        var dist = getDistanceBetweenPoints(loc1,loc2);
        item.DISTANCE = dist;
        item.LATITUDE = item.LATITUDE/10000000;
        item.LONGITUD = item.LONGITUD/10000000;
        return(dist<=radius && item.STREET != "PEDESTRIAN PATHWY" && item.STREET != "TOLLWAY");
    });
    for(crossIndex in crossings){
        crossings[crossIndex] = _.pick(crossings[crossIndex],'STREET','CROSSING','DISTANCE','LATITUDE','LONGITUD');
    }
    return crossings;
}
var getBlockedCrossings = function(stopId, callback){
    var stop = null;
    for(index in gtfsData.stops){
        if(gtfsData.stops[index].stop_id == stopId){
            stop = gtfsData.stops[index];
            break;
        }
    }
    
    var futureCallback = function(trains){
        var crossings = _.sortBy(getNearCrossingsGPS(stop.stop_lat,stop.stop_lon,0.19),'DISTANCE');
        var d = new Date();
        var currentTime = {hours: d.getHours(), minutes: d.getMinutes(), seconds: d.getSeconds()};
        for(index in trains.outbound){
            var arrivalTime = parseTime(trains.outbound[index].arrival_time);
            var diff = getTimeDifference(currentTime, arrivalTime);
            if(Math.abs(diff) < 60){
                callback(crossings);
            }
        }
        for(index in trains.inbound){
            var arrivalTime = parseTime(trains.inbound[index].arrival_time);
            var diff = getTimeDifference(currentTime, arrivalTime);
            if(Math.abs(diff) < 60){
                callback(crossings);
            }
        }
        callback(crossings);
    }
    getAllFutureTrains(stopId,'BNSF',futureCallback);
}
/*var getAdjacentCrossings = function(stopId){
    var stop = null;
    for(index in gtfsData.stops){
        if(gtfsData.stops[index].stop_id == stopId){
            stop = gtfsData.stops[index];
            break;
        }
    }
    var crossings = _.sortBy(getNearCrossingsGPS(stop.stop_lat,stop.stop_lon,1),'DISTANCE');
    var blockAble = [];
    for(index in crossings){
        loc1 = {lat: stop.stop_lat,lon:stop.stop_lon};
        loc2 = {lat: crossings[index].LATITUDE,lon: crossings[index].LONGITUD};
        var temp = getDistanceBetweenPoints(loc1,loc2));
        if(Math.abs(temp < 0.19)){
            blocked.push(temp);
        }
    }
    return blocked;
}*/
var getAllFutureTrains = function(stopId, routeId, callback){
    var newTrains = {};
    var scheduledTrains = getFutureTrainsAtStation(stopId)
    var liveTrains = {'inbound':[], 'outbound':[]};
    var i = 0;
    var tempCallback = function(data, direction){
        liveTrains[direction] = data;
        i++;
        if(i > 1){
            newTrains.inbound = mergeTrains(scheduledTrains.inbound, liveTrains.inbound);
            newTrains.outbound = mergeTrains(scheduledTrains.outbound, liveTrains.outbound);
            callback(newTrains);
        }
    }
    getLiveTrains(routeId, 'CUS', 'WESTSPRING', 'outbound', tempCallback);
    getLiveTrains(routeId, 'WESTSPRING', 'CUS', 'inbound', tempCallback);
}
var getBearingFromTwoPoints = function(pointA, pointB){
    var lat1 = pointA.lat*(Math.PI/180);
    var lat2 = pointB.lat*(Math.PI/180);
    var latDiff = (pointB.lat-pointA.lat)*(Math.PI/180);
    var longDiff = (pointB.lon-pointA.lon)*(Math.PI/180);

    var y = Math.sin(longDiff) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(longDiff);
    return Math.atan2(y, x)*(Math.PI/180);
}
var mergeTrains = function(scheduledTrains, liveTrains){
    var keys = _.keys(liveTrains);
    for(sch in scheduledTrains){
        keys.forEach(function(key){
            if(scheduledTrains[sch].trip_id == key.trip_id){
                scheduledTrains[sch].arrival_time = key.estimated_arv_time;
                scheduledTrains[sch].departure_time = key.estimated_dpt_time;
                scheduledTrains[sch].live = true;
            }
        });
    }
    return scheduledTrains;
}

var getLiveTrains = function (line, originStopId, destinationStopId, direction, callback){
    var trackerParams = {
        "line": line,
        "origin": originStopId,
        "destination": destinationStopId
    };
     request.get(trackerURL+querystring.stringify(trackerParams), function (e,r,body){
        callback(JSON.parse(body), direction);
    }); 
}

function getStationsList(line, callback){
    var lineStationsParams = {
        'trainLineId': line,
        'trackerNumber': '0'
    };
    request.get(lineStationsURL+querystring.stringify(lineStationsParams), function(e,r,body){
        var stationsList = JSON.parse(body).stations;
        var stationsArray = [];
        
        for(key in stationsList){
            var currentObj = stationsList[key];
            stationsArray.push({'id':currentObj.id,'name':currentObj.name}); 
        }
        callback(stationsArray);
    });
}

function getGTFSData(currentGTFSURL){
    request(currentGTFSURL).pipe(unzip.Extract({path:'./gtfsdata'}));
}

function parseGTFSData(callback){
    var gtfsData = {};
    var fileList = fs.readdirSync('./gtfsdata');
    var i = 0;
    for(key in fileList){
        fileList[key]=fileList[key].split('.')[0];
    }
    fileList.forEach(function(fileName){
        fs.readFile('./gtfsdata/'+fileName+'.txt','utf8', function(err,data){
            csvparse(data,{'columns': true, 'trim': true}, function(err,data){
                gtfsData[fileName] = data;
                i++;
                if(i==fileList.length){
                    callback(gtfsData);   
                }
            });
        });
    });
}

function checkForGTFSURL(callback){
    var isaTag = false;
    var tempAttrib;
    var newURL = '';
    request.get(updateGTFSURL, function(err,res,body){
        var parser = new htmlparser.Parser({
            onopentag: function(name, attribs){
                if(name == "a"){
                    isaTag = true;
                    tempAttrib = attribs;
                }
            },
            ontext: function(text){
                if(isaTag == true && text === "Data"){
                        newURL = res.request.uri.hostname + tempAttrib.href;
                }
            },
            onclosetag: function(tagname){
                bool = false;
            }
        });
        parser.write(body);
        parser.end();
    });
    if(newURL == updateGTFSURL){
        updateGTFSURL = newURL;
        return true;
    }
    return false;
}

var getRoutes = function(){
    return gtfsData.routes;
}

var getTripsByRoute = function (routeId){
    var trips = gtfsData.trips;
    var tripArray = [];
    for(index in trips){
        if(trips[index].route_id == routeId){
            tripArray.push(trips[index]);
        }
    }
    return tripArray;
}

var getStopTimesByTrip = function (tripArray){
    var stopTimes = gtfsData.stop_times;
    var stopTimeArray = [];
    for(stopIndex in stopTimes){
        for(tripIndex in tripArray){
            if(stopTimes[stopIndex].trip_id == tripArray[tripIndex].trip_id){
                stopTimeArray.push(stopTimes[stopIndex]);
            }
        }
    }
    return stopTimeArray;
}

var getStopsFromStopId = function (stopTimeArray){
    var stops = gtfsData.stops;
    var stopArray = [];
    for(timeIndex in stopTimeArray){
        for(stopIndex in stops){
            if(stopTimeArray[timeIndex].stop_id == stops[stopIndex].stop_id){
                stopArray.push(stops[stopIndex]);
            }
        }
    }
    return stopArray;
}

var getStopsByRouteId = function (routeId){
    return removeDuplicates(getStopsFromStopId(getStopTimesByTrip(getTripsByRoute(routeId))));
}

var findNearStations = function (loc, radius){
    var stationArray = [];
    for(routeIndex in gtfsData.routes){
        var stops = getStopsByRouteId(gtfsData.routes[routeIndex].route_id);
        for(stopIndex in stops){
            var loc2 = {lat: stops[stopIndex].stop_lat, lon: stops[stopIndex].stop_lon};
            var dis = getDistanceBetweenPoints(loc2,loc);
            if(dis <= radius){
                stationArray.push({stop: stops[stopIndex], distance: dis});
            }
        }
    }
    return _.sortBy(stationArray,'distance');
}

var getDistanceBetweenPoints = function (pointA, pointB){
    var R = 6371000; // metres
    var lat1 = pointA.lat*(Math.PI/180);
    var lat2 = pointB.lat*(Math.PI/180);
    var latDiff = (pointB.lat-pointA.lat)*(Math.PI/180);
    var longDiff = (pointB.lon-pointA.lon)*(Math.PI/180);
    var a = Math.sin(latDiff/2) * Math.sin(latDiff/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(longDiff/2) * Math.sin(longDiff/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.abs(R * c * 0.000621371);
}
var getDirectionFromTripId = function(tripId){
    var trips = gtfsData.trips;
    for(tripIndex in trips){
        if(trips[tripIndex].trip_id == tripId){
            if(trips[tripIndex].direction_id == 0){
                return 'inbound';
            }
            else if(trips[tripIndex].direction_id == 1){
                return 'outbound';
            }
        }
    }
}

var getFutureTrainsAtStation = function (stopId){
    var stopTimes = gtfsData.stop_times;
    var trainArray = {inbound: [], outbound:[]};
    var d = new Date();
    var currentTime = {hours: d.getHours(), minutes: d.getMinutes(), seconds: d.getSeconds()};
    for(stopIndex in stopTimes){
        if(stopTimes[stopIndex].stop_id == stopId && getTimeDifference(currentTime,parseTime(stopTimes[stopIndex].arrival_time)) < 0){
            var dir = getDirectionFromTripId(stopTimes[stopIndex].trip_id);
            trainArray[dir].push(stopTimes[stopIndex]);
        }
    }
    return trainArray;
}

var getTimeDifference = function(timeA, timeB){
    var aMs = parseInt(timeA.hours)*3600 + parseInt(timeA.minutes)*60 + parseInt(timeA.seconds);
    var bMs = parseInt(timeB.hours)*3600 + parseInt(timeB.minutes)*60 + parseInt(timeB.seconds);
    return aMs - bMs;
}

var parseTime = function(timeString){
    stringArr = timeString.split(':');
    return {hours: stringArr[0], minutes: stringArr[1], seconds: stringArr[2]}
}

var removeDuplicates = function(array){
    return _.uniq(array);
}

var getInvalidServiceIds = function(){
    var d = new Date();
    switch(d.getDay()){
        case 0:
            var dayOfWeek = 'sunday';
            break;
        case 1:
            var dayOfWeek = 'monday';
            break;
        case 2:
            var dayOfWeek = 'tuesday';
            break;
        case 3:
            var dayOfWeek = 'wednesday';
            break;
        case 4:
            var dayOfWeek = 'thursday';
            break;
        case 5:
            var dayOfWeek = 'friday';
            break;
        case 6:
            var dayOfWeek = 'saturday';
            break;
    }
    var year = d.getFullYear();
    var month =  d.getMonth()+1;
    var day = d.getDay()+1;
    var currentDate = {year: year, month: month, day: day};
    var tempInvalid = {serviceIds:[], tripIds: []};
    for(index in gtfsData.calendar){
        if(!(gtfsData.calendar[index][dayOfWeek] == 1 && isBetweenDate(currentDate, parseDate(gtfsData.calendar[index].start_date), parseDate(gtfsData.calendar[index].end_date)))){
            tempInvalid.serviceIds.push(gtfsData.calendar[index].service_id);
            for(tripIndex in gtfsData.trips){
                if(gtfsData.trips[tripIndex].service_id == gtfsData.calendar[index].service_id){
                    tempInvalid.tripIds.push(gtfsData.trips[tripIndex].trip_id);
                }
            }
        }
    }
    return tempInvalid;
}

var isBetweenDate = function (currentDate, startDate, endDate){
    var currentVal = currentDate.year*365 + convertMonthToDays(currentDate.month-1,currentDate.year) + parseInt(currentDate.day);
    var startVal = startDate.year*365 + convertMonthToDays(startDate.month-1,startDate.year) + parseInt(startDate.day);
    var endVal = endDate.year*365 + convertMonthToDays(endDate.month-1,startDate.year) + parseInt(endDate.day);
    return (currentVal >= startVal && currentVal <= endVal);
}
var isLeapYear = function(year){
    if(year%4==0){
        if(year%100==0){
            if(year%400==0){
                return true;
            }
            else{
                return false;
            }
        }
        return true;
    }
    return false;
}
var convertMonthToDays = function(month, year){
    if(isLeapYear(year)){
        var temp = [0,31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366];
    }
    else{
        var temp = [0,31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
    }
    return temp[month];
}
var parseDate = function(dateString){
    return {year: dateString.substring(0,4), month: dateString.substring(4,6), day: dateString.substring(6,8)}
}

var removeInvalidServiceIds = function(){
    var newData = {};
    var keys = _.keys(gtfsData);
    keys.forEach(function(item){
        if(item != 'calendar'){
            newData[item] = _.reject(gtfsData[item], filterFunc);
        }
    });
    return newData;
}

var filterFunc = function(data){
    var serv = _.find(invalidIds.serviceIds, function(item){
        return(item == data.service_id);
    });
    if(serv !== undefined){
        return true;
    }
    var trip = _.find(invalidIds.tripIds, function(item){
        return(item == data.trip_id);
    });
    if(trip !== undefined){
        return true;
    }
    return false;
}
app.use(error);
app.listen(5000);

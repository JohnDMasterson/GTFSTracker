//using node.js 0.10.26 and mongodb 2.6.0

// Import main libraries
var express = require('express');
var request = require('request');
var querystring = require('querystring');
var unzip = require('unzip');
var fs = require('fs');
var csvparse = require('csv-parse');
var htmlparser = require('htmlparser2');

var trackerURL = "http://metrarail.com/content/metra/en/home/jcr:content/trainTracker.get_train_data.json?";
var lineStationsURL = "http://metrarail.com/content/metra/wap/en/home/RailTimeTracker/jcr:content/trainTracker.get_stations_from_line.json?" 
var currentGTFSURL = "http://metrarail.com/content/dam/metra/documents/GTFS_Feed/GTFSdata082514.zip";
var updateGTFSURL = "http://metrarail.com/metra/en/home/about_metra/obtaining_records_from_metra.html";

// Set up the object for our app
app = express();
app.use(express.static(__dirname + '/clientside'));

app.get('/train', function(req, res){
    callback = function(result){
        res.send(result);  
    };
    //getCurrentTrains('BNSF','CUS','WESTSPRING', callback);
    
    //checkForGTFSURL(callback);
    //getGTFSData(currentGTFSURL);
    parseGTFSData(callback);
});

app.get('/stations', function(req, res){
    
   callback = function(result){
       res.send(result);
   }
   getStationsList(req.query.l, callback);
});

function getCurrentTrains(line, origin, destination, callback){
    var trackerParams = {
        "line": line,
        "origin": origin,
        "destination": destination,
        directionId: "1"
    };
     request.get(trackerURL+querystring.stringify(trackerParams), function (e,r,body){
        callback(JSON.parse(body));
    }); 
};

function getTrainsAtStation(line, stationId, time, callback){
    var trainArray = []
    callback = function(trains){
        for(index in trains){
            trainArray.push(trains[index]);   
        }
    }
    getLiveInbound(line, stationId, callback);
    getLiveOutbound(line, stationId, callback);
    getScheduledInbound(line, stationId, time, callback);
    getScheduledOutbound(line, stationId, time, callback);
}

function getLiveInbound(line, stationId, callback){
    var trackerParams = {
        "line": line,
        "origin": origin,
        "destination": destination,
        directionId: "1"
    };
     request.get(trackerURL+querystring.stringify(trackerParams), function (e,r,body){
        callback(JSON.parse(body));
    }); 
}
function getLiveOutbound(line, stationId, callback){
    
}
function getScheduledInbound(line, stationId, time, callback){
    
}
function getScheduledOutbound(line, stationId, time, callback){
    
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
    var gtfsData = [];
    var fileList = fs.readdirSync('./gtfsdata');
    var i = 0;
    for(key in fileList){
        fileList[key]=fileList[key].split('.')[0];
    }
    console.log(fileList);
    for(index in fileList){
        fs.readFile('./gtfsdata/'+fileList[index]+'.txt','utf8', function(err,data){
            csvparse(data, function(err,data){
                var tempObj = {}
                tempObj[fileList[i]]=data;
                gtfsData.push(tempObj);
                
                i++;
                if(i==fileList.length){
                    callback(gtfsData);   
                }
            });
        });
    }
}
//TODO: calendar.service_id[1] is a thing


function checkForGTFSURL(callback){
    var isaTag = false;
    var tempAttrib;
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
                        updateGTFSURL = res.request.uri.hostname + tempAttrib.href;
                }
            },
            onclosetag: function(tagname){
                bool = false;
            }
        });
        parser.write(body);
        parser.end();
    }); 
}

app.listen(5000);

/**
 * DC-transit
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 */

/*global $:false */


/**
 * A simple object for storing position
 * @param lat Latitude
 * @param lon Longitude
 * @constructor
 */
var GeoPosition = function (lat, lon) {
    'use strict';
    this.latitude = lat;
    this.longitude = lon;
};

/**
 *
 * @param ln The line of the train; red, blue, orange, etc.
 * @param car The number of cars on the train
 * @param dest The destination of the train
 * @param min The estimated amount of time until arrival
 * @param locCode The location code of the station
 * @constructor
 */
var Train = function (ln, car, dest, min, locCode) {
    'use strict';
    this.ln = ln;
    this.car = car;
    this.dest = dest;
    this.min = min;
    this.locCode = locCode;

    this.stringify = function () {
        return this.ln + ' ' + this.car + ' ' + this.dest + ' ' + this.min;
    };
};

//var Station = function(name, ) { //create a station object?


var transit = {
    /*
     * Constants
     */
    /** @define {string} API Key for Metro */
    METRO_API_KEY:'33nw729n2kh4w3q2txxspceg',
    /** @define {string} Constant for denoting a debug statement */
    DEBUG:'DEBUG',
    /** @define {string} Constant for denoting a log statement */
    LOG:'LOG',
    /** @define {string} Constant for denoting an error statement */
    ERROR:'ERROR',

    temp : {}, //used for debugging only

    /*
     * States
     */
    /** @define {boolean} Determine if DC-transit went through initialization procedures */
    initialized:false,
    /** @define {boolean} */
    locationInitialized: false,
    /** @define {boolean} Determine if user has metro features enabled */
    metroEnabled:true,
    /** @define {boolean} Determine if user has capital bikeshare features enabled */
    cbsEnabled:null,
    /** @define {boolean} Determine if user has traffic features enabled */
    trafficEnabled:null,

    /*
     * Global Variables
     */

    /** @define {GeoPosition} Hold current position of user as a GeoPosition */
    curPosition:new GeoPosition(0, 0),

    /** @define {string} Holds the closest station ID */
    closestStationID:null,
    /** @define {string} Holds the display name of the closest station */
    closestStationName:null,
    /** @define {Array} Holds array of the station entrances near the current position */
    closeStations: [],
    /** @define {Array.<Trains>} Hold the estimated train arrivals for the closest station */
    closestStationArrivals: [],


    browserCapabilities:{
        geoLocation:null,
        localStorage:null
    },

    config:{
        loggingEnabled:true,
        debugEnabled:true,
        logOutput:null,
        debugOutput:null
    },

    init: function () {
        'use strict';

        transit.locationInitialized = transit.getInitialLocation();

        if (transit.cbsEnabled) {
            transit.out(transit.LOG, 'Initializing Cap Bike Share');
            transit.initCBS();
        }

        if (transit.trafficEnabled) {
            transit.out(transit.LOG, 'Initializing Traffic');
            transit.initTraffic();
        }

        transit.initialized = true;

    },

    out: function (type, message) {
        'use strict';
        if (type === transit.DEBUG && transit.config.debugEnabled === true) {
            console.log('DEBUG: ' + message);
        } else if (type === transit.LOG && transit.config.loggingEnabled === true) {
            console.log('  LOG: ' + message);
        } else if (type === transit.ERROR) {
            console.log('ERROR: ' + message);
        }
    },

    initMetro:function () {
        'use strict';

        transit.getClosestStations(transit.curPosition, 500, function() {
            transit.getClosestStationArrivals( function () {
                transit.populateArrivalBoard();
            });
        });  //maybe make configurable?

        //setInterval(updateArrivalBoard?)
    },

    initCBS:function () {
        'use strict';

    },

    initTraffic:function () {

    },

    /*
     * Geo-Location CALLS
     */

    /**
     * Called once, gets current position and initializes features based on location
     * @return {Boolean}
     */
    getInitialLocation:function () {
        'use strict';
        if (transit.initialized !== true) {
            if (navigator.geolocation) {
                transit.out(transit.LOG, 'Geolocation is supported');
                transit.browserCapabilities.geoLocation = true;
            }
            else {
                transit.out(transit.LOG, 'Geolocation is not supported for this Browser/OS version yet.');
                transit.browserCapabilities.geoLocation = false;
                return false;
            }
        }

        if (transit.browserCapabilities.geoLocation === true) {
            navigator.geolocation.getCurrentPosition(function (position) {
                transit.curPosition.latitude = position.coords.latitude;
                transit.curPosition.longitude = position.coords.longitude;

                //move this part somewhere else.
                document.getElementById("currentLat").innerHTML = transit.curPosition.latitude;
                document.getElementById("currentLon").innerHTML = transit.curPosition.longitude;

                //Initialize GPS related services
                if (transit.metroEnabled) {
                    transit.out(transit.LOG, 'Initializing Metro');
                    transit.initMetro();
                }

                return true;

            }, function (error) {
                var message;
                switch (error) {
                    case 0:
                        message = 'I dont know what happened'; //   0: unknown error
                        break;
                    case 1:
                        message = 'Your hardware said "No"';  //   1: permission denied
                        break;
                    case 2:
                        message = 'I have no idea where you are'; //   2: position unavailable (error response from locaton provider)
                        break;
                    case 3:
                        message = 'GPS Timed Out :-(';  //   3: timed out
                }
                transit.out(transit.ERROR, 'Geolocation error code: ' + message);
                return false;
            });
        }
    },

    /*
     * METRO API CALLS
     * api: 33nw729n2kh4w3q2txxspceg
     */

    /**
     *
     * @param currentPosition
     * @param radius
     * @param onStationRetrieval
     * @return {Boolean}
     *
     * Ref: http://developer.wmata.com/docs/read/Method8
     * for json:  http://api.wmata.com/Rail.svc/json/JStationEntrances?lat=38.878586&lon=-76.989626&radius=500&api_key=33nw729n2kh4w3q2txxspceg
     */

    getClosestStations:function (currentPosition, radius, onStationRetrieval) {
        'use strict';

        //transit.out(transit.DEBUG, 'Lat: ' + currentPosition.latitude);
        //transit.out(transit.DEBUG, 'Lon: ' + currentPosition.longitude);

        if (transit.browserCapabilities.geoLocation === true) {
            //if (transit.curPosition.latitude !== null && transit.curPosition.longitude !== null) {}
            $.getJSON('http://api.wmata.com/Rail.svc/json/JStationEntrances?lat=' +
                transit.curPosition.latitude + '&lon=' +
                transit.curPosition.longitude + '&radius=' +
                radius + '&api_key=' +
                transit.METRO_API_KEY + '&callback=?', function (data) {
                //transit.out(transit.LOG, JSON.stringify(data));

                transit.closestStationID = data.Entrances[0].StationCode1; //set the closest station, assuming first on in list is closest

                //populate transit.closeStations array
                for (var key in data.Entrances) {
                    if (data.Entrances.hasOwnProperty(key)) {
                        var entrance = data.Entrances[key];
                        transit.closeStations.push(entrance);
                    }
                }
                onStationRetrieval();
            });

        } else {
            transit.out(transit.DEBUG, 'GeoLocation was not true');
            return false;
        }
    },
    /**
     *
     * @param id Metro station location code
     *
     * API Call: http://api.wmata.com/StationPrediction.svc/json/GetPrediction/A10,A11?api_key=YOUR_API_KEY
     * example: http://api.wmata.com/StationPrediction.svc/json/GetPrediction/K01?api_key=33nw729n2kh4w3q2txxspceg
     * when no trains, returns {"Trains":[]}
     */
    getClosestStationArrivals: function (onArrivalsRetrieval) {
        'use strict';

        $.getJSON('http://api.wmata.com/StationPrediction.svc/json/GetPrediction/' +
            transit.closestStationID + '?api_key=' +
            transit.METRO_API_KEY + '&callback=?', function (data) {
            //transit.out(transit.LOG, JSON.stringify(data));
            for ( var key in data.Trains) {
                if (data.Trains.hasOwnProperty(key)) {
                    var train = data.Trains[key];
                    transit.closestStationArrivals.push( new Train(train.Line,train.Car, train.Destination, train.Min, train.LocationCode));
                    transit.out(transit.DEBUG, transit.closestStationArrivals[key].stringify());
                }
            }
            onArrivalsRetrieval();
        });

    },

    getStationNameByID: function (id, onStationName) {
        'use strict';
        //could also use http://developer.wmata.com/docs/read/Method_3_Station_Info
        $.getJSON('/dat/stations.json', function(data) {
            //transit.out(transit.DEBUG, JSON.stringify(data));
            transit.out(transit.DEBUG, 'Looking for ' + id);
            for(var key in data.Stations) {
                if (data.Stations.hasOwnProperty(key)) {
                    if(data.Stations[key].Code === id) {
                        transit.out(transit.DEBUG, 'Name is: ' + data.Stations[key].Name);
                        onStationName(data.Stations[key].Name);
                    }
                }
            }
        });

    },

    populateArrivalBoard: function () {
        'use strict';
        var minutes;

        //notify closest metro
        transit.getStationNameByID(transit.closestStationID, function (name) {
            transit.out(transit.LOG,'Closest station' + name);
            $('#metro-station').append('<h2>' + name + '</h2>');
        });

        //Populate Arrival Trains
        //check for no trains?
        for (var key in transit.closestStationArrivals) {
            if (transit.closestStationArrivals.hasOwnProperty(key)) {
                var train = transit.closestStationArrivals[key];
                //check if train is boarding, if so, add blink tag
                if(train.min === 'BRD') {
                    minutes = '<blink>' + train.min + '</blink>';
                } else {
                    minutes = train.min;
                }
                //populate html into board
                $('#metro-arrival-board').append(
                    '<tr class="train">' +
                        '<td>' + train.ln + '</td>' +
                        '<td>' + train.car + '</td>' +
                        '<td>' + train.dest + '</td>' +
                        '<td class="right">' + minutes + '</td>' +
                        '</tr>'
                );
            }
        }
    }



};



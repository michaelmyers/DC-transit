/**
 * DC-transit
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 */

/*global $:false */

var GeoPosition = function (lat, lon) {
    'use strict';
    this.latitude = lat;
    this.longitude = lon;
};


var transit = {
    //Constants
    METRO_API_KEY:'33nw729n2kh4w3q2txxspceg',
    DEBUG:'DEBUG',
    LOG:'LOG',
    ERROR:'ERROR',

    //States
    initialized:null,
    metroEnabled:null, //metro station assistance
    cbsEnabled:null, //capital bike share assistance
    trafficEnabled:null,

    //location
    curPosition:new GeoPosition(0, 0),

    //metro
    closestStation:null,


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

    init:function () {
        'use strict';

        transit.getLocation();


        if (transit.metroEnabled) {
            transit.initMetro();
        }

        if (transit.cbsEnabled) {
            transit.initCBS();
        }

        if (transit.trafficEnabled) {
            transit.initTraffic();
        }

        transit.initialized = true;

    },

    out:function (type, message) {
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

    },

    initCBS:function () {
        'use strict';

    },

    initTraffic:function () {

    },

    /*
     GEOLOCATION CALLS
     */

    /**
     *
     */
    getLocation:function () {
        'use strict';
        if (transit.initialized !== true) {
            if (navigator.geolocation) {
                transit.out(transit.LOG, 'Geolocation is supported');
                transit.browserCapabilities.geoLocation = true;
            }
            else {
                transit.out(transit.LOG, 'Geolocation is not supported for this Browser/OS version yet.');
                transit.browserCapabilities.geoLocation = false;
            }
        }

        if (transit.browserCapabilities.geoLocation === true) {
            navigator.geolocation.getCurrentPosition(function (position) {
                transit.curPosition.latitude = position.coords.latitude;
                transit.curPosition.longitude = position.coords.longitude;

                //move this part somewhere else.
                document.getElementById("currentLat").innerHTML = transit.curPosition.latitude;
                document.getElementById("currentLon").innerHTML = transit.curPosition.longitude;
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

            });
        }

    },

    /*
     METRO API CALLS
     */
    //api: 33nw729n2kh4w3q2txxspceg

    getClosestStation:function (currentPosition, radius) {
        'use strict';

        var jsonData;

        //33nw729n2kh4w3q2txxspceg
        // Ref: http://developer.wmata.com/docs/read/Method8
        // for json:  http://api.wmata.com/Rail.svc/json/JStationEntrances?lat=38.878586&lon=-76.989626&radius=500&api_key=33nw729n2kh4w3q2txxspceg
        // example: http://api.wmata.com/Rail.svc/json/JStationEntrances?lat=38.890389&lon=%20-77.084144&radius=500&api_key=33nw729n2kh4w3q2txxspceg
        if (transit.browserCapabilities.geoLocation === true) {
            if (transit.curPosition.latitude !== null && transit.curPosition.longitude !== null) {

            }
            $.getJSON('http://api.wmata.com/Rail.svc/json/JStationEntrances?lat=' +
                transit.curPosition.latitude + '&lon=' +
                transit.curPosition.longitude + '&radius=' +
                radius + '&api_key=' +
                transit.METRO_API_KEY + '&callback=?', function (data) {
                transit.out(transit.LOG, JSON.stringify(data));
                for (var key in data.Entrances) {
                    if (data.Entrances.hasOwnProperty(key)) {
                        var entrance = data.Entrances[key];
                        console.log(entrance.StationCode1);
                    }
                    transit.closestStation = data.Entrances[0];
                }
            });

        } else {
            transit.log(transit.DEBUG, 'GeoLocation was not true');
            return false;
        }

    },


    getStationArrivals:function (id) {
        //http://api.wmata.com/StationPrediction.svc/json/GetPrediction/A10,A11?api_key=YOUR_API_KEY
        //http://api.wmata.com/StationPrediction.svc/json/GetPrediction/K01?api_key=33nw729n2kh4w3q2txxspceg

        $.getJSON('http://api.wmata.com/StationPrediction.svc/json/GetPrediction/' + id
            + '?api_key=' + transit.METRO_API_KEY + '&callback=?', function (data) {
            transit.out(transit.LOG, JSON.stringify(data));
        })


    }



};



/**
 * DC-transit
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 */

/*global $:false ui:false transit:false */


/**
 * A simple object for storing position
 * @param lat Latitude
 * @param lon Longitude
 * @constructor
 */
transit.GeoPosition = function (lat, lon) {
    'use strict';
    this.latitude = lat;
    this.longitude = lon;
};

transit.position = {

    /** @define {GeoPosition} Hold current position of user as a GeoPosition */
    curPosition: new transit.GeoPosition(0, 0),

    init:function () {
        'use strict';

        if (transit.initialized !== true) {
            if (navigator.geolocation) {
                transit.out.info('Geolocation is supported');
                transit.browserCapabilities.geoLocation = true;
            }
            else {
                transit.out.info('Geolocation is not supported for this Browser/OS version yet.');
                alert('Your browser doesn\'t support geolocation so we can\'t help you with location based services');
                transit.browserCapabilities.geoLocation = false;
                return false;
            }
        }

        transit.position.getInitialLocation(transit.position.onInitialLocation);
        transit.out.info('Position initialized');
    },

    /**
     * Called once, gets current position and initializes features based on location
     * @param {function()} onInitialLocation  callback for when location is received
     */
    getInitialLocation:function (onInitialLocation) {
        'use strict';

        if (transit.browserCapabilities.geoLocation === true) {
            navigator.geolocation.getCurrentPosition(function (position) {

                transit.position.curPosition.latitude = position.coords.latitude;
                transit.position.curPosition.longitude = position.coords.longitude;
                transit.out.info('Initial position found at ' + transit.position.curPosition.latitude +
                    ', ' + transit.position.curPosition.longitude);

                //move this part somewhere else.
                document.getElementById("currentLat").innerHTML = transit.position.curPosition.latitude;
                document.getElementById("currentLon").innerHTML = transit.position.curPosition.longitude;

                //Initialize GPS related services
                onInitialLocation();

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
                alert('We could\'t get your location');
                transit.out.warn('geolocation error code: ' + message);
            });
        }
    },


    onInitialLocation: function () {
        'use strict';
        if (transit.metroEnabled) {
            transit.metro.init();
        }

        //get new location every 20 seconds
        setInterval(function () {
            transit.position.updateLocation();
        }, 20000);
    },

    updateLocation : function () {
        'use strict';
        navigator.geolocation.getCurrentPosition(function (position) {
            transit.position.curPosition.latitude = position.coords.latitude;
            transit.position.curPosition.longitude = position.coords.longitude;
            transit.out.info('Position updated to ' + transit.position.curPosition.latitude +
                ', ' + transit.position.curPosition.longitude);

            //move this part somewhere else.
            document.getElementById("currentLat").innerHTML = transit.position.curPosition.latitude;
            document.getElementById("currentLon").innerHTML = transit.position.curPosition.longitude;
        });
    }
};

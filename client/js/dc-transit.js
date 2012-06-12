/**
 * DC-transit
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 */

/*global $:false */

var transit = {

    initialized : null,

    browserCapabilities : {
        geoLocation : null,
        localStorage : null
    },

    init : function () {
        'use strict';

        transit.getLocation();

        transit.initialized = true;

    },

    getLocation : function () {
        'use strict';
        if (transit.initialized !== true) {
            if (navigator.geolocation) {
                console.log('Geolocation is supported!');
                transit.browserCapabilities.geoLocation = true;
            }
            else {
                console.log('Geolocation is not supported for this Browser/OS version yet.');
                transit.browserCapabilities.geoLocation = false;
            }
        }


        if (transit.browserCapabilities.geoLocation === true) {
            navigator.geolocation.getCurrentPosition(function(position) {
                // same as above
            }, function(error) {
                alert('Error occurred. Error code: ' + error.code);
                // error.code can be:
                //   0: unknown error
                //   1: permission denied
                //   2: position unavailable (error response from locaton provider)
                //   3: timed out
            });
        }

    }



};



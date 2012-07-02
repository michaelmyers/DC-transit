/**
 * DC-transit
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 */

/*global $:false ui:false transit:false */


transit.test = {



    dummyLocations : [],

    location : function () {
        'use strict';
        var $inputs = $('#location :input');

        var values = {};
        $inputs.each(function() {
            values[this.name] = $(this).val();
        });
        transit.out.info(values.lat);
        transit.out.info(values.lon);

        var testLocation = new transit.GeoPosition(values.lat, values.lon);

        transit.metro.getClosestStations(testLocation);


    }

};

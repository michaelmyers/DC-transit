/**
 * DC-transit
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 */

/*global $:false ui:false transit:false */

transit.metro = {

    /** @define {string} API Key for Metro */
    API_KEY:'33nw729n2kh4w3q2txxspceg',

    /** @define {string} Holds the closest station ID */
    closestStationID:null,
    /** @define {string} Holds the display name of the closest station */
    closestStationName:null,
    /** @define {Array} Holds array of the station entrances near the current position */
    closeStations:[],
    /** @define {Array.<transit.metro.Train>} Hold the estimated train arrivals for the closest station */
    closestStationArrivals:[],

    /**
     *
     * @param ln The line of the train; red, blue, orange, etc.
     * @param car The number of cars on the train
     * @param dest The destination of the train
     * @param min The estimated amount of time until arrival
     * @param locCode The location code of the station
     * @constructor
     */
    Train:function (ln, car, dest, min, locCode) {
        'use strict';
        this.ln = ln;
        this.car = car;
        this.dest = dest;
        this.min = min;
        this.locCode = locCode;

        this.stringify = function () {
            return this.ln + ' ' + this.car + ' ' + this.dest + ' ' + this.min + ' ' + this.locCode;
        };
    },

    init:function () {
        'use strict';

        transit.out.info('Initializing Metro');

        transit.metro.getClosestStations(transit.position.curPosition);

        setInterval(function () {
            transit.metro.getClosestStations(transit.position.curPosition);
        }, 20000);
    },

    getClosestStations:function (geoPosition) {
        'use strict';
        transit.out.info('Retrieving closest station arrival times for ' + geoPosition.latitude + ', ' + geoPosition.longitude);
        transit.metro.cleanData();//clear out pre-existing data

        transit.metro.getClosestStationData(geoPosition, function () {
            transit.metro.getClosestStationArrivals(function () {
                transit.metro.populateArrivalBoard();
            });
        });
    },

    /**
     *
     * @param currentPosition
     * @param onStationRetrieval
     *
     * Ref: http://developer.wmata.com/docs/read/Method8
     * for json:  http://api.wmata.com/Rail.svc/json/JStationEntrances?lat=38.878586&lon=-76.989626&radius=500&api_key=33nw729n2kh4w3q2txxspceg
     */

    getClosestStationData:function (geoPosition, onStationRetrieval) {
        'use strict';
        var radius, call, timer;

        radius = 500;

        //transit.out(transit.DEBUG, 'Lat: ' + currentPosition.latitude);
        //transit.out(transit.DEBUG, 'Lon: ' + currentPosition.longitude);

        timer = setTimeout(function () {
            timer = null;
            //call.abort();
            transit.out.warn('Timeout reached on retrieving closest station');
            getStation(1500);
        }, 2000);

        getStation(geoPosition, 500); //start condition

        function getStation(position, radius) {
            if (transit.browserCapabilities.geoLocation === true) {
                //if (transit.curPosition.latitude !== null && transit.curPosition.longitude !== null) {}
                call = $.getJSON('http://api.wmata.com/Rail.svc/json/JStationEntrances?lat=' +
                    position.latitude + '&lon=' +
                    position.longitude + '&radius=' +
                    radius + '&api_key=' +
                    transit.metro.API_KEY + '&callback=?', function (data) {
                    //transit.out(transit.LOG, JSON.stringify(data));
                    if (timer) {
                        clearTimeout(timer);
                        transit.out.debug('Data received for ' + radius + ' meters');
                    }
                    //transit.out.object(data);
                    //transit.temp = data;
                    if(data.Entrances.length === 0) {
                        if( radius < 3000) { //exit criteria
                            getStation(position, radius + 1000); //recursion
                        } else {
                            //tell them the bad news....
                            transit.metro.cleanBoard();
                            $('#metro-station').append('<p>You are more than 2 miles from a metro</p>');
                            transit.out.warn('You are more than 2 miles from a metro');
                        }
                    } else if (data.Entrances.length > 0) {
                        transit.metro.closestStationID = data.Entrances[0].StationCode1; //set the closest station, assuming first on in list is closest
                        //populate transit.closeStations array
                        for (var key in data.Entrances) {
                            if (data.Entrances.hasOwnProperty(key)) {
                                var entrance = data.Entrances[key];
                                transit.metro.closeStations.push(entrance);
                            }
                        }
                        onStationRetrieval();

                    } else {
                        transit.out.warn('Something unexpected happened when trying to retrieve station data');
                    }
                });

            } else {
                transit.out.warn('GeoLocation was not true');
            }
        }

    },

    /**
     *
     * @param onArrivalsRetrieval callback once arrival times received
     *
     * API Call: http://api.wmata.com/StationPrediction.svc/json/GetPrediction/A10,A11?api_key=YOUR_API_KEY
     * example: http://api.wmata.com/StationPrediction.svc/json/GetPrediction/K01?api_key=33nw729n2kh4w3q2txxspceg
     * when no trains, returns {"Trains":[]}
     */
    getClosestStationArrivals:function (onArrivalsRetrieval) {
        'use strict';

        $.getJSON('http://api.wmata.com/StationPrediction.svc/json/GetPrediction/' +
            transit.metro.closestStationID + '?api_key=' +
            transit.metro.API_KEY + '&callback=?', function (data) {
            //transit.out(transit.LOG, JSON.stringify(data));
            for (var key in data.Trains) {
                if (data.Trains.hasOwnProperty(key)) {
                    /**
                     * The current train
                     * @type {transit.metro.Train}
                     */
                    var train = data.Trains[key];
                    transit.metro.closestStationArrivals.push(new transit.metro.Train(train.Line, train.Car, train.Destination, train.Min, train.LocationCode));
                    //transit.out.debug(transit.metro.closestStationArrivals[key].stringify());
                }
            }
            onArrivalsRetrieval();
        });

    },

    getStationNameByID:function (id, onStationName) {
        'use strict';
        //could also use http://developer.wmata.com/docs/read/Method_3_Station_Info
        $.getJSON('/dat/stations.json', function (data) {
            //transit.out(transit.DEBUG, JSON.stringify(data));
            //transit.out.debug('Looking for ' + id);
            for (var key in data.Stations) {
                if (data.Stations.hasOwnProperty(key)) {
                    if (data.Stations[key].Code === id) {
                        transit.out.debug('Closest station is ' + data.Stations[key].Name);
                        onStationName(data.Stations[key].Name);
                    }
                }
            }
        });

    },

    populateArrivalBoard:function () {
        'use strict';
        var minutes;

        transit.metro.cleanBoard();

        //notify closest metro
        transit.metro.getStationNameByID(transit.metro.closestStationID, function (name) {
            $('#metro-station').append('<h2>' + name + '</h2>');
        });

        //Populate Arrival Trains
        //check for no trains?
        //TODO: Reduce this to one append, this is sloppy.
        $('#metro-arrival-board').append(
            '<tr id="metro-arrival-board-header" class="head">' +
                '<th> LN</th>' +
                '<th> CAR</th>' +
                '<th> DEST</th>' +
                '<th class="brd"> MIN</th>' +
            '</tr>'
        );


        for (var key in transit.metro.closestStationArrivals) {
            if (transit.metro.closestStationArrivals.hasOwnProperty(key)) {
                var train = transit.metro.closestStationArrivals[key];
                //check if train is boarding, if so, add blink tag
                if (train.min === 'BRD') {
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
    },

    cleanBoard: function () {
        'use strict';
        //clear out obnoxious loading text
        $('#metro-arrivals #loading').empty();
        //clear out old data if any
        $('#metro-station').empty();
        $('#metro-arrival-board').empty();
    },

    cleanData: function () {
        'use strict';
        transit.out.info('Cleaning Station Data');
        transit.metro.closestStationID = null;
        transit.metro.closestStationName = null;
        transit.metro.closeStations = [];
        transit.metro.closestStationArrivals = [];

    }

};
/**
 * DC-transit
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 */

/*global $:false ui:false */


var transit = {

    temp:{}, //used for debugging only

    /*
     * States
     */
    /** @define {boolean} Determine if DC-transit went through initialization procedures */
    initialized:false,
    /** @define {boolean} */
    locationInitialized:false,
    /** @define {boolean} Determine if user has metro features enabled */
    metroEnabled:true,
    /** @define {boolean} Determine if user has capital bikeshare features enabled */
    cbsEnabled:null,
    /** @define {boolean} Determine if user has traffic features enabled */
    trafficEnabled:null,

    /*
     * Global Variables
     */
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

        //ui.action.hidePanel('console');


        transit.centerRadar();

        transit.position.init();

        if (transit.cbsEnabled) {
            transit.out(transit.LOG, 'Initializing Cap Bike Share');
            transit.initCBS();
        }

        if (transit.trafficEnabled) {
            transit.out(transit.LOG, 'Initializing Traffic');
            transit.initTraffic();
        }
         /*
        //for alpha, disable the console for start-up, even if it was open previously
        if (ui.ids.indexOf('console') !== -1) {
            ui.action.hideTab('console');
        }    */

        ui.action.hidePanel('console');
        ui.panels[ui.ids.indexOf('console')].isDisabled = true;
        ui.panels[ui.ids.indexOf('about')].canDisable = false;

        ui.setup.clearPanelOptionsForm();
        ui.setup.disablePanelOptionsForm();
        ui.monitorForms();
        transit.initialized = true;
    },

    centerRadar:function () {    //this is a little hacky
        'use strict';
        var dcX = 2815;  //constants based on DCs location on the gif
        var dcY = 641;
        var offsetX, offsetY;

        offsetX = -1 * (dcX - ui.browser.width / 2);
        offsetY = -1 * (dcY - ui.browser.height / 2);

        $('#radar-container').css({'backgroundPosition':offsetX.toString() +
            'px ' + offsetY.toString() + 'px', 'height':ui.browser.height});

        transit.out.info('Browser is ' + ui.browser.width + ' X ' + ui.browser.height);
        if (ui.browser.width < 500) {
            $('#radar-container').css('backgroundImage', 'url(http://radar.weather.gov/Conus/RadarImg/latest.gif)');
        }
    },

    initCBS:function () {
        'use strict';

    },

    initTraffic:function () {

    }

    /**
     * WEATHER CALLS
     *
     * HOURLY on DC
     * http://graphical.weather.gov/xml/sample_products/browser_interface/ndfdXMLclient.php?whichClient=NDFDgen&lat=38.889764&lon=-77.009486&listLatLon=&lat1=&lon1=&lat2=&lon2=&resolutionSub=&listLat1=&listLon1=&listLat2=&listLon2=&resolutionList=&endPoint1Lat=&endPoint1Lon=&endPoint2Lat=&endPoint2Lon=&listEndPoint1Lat=&listEndPoint1Lon=&listEndPoint2Lat=&listEndPoint2Lon=&zipCodeList=&listZipCodeList=&centerPointLat=&centerPointLon=&distanceLat=&distanceLon=&resolutionSquare=&listCenterPointLat=&listCenterPointLon=&listDistanceLat=&listDistanceLon=&listResolutionSquare=&citiesLevel=&listCitiesLevel=&sector=&gmlListLatLon=&featureType=&requestedTime=&startTime=&endTime=&compType=&propertyName=&product=time-series&begin=2004-01-01T00%3A00%3A00&end=2016-06-25T00%3A00%3A00&Unit=e&maxt=maxt&mint=mint&temp=temp&wx=wx&Submit=Submit
     * http://graphical.weather.gov/xml/sample_products/browser_interface/ndfdXMLclient.php?whichClient=NDFDgen&lat=38.889764&lon=-77.009486&product=time-series&begin=2004-01-01T00%3A00%3A00&end=2016-06-25T00%3A00%3A00&Unit=e&maxt=maxt&mint=mint&temp=temp&wx=wx
     */

       /*
    getWeatherHourly:function () {
        'use strict';

        $.get('http://graphical.weather.gov/xml/sample_products/browser_interface/ndfdXMLclient.php?' +
            'whichClient=NDFDgen&lat=38.889764&lon=-77.009486&product=time-series&begin=2004-01-01T00%3A00%3A00' +
            '&end=2016-06-25T00%3A00%3A00&Unit=e&maxt=maxt&mint=mint&temp=temp&wx=wx', function (data) {
            transit.out(data);

        });
    }    */
};



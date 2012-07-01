//http://stackoverflow.com/questions/9151109/read-xml-hosted-file-with-nodejs

var http = require('http');
var XmlStream = require('xml-stream');
var options = { host: 'cloud.tfl.gov.uk',
    path: '/TrackerNet/LineStatus'};
var twitter = { host: 'api.twitter.com',
    path: '/1/statuses/user_timeline.rss?screen_name=myers_m'};
var hourlyWeather = {host: 'graphical.weather.gov',
    path: '/xml/sample_products/browser_interface/ndfdXMLclient.php?whichClient=NDFDgen&lat=38.889764&lon=-77.009486&product=time-series&begin=2004-01-01T00%3A00%3A00&end=2016-06-25T00%3A00%3A00&Unit=e&maxt=maxt&mint=mint&temp=temp&wx=wx'};
//http://www.capitalbikeshare.com/data/stations/bikeStations.xml
var capitalBike = {host:'capitalbikeshare.com',
    path: '/data/stations/bikeStations.xml'};

var request = http.get(capitalBike).on('response', function(response) {
    'use strict';
    response.setEncoding('utf8');
    var xml = new XmlStream(response, 'utf8');


    xml.on('updateElement: item', function(item) {

        item.title = item.title.match(/^[^:]+/)[0] + ' on ' +
            item.pubDate.replace(/ +[0-9]{4}/, '');
    });


    xml.on('text: item > pubDate', function(element) {
        element.$text = element.$text;

    });


    xml.on('data', function(data) {
        process.stdout.write(data);
    });
});


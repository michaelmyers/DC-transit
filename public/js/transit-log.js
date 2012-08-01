/**
 * DC-transit
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 */

/*global $:false ui:false transit:false */

transit.out = {

    level:{
        DEBUG:"DEBUG",
        INFO:" INFO",
        WARN:" WARN",
        FATAL:"FATAL"
    },

    object:function (object) { //simple wrapper to output objects to console for debugging
        'use strict';
        console.log(object);
    },

    info:function (message) {
        'use strict';
        transit.out.push(transit.out.level.INFO, message);
    },

    debug:function (message) {
        'use strict';
        transit.out.push(transit.out.level.DEBUG, message);
    },

    warn:function (message) {
        'use strict';
        transit.out.push(transit.out.level.WARN, message);
    },

    fatal:function (message) {
        'use strict';
        transit.out.push(transit.out.level.FATAL, message);
    },
    //internal to ui.out,
    push:function (level, message) {
        'use strict';
        var output = transit.util.currentTime() + ' ' + transit.util.string.rpad(level, 5, ' ') + ': ' + message;

        if (transit.config.debugEnabled === true) {
            console.log(output);
            if (transit.config.logOutput === true || ui) {
                ui.out.log(output);
            }
        }
    }

};



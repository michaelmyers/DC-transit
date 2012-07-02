/*
 * Hammer.JS
 * version 0.6.1
 * author: Eight Media
 * https://github.com/EightMedia/hammer.js
 */
function Hammer(element, options, undefined)
{
    var self = this;

    var defaults = {
        // prevent the default event or not... might be buggy when false
        prevent_default    : false,
        css_hacks          : true,

        swipe              : true,
        swipe_time         : 200,   // ms
        swipe_min_distance : 20, // pixels

        drag               : true,
        drag_vertical      : true,
        drag_horizontal    : true,
        // minimum distance before the drag event starts
        drag_min_distance  : 20, // pixels

        // pinch zoom and rotation
        transform          : true,
        scale_treshold     : 0.1,
        rotation_treshold  : 15, // degrees

        tap                : true,
        tap_double         : true,
        tap_max_interval   : 300,
        tap_max_distance   : 10,
        tap_double_distance: 20,

        hold               : true,
        hold_timeout       : 500
    };
    options = mergeObject(defaults, options);

    // some css hacks
    (function() {
        if(!options.css_hacks) {
            return false;
        }

        var vendors = ['webkit','moz','ms','o',''];
        var css_props = {
            "userSelect": "none",
            "touchCallout": "none",
            "userDrag": "none",
            "tapHighlightColor": "rgba(0,0,0,0)"
        };

        var prop = '';
        for(var i = 0; i < vendors.length; i++) {
            for(var p in css_props) {
                prop = p;
                if(vendors[i]) {
                    prop = vendors[i] + prop.substring(0, 1).toUpperCase() + prop.substring(1);
                }
                element.style[ prop ] = css_props[p];
            }
        }
    })();

    // holds the distance that has been moved
    var _distance = 0;

    // holds the exact angle that has been moved
    var _angle = 0;

    // holds the diraction that has been moved
    var _direction = 0;

    // holds position movement for sliding
    var _pos = { };

    // how many fingers are on the screen
    var _fingers = 0;

    var _first = false;

    var _gesture = null;
    var _prev_gesture = null;

    var _touch_start_time = null;
    var _prev_tap_pos = {x: 0, y: 0};
    var _prev_tap_end_time = null;

    var _hold_timer = null;

    var _offset = {};

    // keep track of the mouse status
    var _mousedown = false;

    var _event_start;
    var _event_move;
    var _event_end;

    var _has_touch = ('ontouchstart' in window);


    /**
     * option setter/getter
     * @param   string  key
     * @param   mixed   value
     * @return  mixed   value
     */
    this.option = function(key, val) {
        if(val != undefined) {
            options[key] = val;
        }

        return options[key];
    };


    /**
     * angle to direction define
     * @param  float    angle
     * @return string   direction
     */
    this.getDirectionFromAngle = function( angle )
    {
        var directions = {
            down: angle >= 45 && angle < 135, //90
            left: angle >= 135 || angle <= -135, //180
            up: angle < -45 && angle > -135, //270
            right: angle >= -45 && angle <= 45 //0
        };

        var direction, key;
        for(key in directions){
            if(directions[key]){
                direction = key;
                break;
            }
        }
        return direction;
    };


    /**
     * count the number of fingers in the event
     * when no fingers are detected, one finger is returned (mouse pointer)
     * @param  event
     * @return int  fingers
     */
    function countFingers( event )
    {
        // there is a bug on android (until v4?) that touches is always 1,
        // so no multitouch is supported, e.g. no, zoom and rotation...
        return event.touches ? event.touches.length : 1;
    }


    /**
     * get the x and y positions from the event object
     * @param  event
     * @return array  [{ x: int, y: int }]
     */
    function getXYfromEvent( event )
    {
        event = event || window.event;

        // no touches, use the event pageX and pageY
        if(!_has_touch) {
            var doc = document,
                body = doc.body;

            return [{
                x: event.pageX || event.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && doc.clientLeft || 0 ),
                y: event.pageY || event.clientY + ( doc && doc.scrollTop || body && body.scrollTop || 0 ) - ( doc && doc.clientTop || body && doc.clientTop || 0 )
            }];
        }
        // multitouch, return array with positions
        else {
            var pos = [], src, touches = event.touches.length > 0 ? event.touches : event.changedTouches;
            for(var t=0, len=touches.length; t<len; t++) {
                src = touches[t];
                pos.push({ x: src.pageX, y: src.pageY });
            }
            return pos;
        }
    }


    /**
     * calculate the angle between two points
     * @param   object  pos1 { x: int, y: int }
     * @param   object  pos2 { x: int, y: int }
     */
    function getAngle( pos1, pos2 )
    {
        return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x) * 180 / Math.PI;
    }


    /**
     * calculate the scale size between two fingers
     * @param   object  pos_start
     * @param   object  pos_move
     * @return  float   scale
     */
    function calculateScale(pos_start, pos_move)
    {
        if(pos_start.length == 2 && pos_move.length == 2) {
            var x, y;

            x = pos_start[0].x - pos_start[1].x;
            y = pos_start[0].y - pos_start[1].y;
            var start_distance = Math.sqrt((x*x) + (y*y));

            x = pos_move[0].x - pos_move[1].x;
            y = pos_move[0].y - pos_move[1].y;
            var end_distance = Math.sqrt((x*x) + (y*y));

            return end_distance / start_distance;
        }

        return 0;
    }


    /**
     * calculate the rotation degrees between two fingers
     * @param   object  pos_start
     * @param   object  pos_move
     * @return  float   rotation
     */
    function calculateRotation(pos_start, pos_move)
    {
        if(pos_start.length == 2 && pos_move.length == 2) {
            var x, y;

            x = pos_start[0].x - pos_start[1].x;
            y = pos_start[0].y - pos_start[1].y;
            var start_rotation = Math.atan2(y, x) * 180 / Math.PI;

            x = pos_move[0].x - pos_move[1].x;
            y = pos_move[0].y - pos_move[1].y;
            var end_rotation = Math.atan2(y, x) * 180 / Math.PI;

            return end_rotation - start_rotation;
        }

        return 0;
    }


    /**
     * trigger an event/callback by name with params
     * @param string name
     * @param array  params
     */
    function triggerEvent( eventName, params )
    {
        // return touches object
        params.touches = getXYfromEvent(params.originalEvent);
        params.type = eventName;

        // trigger callback
        if(isFunction(self["on"+ eventName])) {
            self["on"+ eventName].call(self, params);
        }
    }


    /**
     * cancel event
     * @param   object  event
     * @return  void
     */

    function cancelEvent(event)
    {
        event = event || window.event;
        if(event.preventDefault){
            event.preventDefault();
            event.stopPropagation();
        }else{
            event.returnValue = false;
            event.cancelBubble = true;
        }
    }


    /**
     * reset the internal vars to the start values
     */
    function reset()
    {
        _pos = {};
        _first = false;
        _fingers = 0;
        _distance = 0;
        _angle = 0;
        _gesture = null;
    }


    var gestures = {
        // hold gesture
        // fired on touchstart
        hold : function(event)
        {
            // only when one finger is on the screen
            if(options.hold) {
                _gesture = 'hold';
                clearTimeout(_hold_timer);

                _hold_timer = setTimeout(function() {
                    if(_gesture == 'hold') {
                        triggerEvent("hold", {
                            originalEvent   : event,
                            position        : _pos.start
                        });
                    }
                }, options.hold_timeout);
            }
        },

        // swipe gesture
        // fired on touchend
        swipe : function(event)
        {
            if(!_pos.move) {
                return;
            }

            // get the distance we moved
            var _distance_x = _pos.move[0].x - _pos.start[0].x;
            var _distance_y = _pos.move[0].y - _pos.start[0].y;
            _distance = Math.sqrt(_distance_x*_distance_x + _distance_y*_distance_y);

            // compare the kind of gesture by time
            var now = new Date().getTime();
            var touch_time = now - _touch_start_time;

            if(options.swipe && (options.swipe_time > touch_time) && (_distance > options.swipe_min_distance)) {
                // calculate the angle
                _angle = getAngle(_pos.start[0], _pos.move[0]);
                _direction = self.getDirectionFromAngle(_angle);

                _gesture = 'swipe';

                var position = { x: _pos.move[0].x - _offset.left,
                    y: _pos.move[0].y - _offset.top };

                var event_obj = {
                    originalEvent   : event,
                    position        : position,
                    direction       : _direction,
                    distance        : _distance,
                    distanceX       : _distance_x,
                    distanceY       : _distance_y,
                    angle           : _angle
                };

                // normal slide event
                triggerEvent("swipe", event_obj);
            }
        },


        // drag gesture
        // fired on mousemove
        drag : function(event)
        {
            // get the distance we moved
            var _distance_x = _pos.move[0].x - _pos.start[0].x;
            var _distance_y = _pos.move[0].y - _pos.start[0].y;
            _distance = Math.sqrt(_distance_x * _distance_x + _distance_y * _distance_y);

            // drag
            // minimal movement required
            if(options.drag && (_distance > options.drag_min_distance) || _gesture == 'drag') {
                // calculate the angle
                _angle = getAngle(_pos.start[0], _pos.move[0]);
                _direction = self.getDirectionFromAngle(_angle);

                // check the movement and stop if we go in the wrong direction
                var is_vertical = (_direction == 'up' || _direction == 'down');
                if(((is_vertical && !options.drag_vertical) || (!is_vertical && !options.drag_horizontal))
                    && (_distance > options.drag_min_distance)) {
                    return;
                }

                _gesture = 'drag';

                var position = { x: _pos.move[0].x - _offset.left,
                    y: _pos.move[0].y - _offset.top };

                var event_obj = {
                    originalEvent   : event,
                    position        : position,
                    direction       : _direction,
                    distance        : _distance,
                    distanceX       : _distance_x,
                    distanceY       : _distance_y,
                    angle           : _angle
                };

                // on the first time trigger the start event
                if(_first) {
                    triggerEvent("dragstart", event_obj);

                    _first = false;
                }

                // normal slide event
                triggerEvent("drag", event_obj);

                cancelEvent(event);
            }
        },


        // transform gesture
        // fired on touchmove
        transform : function(event)
        {
            if(options.transform) {
                if(countFingers(event) != 2) {
                    return false;
                }

                var rotation = calculateRotation(_pos.start, _pos.move);
                var scale = calculateScale(_pos.start, _pos.move);

                if(_gesture != 'drag' &&
                    (_gesture == 'transform' || Math.abs(1-scale) > options.scale_treshold || Math.abs(rotation) > options.rotation_treshold)) {
                    _gesture = 'transform';

                    _pos.center = {  x: ((_pos.move[0].x + _pos.move[1].x) / 2) - _offset.left,
                        y: ((_pos.move[0].y + _pos.move[1].y) / 2) - _offset.top };

                    var event_obj = {
                        originalEvent   : event,
                        position        : _pos.center,
                        scale           : scale,
                        rotation        : rotation
                    };

                    // on the first time trigger the start event
                    if(_first) {
                        triggerEvent("transformstart", event_obj);
                        _first = false;
                    }

                    triggerEvent("transform", event_obj);

                    cancelEvent(event);

                    return true;
                }
            }

            return false;
        },


        // tap and double tap gesture
        // fired on touchend
        tap : function(event)
        {
            // compare the kind of gesture by time
            var now = new Date().getTime();
            var touch_time = now - _touch_start_time;

            // dont fire when hold is fired
            if(options.hold && !(options.hold && options.hold_timeout > touch_time)) {
                return;
            }

            // when previous event was tap and the tap was max_interval ms ago
            var is_double_tap = (function(){
                if (_prev_tap_pos &&
                    options.tap_double &&
                    _prev_gesture == 'tap' &&
                    (_touch_start_time - _prev_tap_end_time) < options.tap_max_interval)
                {
                    var x_distance = Math.abs(_prev_tap_pos[0].x - _pos.start[0].x);
                    var y_distance = Math.abs(_prev_tap_pos[0].y - _pos.start[0].y);
                    return (_prev_tap_pos && _pos.start && Math.max(x_distance, y_distance) < options.tap_double_distance);
                }
                return false;
            })();

            if(is_double_tap) {
                _gesture = 'double_tap';
                _prev_tap_end_time = null;

                triggerEvent("doubletap", {
                    originalEvent   : event,
                    position        : _pos.start
                });
                cancelEvent(event);
            }

            // single tap is single touch
            else {
                var x_distance = (_pos.move) ? Math.abs(_pos.move[0].x - _pos.start[0].x) : 0;
                var y_distance =  (_pos.move) ? Math.abs(_pos.move[0].y - _pos.start[0].y) : 0;
                _distance = Math.max(x_distance, y_distance);

                if(_distance < options.tap_max_distance) {
                    _gesture = 'tap';
                    _prev_tap_end_time = now;
                    _prev_tap_pos = _pos.start;

                    if(options.tap) {
                        triggerEvent("tap", {
                            originalEvent   : event,
                            position        : _pos.start
                        });
                        cancelEvent(event);
                    }
                }
            }

        }

    };


    function handleEvents(event)
    {
        switch(event.type)
        {
            case 'mousedown':
            case 'touchstart':
                _pos.start = getXYfromEvent(event);
                _touch_start_time = new Date().getTime();
                _fingers = countFingers(event);
                _first = true;
                _event_start = event;

                // borrowed from jquery offset https://github.com/jquery/jquery/blob/master/src/offset.js
                var box = element.getBoundingClientRect();
                var clientTop  = element.clientTop  || document.body.clientTop  || 0;
                var clientLeft = element.clientLeft || document.body.clientLeft || 0;
                var scrollTop  = window.pageYOffset || element.scrollTop  || document.body.scrollTop;
                var scrollLeft = window.pageXOffset || element.scrollLeft || document.body.scrollLeft;

                _offset = {
                    top: box.top + scrollTop - clientTop,
                    left: box.left + scrollLeft - clientLeft
                };

                _mousedown = true;

                // hold gesture
                gestures.hold(event);

                if(options.prevent_default) {
                    cancelEvent(event);
                }
                break;

            case 'mousemove':
            case 'touchmove':
                if(!_mousedown) {
                    return false;
                }
                _event_move = event;
                _pos.move = getXYfromEvent(event);

                if(!gestures.transform(event)) {
                    gestures.drag(event);
                }
                break;

            case 'mouseup':
            case 'mouseout':
            case 'touchcancel':
            case 'touchend':
                if(!_mousedown || (_gesture != 'transform' && event.touches && event.touches.length > 0)) {
                    return false;
                }

                _mousedown = false;
                _event_end = event;
                
                var dragging = _gesture == 'drag';

                // swipe gesture
                gestures.swipe(event);


                // drag gesture
                // dragstart is triggered, so dragend is possible
                if(dragging) {
                    triggerEvent("dragend", {
                        originalEvent   : event,
                        direction       : _direction,
                        distance        : _distance,
                        angle           : _angle
                    });
                }

                // transform
                // transformstart is triggered, so transformed is possible
                else if(_gesture == 'transform') {
                    triggerEvent("transformend", {
                        originalEvent   : event,
                        position        : _pos.center,
                        scale           : calculateScale(_pos.start, _pos.move),
                        rotation        : calculateRotation(_pos.start, _pos.move)
                    });
                }
                else {
                    gestures.tap(_event_start);
                }

                _prev_gesture = _gesture;

                // trigger release event
                triggerEvent("release", {
                    originalEvent   : event,
                    gesture         : _gesture
                });

                // reset vars
                reset();
                break;
        }
    }


    // bind events for touch devices
    // except for windows phone 7.5, it doesnt support touch events..!
    if(_has_touch) {
        addEvent(element, "touchstart touchmove touchend touchcancel", handleEvents);
    }
    // for non-touch
    else {
        addEvent(element, "mouseup mousedown mousemove", handleEvents);
        addEvent(element, "mouseout", function(event) {
            if(!isInsideHammer(element, event.relatedTarget)) {
                handleEvents(event);
            }
        });
    }


    /**
     * find if element is (inside) given parent element
     * @param   object  element
     * @param   object  parent
     * @return  bool    inside
     */
    function isInsideHammer(parent, child) {
        // get related target for IE
        if(!child && window.event && window.event.toElement){
            child = window.event.toElement;
        }

        if(parent === child){
            return true;
        }

        // loop over parentNodes of child until we find hammer element
        if(child){
            var node = child.parentNode;
            while(node !== null){
                if(node === parent){
                    return true;
                };
                node = node.parentNode;
            }
        }
        return false;
    }


    /**
     * merge 2 objects into a new object
     * @param   object  obj1
     * @param   object  obj2
     * @return  object  merged object
     */
    function mergeObject(obj1, obj2) {
        var output = {};

        if(!obj2) {
            return obj1;
        }

        for (var prop in obj1) {
            if (prop in obj2) {
                output[prop] = obj2[prop];
            } else {
                output[prop] = obj1[prop];
            }
        }
        return output;
    }


    /**
     * check if object is a function
     * @param   object  obj
     * @return  bool    is function
     */
    function isFunction( obj ){
        return Object.prototype.toString.call( obj ) == "[object Function]";
    }


    /**
     * attach event
     * @param   node    element
     * @param   string  types
     * @param   object  callback
     */
    function addEvent(element, types, callback) {
        types = types.split(" ");
        for(var t= 0,len=types.length; t<len; t++) {
            if(element.addEventListener){
                element.addEventListener(types[t], callback, false);
            }
            else if(document.attachEvent){
                element.attachEvent("on"+ types[t], callback);
            }
        }
    }
}

/**
 * Atomizer-Software-UI
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 */

/*
 *Notes:
 * open-hover needs to be on the entire div, ie the test-panel-container
 * open-click is added to the tab
 */


/*global $:false, google:false, Panel: true, console: false, Hammer: false */

var ui = {
    //Constants
    OPTIONS_ID:'ui-options',
    UI_ID:'ui',

    initialized : {
        ui : false,
        watch: false,
        touch : false,
        logConsole : false
    },

    //Configuration storage
    config:{
        panelStatePersistence:true,
        panelDisable:true,
        development:false,
        debugPanel:false
    },

    //Browser specific characteristics
    browser:{
        width:null,
        height:null,
        agent:null,
        touchEnable:null
    },

    //Settings specific to the panels
    panelSettings:{
        tabWidth:50,
        paddingStrong:55, //px
        paddingWeak:10 //px
    },


    //Storage arrays
    panels:[], //array to hold panels
    ids:[], //array to hold ids, mostly used as key storage for panels
    valueStore:[], //array to keep all data
    errorLog:[], //array to hold all errors, only for debug/development
    //TODO: wrap the watch arrays into an object
    watchList:[], //array to hold variables to watch
    watchListIdentifiers:[], //hold identifiers for watchList
    watchListLabel: [],

    //Debug
    temp:null, //just used for debug purposes.

    init:function () {
        'use strict';
        //check to see if any arguments were passed for configuration
        //TODO: clean this up, there has to be a better way to do ui.  I could probably get rid of the multiple arguments bit.
        var arg = arguments[0];
        if (arg.panelStatePersistence !== undefined) {
            ui.out.info('Config panelStatePersistence: ' + arg.panelStatePersistence);
            ui.config.panelStatePersistence = arg.panelStatePersistence;
        }
        if (arg.panelDisable !== undefined) {
            ui.out.info('Config panelDisable: ' + arg.panelDisable);
            ui.config.panelDisable = arg.panelDisable;
        }
        if (arg.development !== undefined) {
            ui.out.info('Config development: ' + arg.development);
            ui.config.development = arg.development;
        }
        if (arg.debugPanel !== undefined) {
            ui.out.info('Config debugPanel: ' + arg.development);
            ui.config.debugPanel = arg.debugPanel;
        }

        //for debug only!
        //ui.action.destroyAll();

        ui.setup.browserInfo();

        ui.localStorage.retrieve();

        $(window).load(function () {  //need to wait until everything is loaded before determine sizes
            ui.determinePanelSize();
            ui.modifyPanelSizeClick();
            ui.action.displayTabs();
        });

        //Build out your options to disable tabs
        ui.setup.disablePanelOptionsForm();

        //Start UI monitors
        ui.monitorForms();
        ui.monitorTabs();
        ui.monitorUnload();

        //Setup things
        ui.setup.logConsole(); //if disabled
        //ui.setup.watch();
        //Check for touch
        if ( ui.browser.touchEnable ) {
            ui.out.info('Touch screen enabled device');
            ui.setup.touch();
        } else {
            ui.setup.click();
        }

        /*else {  //this else statement is just for development to practice on desktop that has no touch
         ui.out.debug('I dont have touch but going to start it anyways, im a bus );
         ui.setup.touch();
         } */

        //Init all done
        ui.initialized.ui = true;
        ui.out.info('UI Initialized');

    },

    log : function (message) { //public function for accessing a debug-panel
        'use strict';
        if (ui.setup.debugPanel) {
            if(!ui.initialized.logConsole) {
                ui.out.warn('Log Console not initialized');
                ui.setup.logConsole();
            }
            ui.log.log(message);
        }
    },
    monitorTabs:function () {
        'use strict';
        $('.open-click').click(function () {  //with this test-click and test-hover go on the entire div
            $(this).parent().toggleClass('open');
            ui.action.toggled($(this).parent().attr('id'));
        });
    },
    monitorForms:function () {
        'use strict';
        $('#options-form input:text, textarea').keypress(function () {
            ui.formUpdate();
            //maybe change to boolean, check boolean every x millisecs.
        });
        $('#options-form select, input:radio, input:checkbox').change(function () {
            //ui.formUpdate();
            ui.action.handleCheckboxChange();
        });
    },
    monitorUnload:function () { //opera does not support onbeforeunload
        'use strict';
        window.onbeforeunload = function () {
            ui.out.info('onbeforeunload triggered');
            ui.localStorage.update();
        };
    },

    updateWatchList: function () {
        'use strict';
        //ui.out.debug('updatin');
        for(var key in ui.watchListIdentifiers) {
            if(ui.watchListIdentifiers.hasOwnProperty(key)) {
                var label = ui.watchListLabel[key];
                var identifier = ui.watchListIdentifiers[key];
                var obj = ui.watchList[key];
                $('#'+ label).html(obj[identifier].toString());
                //$('#curX-update').html(robot.currentPosition.x);
            }
        }
    },

    watch: function (label, propertyIdentifier, objectToWatch) {
                                                            //pass watch the object and the property to access
        'use strict';                                      //currently not working in firefox, who know why.
        if(!ui.initialized.watch) {                        //labels must be unique!
            ui.out.warn('Watch not initialized');
            ui.setup.watch();
            //return;
        }
        if (typeof objectToWatch === 'object') {
            if(objectToWatch.hasOwnProperty(propertyIdentifier)) {
                if(ui.watchListLabel.indexOf(label) !== -1) {
                    ui.out.warn('Duplicate Label name on ' + label);
                    //TODO: Account for multiple same labels, add a number to the end or something
                }
                ui.watchListLabel.push(label);
                ui.watchListIdentifiers.push(propertyIdentifier);
                ui.watchList.push(objectToWatch);
                $('#watch').append(
                    '<tr>' +
                        '<td>' + label + '</td>' +   //make the label visible to user
                        '<td id="' + label + '"></td>' +  //make the label the id
                        '</tr>'
                );
            }
        } else {
            ui.out.warn('Unable to watch ' + label + ' ' + propertyIdentifier);
        }
    },

    parseHTML:function () {
        'use strict';
        ui.out.info('Parsing HTML');
        $('#ui div').siblings('.panel-container').each(function () {
            var id = $(this).attr('id');
            ui.out.info(id + ' parsed');
            ui.ids.push(id);
            ui.panels.push(new ui.Panel(id));
        });

        ui.localStorage.update();
    },

    checkHTML:function () { //check for errors in the html, only use in development

    },

    determinePanelProperties:function () {  //determine where the panels are
        'use strict';
        for (var key in ui.ids) {
            if (ui.ids.hasOwnProperty(key)) {
                //check for Location
                if ($('#' + ui.ids[key]).hasClass('left')) {
                    ui.panels[key].location = 'left';
                    ui.panels[key].margin = 'right';
                } else if ($('#' + ui.ids[key]).hasClass('right')) {
                    ui.panels[key].location = 'right';
                    ui.panels[key].margin = 'left';
                } else {
                    //something is wrong
                    ui.out.warn(ui.ids[key] + ' needs a location class');
                }

                //check for open type
                if ($('#' + ui.ids[key] + ' a').hasClass('open-click')) {
                    ui.panels[key].openMethod = 'click';
                } else if ($('#' + ui.ids[key]).hasClass('open-hover')) {
                    ui.panels[key].openMethod = 'hover';
                } else {
                    //something is wrong
                    ui.out.warn(ui.ids[key] + ' needs a open class');
                }

                //check original z index
                var originalZIndex = $('#'+ui.ids[key]).css('z-index');
                if (originalZIndex === null || originalZIndex === undefined) {
                    ui.panels[key].zIndex = 0;
                } else {
                    ui.panels[key].zIndex = originalZIndex;
                }



            }
        }
        ui.localStorage.update();
    },

    determinePanelSize:function () {  //determine what the panel sizes should be based on content
        'use strict';
        for (var key in ui.ids) {
            if (ui.ids.hasOwnProperty(key)) {
                var children, height, width, culHeight, i;

                //set initial widths
                culHeight = 0;
                height = $('#' + ui.ids[key] + ' div.panel-contents').height();
                width = $('#' + ui.ids[key] + ' div.panel-contents').width();

                //ui.out.debug('Initial dims for ' + ui.ids[key] + ' is H' + height + ' X  W' + width);

                children = $('#' + ui.ids[key] + ' div.panel-contents').children();

                for (i = 0; i < children.length; i += 1) {
                    //currently this logic assumes items are stacked vertically, not horizontally
                    //TODO: account for items stacked horizontally, this will be tough
                    if ($(children[i]).width() > width) {
                        width = $(children[i]).width();
                        //ui.out.debug('Changed width on ' + ui.ids[key] + ' to ' + width);
                    }
                    culHeight = $(children[i]).height();
                    //ui.out.debug('Cumulative height on ' + ui.ids[key] + ' is ' + culHeight);
                }

                ui.panels[key].width = width;

                if (culHeight > height) {
                    ui.panels[key].height = culHeight;
                } else {
                    ui.panels[key].height = height;
                }

                ui.out.debug('Dims for ' + ui.ids[key] + ' are H' +
                    ui.panels[key].height + ' X W' +
                    ui.panels[key].width);
            }
        }
        ui.localStorage.update();
    },

    modifyPanelSizeClick:function () {
        'use strict';
        var style;   //string for building style

        style = '<style type="text/css">\n';
        for (var key in ui.ids) {
            if (ui.ids.hasOwnProperty(key)) {
                if (ui.panels[key].openMethod === 'click') {  //if it is a panel that opens by click.

                    //change the width of the panel-container
                    style += '#ui #' + ui.ids[key] + '.panel-container {\n' +
                        'width: ' + (ui.panelSettings.paddingStrong + ui.panelSettings.paddingWeak +
                        ui.panels[key].width + ui.panelSettings.tabWidth) + 'px; }\n';

                    //change tab placement
                    style += '#ui #' + ui.ids[key] + ' .tab.' + ui.panels[key].location + ' {\n' +
                        ui.panels[key].location + ': ' + (ui.panelSettings.paddingStrong + ui.panelSettings.paddingWeak +
                        ui.panels[key].width) + 'px; }\n';

                    //change the panel-width
                    style += '#ui #' + ui.ids[key] + ' .panel {\n' +
                        'width: ' + (ui.panels[key].width) + 'px; }\n';

                    //change margin on panel-container
                    style += '#ui #' + ui.ids[key] + '.panel-container.' +
                    ui.panels[key].location + '.open {\n' +
                    'margin-' + ui.panels[key].margin + ': -' +
                    (ui.panelSettings.paddingStrong + ui.panelSettings.paddingWeak + ui.panels[key].width) + 'px; }\n';
                }
            }
        }
        style += '</style>\n';
        //ui.out.debug('New Style: ' + style); //I don't know why this rarely gets displayed in the panel log console
        ui.out.info('Appending Style ' + style.slice(22, 40) + '...');
        $('head').append(style);
    },

    formUpdate:function () {
        'use strict';
        ui.out.info('updateFormStorage');
    },
    panelPreferences:function () {  //rename? loadPanelPreferences     updatePanels?
        'use strict';
        ui.out.info('panelPreferences');

        for (var key in ui.panels) {
            if (ui.panels.hasOwnProperty(key)) {
                var tempPanel = ui.panels[key];

                //check if disabled
                if (tempPanel.isDisabled) {
                    ui.action.hideTab(tempPanel.id);
                }
                //check if open or closed
                if (tempPanel.isOpen) {
                    ui.action.openTab(tempPanel.id);
                }
            }

        }
    },
    handleError:function () {
        //parse by colon, example error TypeError: Cannot read property 'isDisabled' of undefined
        //maybe do just indexOf('TypeError')
    }

};




/**
 * Atomizer-Software-UI
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 * @fileOverview ui-panel.js
 */

/*global ui:false */


ui.Panel = function (id) {
    'use strict';
    this.id = id;
    this.isOpen = false;
    this.isDisabled = false;
    this.location = null; //either left, right  top, bottom
    this.vertPos = null;
    this.horiPos = null;
    this.height = null;
    this.width = null;
    this.margin = null; //opposite of location, the margin that is manipulated
    this.openMethod = null; //method for opening, either hover or click, possibly more later
    this.zIndex = null;
};

/**
 * Atomizer-Software-UI
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 * @fileOverview ui-out.js
 */

/*global ui:false */


ui.out = {

    level : {
    DEBUG : "DEBUG",
    INFO  : " INFO",
    WARN  : " WARN",
    FATAL : "FATAL"
    },

    object : function (object) { //simple wrapper to output objects to console for debugging
        'use strict';
        console.log(object);
    },

    info : function (message) {
        'use strict';
        ui.out.push(ui.out.level.INFO, message);
    },

    debug : function (message) {
        'use strict';
        ui.out.push(ui.out.level.DEBUG, message);
    },

    warn : function (message) {
        'use strict';
        ui.out.push(ui.out.level.WARN, message);
    },

    fatal : function (message) {
        'use strict';
        ui.out.push(ui.out.level.FATAL, message);
    },
    //internal to ui.out,
    push : function (level, message) {
        'use strict';
        var output = ui.util.currentTime() + ' UI:' + ui.util.string.rpad(level, 5, ' ') + ': ' + message;

        if (ui.config.development === true) {
            console.log(output);
            if(ui.config.debugPanel === true) {
                ui.out.log(output);
            }
        }
    },
    //outputs to debug panel
    log:function (message) {
        'use strict';
        if(document.getElementById('log')) { //make sure it exists
            var className;
            if(message.indexOf(ui.out.level.DEBUG) !== -1) {
                className = ui.out.level.DEBUG.toLowerCase();
            } else if (message.indexOf(ui.out.level.FATAL) !== -1) {
                className = ui.out.level.FATAL.toLowerCase();
            } else if (message.indexOf(ui.out.level.WARN) !== -1) {
                className = ui.out.level.WARN.toLowerCase();
            } else if (message.indexOf(ui.out.level.INFO) !== -1) {
                className = ui.out.level.INFO.toLowerCase();
            }

            $('#log').append(
                '<div class=' + className + '>' + message + '</div>'
            );
            document.getElementById('log').scrollTop = 9999999;
        } else {
            ui.out(message);
        }
    }

    //watch : function ()

};




/**
 * Atomizer-Software-UI
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 * @fileOverview ui-action.js
 */

/*global ui:false */


ui.action = {

    toggled:function (id) {
        'use strict';
        //ui.out.debug(id + ' was toggled');
        var tempPanel;
        tempPanel = ui.panels[ui.ids.indexOf(id)];
        tempPanel.isOpen = !tempPanel.isOpen;

        //ui.updateLocalStorage();  //maybe switch to beforeBrowsercloses or something similar
    },


    closeTab:function (id) {
        'use strict';
        //ui.out.debug('closeTab ' + id);
        $('#' + id).removeClass('open');
        var tempPanel;
        tempPanel = ui.panels[ui.ids.indexOf(id)];
        tempPanel.isOpen = false;
    },

    openTab:function (id) {
        'use strict';
        //ui.out.debug('openTab ' + id);
        $('#' + id).addClass('open');
        var tempPanel;
        tempPanel = ui.panels[ui.ids.indexOf(id)];
        tempPanel.isOpen = true;
    },

    hideTab:function (id) {
        'use strict';
        //ui.out.debug('hideTab ' + id);
        //$('#'+id).addClass('hide');
        $('#' + id).removeClass('show');
        setTimeout(function () {
            $('#' + id).addClass('hide');
        }, 1000);
        var tempPanel;
        tempPanel = ui.panels[ui.ids.indexOf(id)];
        tempPanel.isDisabled = true;
    },

    showTab:function (id) {
        'use strict';
        //ui.out.debug('showTab ' + id);
        //$('#'+id).removeClass('hide');
        $('#' + id).addClass('show');
        setTimeout(function () {
            $('#' + id).removeClass('hide');
        }, 1000); //may want to change this value to the transition time?
        var tempPanel;
        tempPanel = ui.panels[ui.ids.indexOf(id)];
        tempPanel.isDisabled = false;
    },

    displayTabs:function () {
        'use strict';
        try {
            $('#ui div').siblings('.panel-container').each(function () {
                var id = $(this).attr('id');
                //ui.out.debug('Looking for: ' + id);
                if (!ui.panels[ui.ids.indexOf(id)].isDisabled) {
                    $(this).addClass('show');
                } else {
                    $(this).addClass('hide');
                }
            });
        } catch (e) {
            ui.out.warn('Error: ' + e);
            ui.errorLog.push(ui.util.currentTime() + ' Error ' + e);
            ui.action.destroyAll();
            ui.parseHTML();
            ui.init();
        }
    },

    resetZIndexes:function () {
        'use strict';
        for(var key in ui.ids) {
            if(ui.ids.hasOwnProperty(key)) {
                var originalZIndex = ui.panels[key].zIndex;
                var id = ui.ids[key];
                //ui.out.debug('Resetting ' + id + ' to ' + originalZIndex + ' z-index');
                $('#' + id).css('z-index',originalZIndex);
            }
        }
    },

    bringForward:function (id) {
        'use strict';
        ui.out.debug('Bringing ' + id + ' forward');
        $('#' + id).css('z-index', 50);


    },

    handleCheckboxChange:function () {
        'use strict';
        //ui.out('checkBox Changed');
        $('#options-form input:checkbox, name:panel').each(function () {
            var id;
            if ($(this).is(':checked')) {
                id = $(this).attr('value');
                //ui.out(id + ' is checked');
                ui.action.showTab(id);
            } else if (!$(this).is(':checked')) {
                id = $(this).attr('value');
                //ui.out(id + ' is unchecked');
                ui.action.hideTab(id);
            }
        });

    },

    handleTouchEvent: function (event) {
        'use strict';
        /*
         try {
         event.preventDefault();
         } catch (e) {
         ui.out.warn('Error: ' + e);
         }   */

        var element, parentID, panelInQuestion, eventDirection, panelLocation, panelOppositeLocation, eventType;

        eventType = event.type;
        element = event.originalEvent.target;
        if(element === undefined) {
            ui.out.warn('Target on touch event is undefined');
        }

        parentID = $(element).parents('.panel-container').attr('id');
        ui.out.debug('Detected ' + eventType + ' on ' + parentID);

        //DRAG OR SWIPE
        if ( eventType === "drag" || eventType === "swipe") {
            eventDirection = event.direction;
            ui.out.debug(eventType + ' to the ' + eventDirection);

            panelInQuestion = ui.panels[ui.ids.indexOf(parentID)];

            if(panelInQuestion === undefined) {
                ui.out.warn('Panel for touch event not found');
                return;
            }

            panelLocation = panelInQuestion.location;
            panelOppositeLocation = panelInQuestion.margin; //margin contains the opposite of location

            if (panelLocation === eventDirection) {
                ui.out.debug('Closing ' + parentID + ' from ' + eventType + ' ' + eventDirection);
                ui.action.closeTab(parentID);
            } else if (panelOppositeLocation === eventDirection) {
                ui.out.debug('Opening ' + parentID + ' from ' + eventType + ' ' + eventDirection);
                ui.action.openTab(parentID);
            }
            else {
                ui.out.warn('No action on ' + parentID + ' from ' + eventType + ' ' + eventDirection);
                ui.out.warn('Panel location is ' + panelLocation + ' and opposite is ' + panelOppositeLocation);
            }
        } else if (eventType === "tap") {
            ui.action.resetZIndexes();
            ui.action.bringForward(parentID);
        } else {
            //Fall through
            ui.out.warn('Could not find eventType ' + eventType + ' for ' + parentID);
        }
    },

    destroyAll:function () {
        'use strict';
        ui.panels = [];
        ui.ids = [];
        ui.valueStore = [];
        localStorage.removeItem(ui.localStorage._getKey());
        ui.out.warn('BOOOM!!!  UI Reset');
    }

};


/**
 * Atomizer-Software-UI
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 * @fileOverview ui-util.js
 */

/*global ui:false */


ui.util = {

    currentTime:function () {
        'use strict';
        var now = new Date();
        return now.getHours() + ':' + now.getMinutes();
    }

};

ui.util.string = {

    strRepeat:function (str, qty) {
        'use strict';
        if (qty < 1) {
            return '';
        }
        var result = '';
        while (qty > 0) {
            if (qty & 1) {
                result += str;
            }
            qty >>= 1, str += str;
        }
        return result;
    },

    pad:function (str, length, padStr, type) {
        'use strict';
        str += '';

        var padlen = 0;

        length = ~~length;

        if (!padStr) {
            padStr = ' ';
        } else if (padStr.length > 1) {
            padStr = padStr.charAt(0);
        }

        switch (type) {
            case 'right':
                padlen = (length - str.length);
                return str + this.strRepeat(padStr, padlen);
            case 'both':
                padlen = (length - str.length);
                return this.strRepeat(padStr, Math.ceil(padlen / 2)) +
                    str +
                    this.strRepeat(padStr, Math.floor(padlen / 2));
            default: // 'left'
                padlen = (length - str.length);
                return this.strRepeat(padStr, padlen) + str;
        }
    },

    lpad:function (str, length, padStr) {
        'use strict';
        return this.pad(str, length, padStr);
    },

    rpad:function (str, length, padStr) {
        'use strict';
        return this.pad(str, length, padStr, 'right');
    },

    lrpad:function (str, length, padStr) {
        'use strict';
        return this.pad(str, length, padStr, 'both');
    }

};




/**
 * Atomizer-Software-UI
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 * @fileOverview ui-util.js
 */

/*global ui:false $:false Hammer:false */


ui.setup = {
    disablePanelOptionsForm:function () {
        'use strict';
        //add enablers for the different panels
        if (ui.config.panelDisable) {
            for (var key in ui.ids) {
                if (ui.ids.hasOwnProperty(key)) {
                    var id = ui.ids[key];
                    if (id !== ui.OPTIONS_ID) { //we don't want to disable the options tab! wouldn't that be funny!
                        //ui.out('Adding ' + id + ' to form');
                        var tempPanel, checked;
                        tempPanel = ui.panels[ui.ids.indexOf(id)];
                        //ui.out('Panel ' + id + ' isDisabled?: ' + tempPanel.isDisabled);
                        if (!tempPanel.isDisabled) {
                            checked = 'checked';
                        } else {
                            checked = '';
                        }
                        $('#options-form').append(
                            '<input type="checkbox" name="panel" value="' + id + '" ' + checked + ' />  ' +
                                id.charAt(0).toUpperCase() + id.slice(1) + '<br />'
                        );
                    }
                }
            }
        }
    },

    logConsole:function () {  //this currently isn't doing anything?
        'use strict';
        if(!$('#log')) {
            ui.out.warn('HTML ID #log not found');
            ui.setup.debugPanel = false;
            return;
        }

        if(!ui.config.debugPanel) {
            $('#ui #log').css('display', 'none');
        }

        //check to make sure panel is enabled//no don't

        ui.initialized.logConsole = true;
        ui.out.info('Log Console Initialized');
    },

    watch: function () {
        'use strict';
        if(!$('#watch')) {
            ui.out.warn('HTML ID #watch not found');
            return;
        }
        //add header to table
        $('#watch').append('<tr><th>Property</th><th>Value</th></tr>');

        setInterval(function () {
            ui.updateWatchList();
        },150);

        ui.initialized.watch = true;
        ui.out.info('Watch Initialized');
    },

    browserInfo : function () {
        'use strict';
        //get browser data
        ui.browser.width = $(window).width();   //maybe use Window.innerWidth
        ui.browser.height = $(window).height(); //maybe use Window.innerHeight
        ui.browser.agent = navigator.userAgent;
        ui.browser.touchEnable = !!('ontouchstart' in window);
        //ui.browser.touchEnable = !!('ontouchstart' in window);

        ui.out.info('Width: ' + ui.browser.width + ' Height: ' + ui.browser.height);
        ui.out.info('Agent: ' + ui.browser.agent);
        ui.out.info('TouchEnable: ' + ui.browser.touchEnable);

    },

    click : function () {
        'use strict';

        $("#ui .panel-container").click(function () {
            var id = $(this).attr('id');
            //ui.out.debug(id + ' clicked');
            ui.action.resetZIndexes();
            ui.action.bringForward(id);

        });

        ui.out.info('Click Initialized');

    },

    touch : function () {
        'use strict';

        var hammer = new Hammer(document.getElementById('ui')); //, {prevent_default:true});
        // preventing default kills everything except actiona that have callbacks
        hammer.onswipe = function(ev) {
            ui.action.handleTouchEvent(ev);
        };

        hammer.ondrag = function (ev) {
            ui.action.handleTouchEvent(ev);
        };
        hammer.ontap = function(ev) {
            ui.action.handleTouchEvent(ev);
         //ui.out.debug('Just saw a tap');
         //ui.temp = ev;
         // ui.out.object(ev);
         };

        ui.initialized.touch = true;
        ui.out.info('Touch Initialized');
    }
};


/**
 * Atomizer-Software-UI
 * @license Copyright (C) 2012, Atomizer Software
 * http://atomizersoft.net
 *
 * @author Atomizer Software
 * @fileOverview ui-localstorage.js
 */

/*global ui:false */


ui.localStorage = {

    _getKey: function () {
        'use strict';
        return window.location.host + 'uidata';
    },

    retrieve : function () {
        'use strict';
        var uiData;
        try {
            uiData = localStorage.getItem(ui.localStorage._getKey());
        } catch (e) {
            ui.out.warn('Error: ' + e);
            ui.errorLog.push(ui.util.currentTime() + ' Error ' + e);
        }

        if(uiData === null) {
            //ie returns a null for a key in localstorage that has no value,
            // this to me seems correct however different from FF and Chrome
            ui.out.debug('uiData === null');
            ui.parseHTML();
            ui.determinePanelProperties();
        }
        else if ( uiData[3] === ',') {
            //this is for FF and chrome
            ui.out.debug('uiData[3] === ','');
            ui.parseHTML();
            ui.determinePanelProperties();
        } else {
            ui.out.debug('uiData exists');
            ui.localStorage.unpack(uiData);
            ui.panelPreferences();
        }

    },

    _updateValueStorage:function () { //should only be called by updateLocalStorage, contains the work
        'use strict';
        //ui.out.info('Updating valueStorage');
        ui.valueStore[0] = ui.ids;
        ui.valueStore[1] = ui.panels;
        //console.log(ui.valueStore);
    },
    _unpackValueStorage:function () { //should only be called by updateLocalStorage
        'use strict';
        //ui.out.info('Unpacking valueStorage');
        ui.ids = ui.valueStore[0];
        ui.panels = ui.valueStore[1];
        //console.log(ui.valueStore);
    },
    update:function () {
        'use strict';
        ui.out.info('Updating localStorage');
        ui.localStorage._updateValueStorage();

        try {
            localStorage.setItem(ui.localStorage._getKey(), JSON.stringify(ui.valueStore));
        } catch (e) {
            ui.out.warn('Error: ' + e);
        }
    },
    unpack:function (uiData) {
        'use strict';
        //ui.out.object(uiData);
        ui.valueStore = JSON.parse(uiData);
        //ui.out.debug('valueStore: ' + ui.valueStore);

        ui.localStorage._unpackValueStorage();
    }

};

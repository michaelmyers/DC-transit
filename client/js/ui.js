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


/*global $:false, google:false, Panel: true */

var ui = {
    //Constants
    OPTIONS_ID: 'ui-options',
    UI_ID:      'ui',

    //Configuration storage
    config : {
        panelStatePersistence: true,
        panelDisable: true
    },

    //storage arrays
    panels: [], //array to hold panels
    ids: [], //array to hold ids, mostly used as key storage for panels
    valueStore: [], //array to keep all data

    init : function () {
        'use strict';
        //check to see if any arguments were passed for configuration
        //TODO: clean this up, there has to be a better way to do this.
        for (var key in arguments) {
            if (arguments.hasOwnProperty(key)) {
                console.log(arguments[key]);
                var arg = arguments[key];
                //setup
                if(arg.panelStatePersistence !== undefined) {
                    console.log('Config panelStatePersistence: ' + arg.panelStatePersistence);
                    ui.config.panelStatePersistence = arg.panelStatePersistence;
                }
                if(arg.panelDisable !== undefined) {
                    console.log('Config panelDisable: ' + arg.panelDisable);
                    ui.config.panelDisable = arg.panelDisable;
                }
            }
        }

        var userAgent = navigator.userAgent;
        console.log(userAgent);

        //ui.destroyAll();   used for development only

        //this needs to be reworked, want to check if localstorage as a value, if not, parseUI.
        var uiData;
        try {
            uiData = localStorage.getItem('uiData');
        } catch (e) {
            console.log('Error: ' + e);
        }

        if (uiData === null) {
            ui.parseUI();
        } else {
            ui.unpackLocalStorage(uiData);
            ui.panelPreferences();
        }

        ui.setupDisableOptions();

        ui.displayTabs();

        ui.monitorForms();
        ui.monitorTabs();
        ui.monitorUnload();

    },
    toggled : function (id) {
        'use strict';
        //console.log(id + ' was toggled');
        var tempPanel;
        tempPanel = ui.panels[ui.ids.indexOf(id)];
        tempPanel.isOpen = !tempPanel.isOpen;

        //ui.updateLocalStorage();  //maybe switch to beforeBrowsercloses or something similar
    },
    monitorTabs : function () {
        'use strict';
        $('.open-click').click(function () {  //with this test-click and test-hover go on the entire div
            $(this).parent().toggleClass('open');
            ui.toggled($(this).parent().attr('id'));
        });
    },
    monitorForms : function () {
        'use strict';
        $('#options-form input:text, textarea').keypress(function() {
            ui.formUpdate();
            //maybe change to boolean, check boolean every x millisecs.
        });
        $('#options-form select, input:radio, input:checkbox').change(function(){
            //ui.formUpdate();
            ui.checkboxChanged();
        });
    },
    monitorUnload : function () {
        'use strict';
        window.onbeforeunload = function() {
            console.log('onbeforeunload triggered');
            ui.updateLocalStorage();
        };
    },
    openTab : function (id) {
        'use strict';
        //console.log('openTab ' + id);
        $('#'+id).addClass('open');
        var tempPanel;
        tempPanel = ui.panels[ui.ids.indexOf(id)];
        tempPanel.isOpen = true;
    },
    closeTab : function (id) {
        'use strict';
        //console.log('closeTab ' + id);
        $('#'+id).removeClass('open');
        var tempPanel;
        tempPanel = ui.panels[ui.ids.indexOf(id)];
        tempPanel.isOpen = false;
    },
    hideTab : function (id) {
        'use strict';
        //console.log('hideTab ' + id);
        //$('#'+id).addClass('hide');
        $('#'+id).removeClass('show');
        setTimeout(function () {
            $('#'+id).addClass('hide');
        }, 1000);
        var tempPanel;
        tempPanel = ui.panels[ui.ids.indexOf(id)];
        tempPanel.isDisabled = true;
    },
    showTab : function (id) {
        'use strict';
        //console.log('showTab ' + id);
        //$('#'+id).removeClass('hide');
        $('#'+id).addClass('show');
        setTimeout(function () {
            $('#'+id).removeClass('hide');
        }, 1000); //may want to change this value to the transition time?
        var tempPanel;
        tempPanel = ui.panels[ui.ids.indexOf(id)];
        tempPanel.isDisabled = false;
    },
    parseUI : function () {
        'use strict';
        console.log('parsing ui');
        $('#ui div').siblings('.panel-container').each(function () {
            var id = $(this).attr('id');
            ui.ids.push(id);
            ui.panels.push(new Panel(id));
        });

        ui.updateLocalStorage();
    },
    displayTabs : function () {
        'use strict';

        $('#ui div').siblings('.panel-container').each(function () {
            var id = $(this).attr('id');
            //console.log('Looking for: ' + id);
            if (!ui.panels[ui.ids.indexOf(id)].isDisabled){
                $(this).addClass('show');
            } else {
                $(this).addClass('hide');
            }
        });
    },
    setupDisableOptions : function () {
        'use strict';
        //add enablers for the different panels
        if (ui.config.panelDisable) {
            for (var key in ui.ids) {
                if (ui.ids.hasOwnProperty(key)) {
                    var id = ui.ids[key];
                    if (id !== ui.OPTIONS_ID ) { //we don't want to disable the options tab! wouldn't that be funny!
                        //console.log('Adding ' + id + ' to form');
                        var tempPanel, checked;
                        tempPanel = ui.panels[ui.ids.indexOf(id)];
                        //console.log('Panel ' + id + ' isDisabled?: ' + tempPanel.isDisabled);
                        if( !tempPanel.isDisabled) {
                            checked = 'checked';
                        } else {
                            checked = '';
                        }
                        $('#options-form').append(
                            '<input type="checkbox" name="panel" value="' + id + '" ' + checked + ' />  ' +
                                id.charAt(0).toUpperCase() + id.slice(1)  + '<br />'
                        );
                    }
                }
            }
        }
    },
    checkboxChanged : function () {
        'use strict';
        //console.log('checkBox Changed');
        $('#options-form input:checkbox, name:panel').each(function () {
            var id;
            if ($(this).is(':checked')){
                id = $(this).attr('value');
                //console.log(id + ' is checked');
                ui.showTab(id);
            } else if (!$(this).is(':checked')) {
                id = $(this).attr('value');
                //console.log(id + ' is unchecked');
                ui.hideTab(id);
            }
        });

    },
    formUpdate : function () {
        'use strict';
        console.log('updateFormStorage');
    },
    panelPreferences : function () {
        'use strict';
        //console.log('panel preferences!');

        for (var key in ui.panels) {
            if (ui.panels.hasOwnProperty(key)) {
                var tempPanel = ui.panels[key];

                //check if disabled
                if (tempPanel.isDisabled) {
                    ui.hideTab(tempPanel.id);
                }
                //check if open or closed
                if (tempPanel.isOpen) {
                    ui.openTab(tempPanel.id);
                }
            }

        }
    },
    updateValueStorage : function () { //should only be called by updateLocalStorage, contains the work
        'use strict';
        console.log('updating valueStorage');
        ui.valueStore[0] = ui.ids;
        ui.valueStore[1] = ui.panels;
    },
    unpackValueStorage : function () {
        'use strict';
        console.log('unpacking valueStorage');
        ui.ids = ui.valueStore[0];
        ui.panels = ui.valueStore[1];
    },
    updateLocalStorage : function () {
        'use strict';
        console.log('updating localStorage');
        ui.updateValueStorage();

        try {
            localStorage.setItem('uiData',JSON.stringify(ui.valueStore));
        } catch (e) {
            console.log(e);
        }
    },
    unpackLocalStorage : function (uiData) {
        'use strict';
        console.log('uiData: ' + uiData);
        ui.valueStore = JSON.parse(uiData);
        ui.unpackValueStorage();
    },
    destroyAll : function () {
        'use strict';
        ui.panels = [];
        ui.ids = [];
        ui.valueStore = [];
        localStorage.removeItem('uiData');
    }

};



/*
 | Copyright 2015 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/fx",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/on",
    "dojo/query",
    "dojo/dom-class",
    "dojo/i18n!./nls/podi18n",
    "dojo/domReady!"
], function(declare, lang, fx, array, dom, on, query, domClass, i18n) {

    return declare("TabController", null, {
        map: null,
        constructor: function(map) {
            this.map = map;
        },
        initialize: function() {
            var panelTabs = dom.byId("left-tabs").getElementsByTagName("div");
            array.forEach(panelTabs, lang.hitch(this, function(panelTab) {
                on(panelTab, "click", lang.hitch(this, function(event) {
                    var targetElem = (event.currentTarget) ? event.currentTarget : event.srcElement;
                    var panels = dom.byId("left-tabs").children;
                    for (var iPan = 0; iPan < panels.length; ++iPan) {
                        if (panels[iPan].id == targetElem.id) {
                            this.switchPanel(event);
                            break;
                        }
                    }
                }));
                on(panelTab, "keydown", lang.hitch(this, function(event) {
                    this.keyDownPanel(event);
                }));
            }));

            on(dom.byId("close_button"), "click", lang.hitch(this, function(event) {
                this.closePanel(event);
            }));
        },
        // Switches panel to show the clicked tab
        switchPanel: function(event) {

            // Is the utilityPanel closed? If yes then open
            if (domClass.contains(dom.byId("utilityPanel"), "closed-state")) {

                hideTabs();
                fx.animateProperty({
                    node: "utilityPanel",
                    duration: 250,
                    properties: {
                        width: {
                            start: 0,
                            end: 270
                        }
                    },
                    onBegin: function() {
                        domClass.toggle(dom.byId("utilityPanel"), "closed-state");
                        domClass.toggle(dom.byId("left-tabs"), "shadow");
                    },
                    onEnd: function() {
                        domClass.toggle(dom.byId("map"), "wide");
                    }
                }).play();

                displayTab(event);
                this.map.resize();

            } else {

                var targetElem = (event.currentTarget) ? event.currentTarget : event.srcElement;
                var currentTab = query(".selected")[0];
                if (currentTab == targetElem) {
                    this.closePanel(event);
                } else {
                    hideTabs(event);
                    displayTab(event);
                }
            }
        },

        // Closes the current panel
        closePanel: function(event) {

            hideTabs(event);
            fx.animateProperty({
                node: "utilityPanel",
                duration: 250,
                properties: {
                    width: {
                        start: 270,
                        end: 0
                    }
                },
                onBegin: function() {
                    domClass.toggle(dom.byId("map"), "wide");
                },
                onEnd: function() {
                    domClass.toggle(dom.byId("utilityPanel"), "closed-state");
                    domClass.toggle(dom.byId("left-tabs"), "shadow");
                }
            }).play();

            this.map.resize();
        },

        keyDownPanel: function(event) {

            if (event.keyCode == 39) { //right arrow
                this.switchPanel(event);
            } else if (event.keyCode == 37) { //left arrow
                this.closePanel(event);
            }
        }
    });

    // Displays the clicked tab
    function displayTab(event) {

        var targetElem = (event.currentTarget) ? event.currentTarget : event.srcElement;
        var sID = targetElem.id;
        if (domClass.contains(targetElem, "unselected")) {

            targetElem.className = "selected " + sID + "-tab-active";
            var cntnt = dom.byId(sID + "-content");
            if (cntnt != null) {
                cntnt.style.display = "block";
            }
        }
    }

    // Hides all tabs
    function hideTabs() {

        var leftTabs = dom.byId("left-tabs").children;
        array.forEach(leftTabs, function(leftTab) {
            var sID = leftTab.id;
            dom.byId(sID).className = "unselected " + sID + "-tab";
            dom.byId(sID + "-content").style.display = "none";
        });
    }
});
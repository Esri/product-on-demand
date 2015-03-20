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
    "dojo/dom-class",
    "dojo/dom-construct",
    "dijit/Menu",
    "dijit/MenuItem",
    "dijit/MenuSeparator",
    "./ConfigurationManager",
    "./podUtilities"
], function(declare, lang, domClass, domConstruct, Menu, MenuItem, MenuSeparator, cfgManager) {

    var prepared = false;
    var PodMenu = declare("MapContextMenu", null, {

        constructor: function() {},
        create: function(mapid, mapCommandDomain, onItemClick, podMap) {
            if (prepared)
                return this;
            if (mapid == null)
                return null;

            prepared = true;
            this.mapMenu = new Menu({
                id: mapid,
                contextMenuForWindow: false
            });
            domClass.add(this.mapMenu.domNode, "mapMenu");

            var onClickFunc = function(e) {

                var cmd = e.target.parentNode.mapCommand;
                if (cmd === undefined)
                    cmd = e.target.parentNode.parentNode.mapCommand;
                if (cmd === undefined)
                    return;

                if (onItemClick != null)
                    onItemClick(podMap, cmd);
            };

            for (var i = 0; i < mapCommandDomain.length; i++) {

                var command = mapCommandDomain[i];
                if (command.value == "-")
                    continue;

                var mapCommand = command.value;
                var htmImg = "<img class='mapMenuItemImage' id='" + mapid + "_contextMenuItem_" + command.value + "' src='" + command.image + "' >  " + command.displayName + "</img>";
                var menuItem = new MenuItem({
                    label: htmImg,
                    onClick: onClickFunc
                });
                menuItem.domNode.mapCommand = mapCommand;
                this.mapMenu.addChild(menuItem);
            }

            this.mapMenu.startup();
            this.mapMenu.bindDomNode(podMap.map.container);
            this.adjustToProduct();
            return this;
        },

        adjustToProduct: function(product) {

            // Turn off visibility and remove delimiters
            var nodeContainer = this.mapMenu.containerNode;
            var itm;
            for (var i = nodeContainer.childNodes.length - 1; i >= 0; --i) {

                itm = nodeContainer.childNodes[i];
                if (itm.className == "dijitMenuSeparator") {
                    nodeContainer.removeChild(itm);
                } else if (itm.style != null) {
                    itm.style.display = "none";
                }
            }

            // Set item visibility
            var visibleItems = 0;
            var filter;
            if (product == null) {
                filter = cfgManager.getBaseTableProperties("mapCommandContextMenu", "filter");
            } else {
                var menuAttr = product.getAttribute("mapCommandContextMenu");
                if (menuAttr == null)
                    return;

                filter = menuAttr.filter;
            }

            for (var j in nodeContainer.childNodes) {

                itm = nodeContainer.childNodes[j];
                if (itm.mapCommand == null)
                    continue;

                for (var f in filter) {

                    if (filter[f] != itm.mapCommand)
                        continue;

                    itm.style.display = "block";
                    visibleItems++;
                    break;
                }
            }

            var lastItem;
            for (var iCom in filter) {

                for (var k in nodeContainer.childNodes) {
                    itm = nodeContainer.childNodes[k];

                    if (filter[iCom] != itm.mapCommand)
                        continue;

                    if (lastItem) {
                        domConstruct.place(itm, lastItem, "after");
                    }
                    lastItem = itm;
                    break;
                }
            }

            // Insert delimiters
            var delPositions = [];
            for (var fd = filter.length - 1; fd >= 0; --fd) {
                if (filter[fd] != "-")
                    continue;

                delPositions.push(fd);
            }
            var del = delPositions.length;
            for (var d in delPositions)
                delPositions[d] -= del--;

            var lim = nodeContainer.childNodes.length - 1;
            for (var jd = lim; jd >= 0; --jd) {

                itm = nodeContainer.childNodes[jd];
                if (itm.mapCommand == null)
                    continue;

                if (itm.style.display == "block") {
                    visibleItems--;
                    for (var dp in delPositions) {
                        if (visibleItems == delPositions[dp]) {
                            var ms = new MenuSeparator();
                            ms.placeAt(itm, "after");
                        }
                    }
                }

                if (filter[fd] != itm.mapCommand)
                    continue;
            }
        },

        adjustToCommand: function(command) {
            var nodeContainer = this.mapMenu.containerNode;

            for (var j in nodeContainer.childNodes) {
                var itm = nodeContainer.childNodes[j];
                if (itm.mapCommand == null)
                    continue;

                itm.style.fontWeight = itm.mapCommand == command ? "bold" : "normal";
            }
        }

    });

    return new PodMenu();
});
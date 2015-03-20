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
    "dojo/string",
    "dojo/dom",
    "dojo/on",
    "dojo/i18n!./nls/podi18n",
    "dojox/grid/DataGrid",
    "dojo/data/ItemFileWriteStore",
    "dijit/popup",
    "dijit/TooltipDialog"
], function(declare, lang, string, dom, on, i18n, DataGrid, ItemFileWriteStore, popup, TooltipDialog) {

    return declare("PodLayerList", null, {
        isGridVisible: false,
        podLayerGrid: null,
        currentProduct: null,
        container: null,
        onDynamicLayerChanged: null,
        onBaseLayerChanged: null,
        constructor: function(id, containerId, podLayerList) {
            this.container = dom.byId(containerId);
            this.podLayerList = podLayerList;
            this.createPopupLayersDialog(id, podLayerList);
        },

        setProduct: function(product) {
            this.currentProduct = product;

        },

        createPopupLayersDialog: function(id, podLayerList) {

            var pLDiv = document.createElement("div");
            this.blanket = document.createElement("div");
            this.podLayerListDlg = new TooltipDialog({

                id: id,
                "class": "PodLayerList",
                onMouseLeave: lang.hitch(this, function() {

                    this.closeTimeoutHandle = setTimeout(lang.hitch(this, function() {

                        popup.close(this.podLayerListDlg);
                        this.isGridVisible = false;
                    }), 1500);
                }),
                onMouseOver: lang.hitch(this, function() {

                    clearTimeout(this.closeTimeoutHandle);
                })
            });

            this.podLayerListDlg.attr("content", pLDiv);
            this.podLayerListDlg._firstFocusItem = pLDiv;

            var gridData = {
                identifier: "id",
                items: []
            };

            var layerIds = Object.keys(podLayerList);
            for (var i = 0; i < layerIds.length; i++) {
                var name = podLayerList[layerIds[i]].name;
                gridData.items.push({
                    id: i,
                    colName: name,
                    colView: false
                });
            }

            var gridStore = new ItemFileWriteStore({
                data: gridData
            });

            var formatter = this.gridCheckboxFormatter;
            var gridStructure = [
                [{
                    name: "Service",
                    field: "colName",
                    width: "200px"
                }, {
                    name: "View",
                    field: "colView",
                    width: "40px",
                    formatter: lang.hitch(this, formatter)
                }]
            ];

            this.podLayerGrid = new DataGrid({
                id: "popupLayersListDataGrid",
                store: gridStore,
                autoWidth: "false",
                structure: gridStructure,
                selectionMode: "none"
            });

            var gridHeight = 40 + 27 * layerIds.length;
            if (gridHeight > 450) {
                gridHeight = 450;
            }

            this.podLayerGrid.attr("height", gridHeight.toString() + "px");
            this.podLayerGrid.canSort = lang.hitch(this, function() {
                return false;
            });
            this.podLayerGrid.placeAt(pLDiv);


            on(gridStore, "Set", lang.hitch(this, this.onSet));
            this.podLayerGrid.startup();
        },

        gridCheckboxFormatter: function(val, idx) {

            var title = "";
            var tagDisabled = "";
            var product = this.currentProduct;
            var tagChecked = (val) ? " checked=\"checked\"" : "";

            if (product === null) {
                title = i18n.podLayerList.defaultTitle;
            } else if (!product.getAttributeValue("layersOverride")) {
                title = i18n.podLayerList.restrictTitle;
            }
            if (product !== null && title === "") {

                var layer = this.podLayerList[this.podLayerGrid.getItem(idx).colName[0]];

                if (!layer.isDynamic && product.getAttributeValue("basemapLayer") == layer.name) {
                    title = string.substitute(i18n.podLayerList.basemapUncheckTitle, {
                        layerName: layer.name
                    });
                }
                if (layer.isDynamic && product.getAttributeValue("extentLayer") == layer.name) {
                    title = string.substitute(i18n.podLayerList.layerUncheckTitle, {
                        layerName: layer.name
                    });
                }
            }

            if (title !== "") {

                title = " title=\"" + title + "\"";
                tagDisabled = " disabled=\"disabled\"";
            }

            gridCheckboxClick = lang.hitch(this, function(idx) {

                console.log("Click");

                var item = this.podLayerGrid.getItem(idx);
                var isChecked = this.podLayerGrid.store.getValue(item, "colView");
                this.podLayerGrid.store.setValue(item, "colView", !isChecked);
                console.log("Click confirmed:" + !isChecked);
            });

            var s = "<input id = \"podLayerList_cb" + idx + "\" type=\"checkbox\"" + tagChecked + tagDisabled + title + " onClick=gridCheckboxClick(" + idx + ")  />";
            return s;
        },

        updatePodLayerList: function(podLayerList) {

            this.podLayerList = podLayerList;

            this.isSuppressSync = true;
            var keys = Object.keys(this.podLayerList);
            for (var i = 0; i < keys.length; i++) {
                var itemToSync = this.podLayerGrid.getItem(i);
                var isOnMap = this.podLayerList[keys[i]].isOnMap;
                this.podLayerGrid.store.setValue(itemToSync, "colView", isOnMap);
            }

            console.log("Syncing layers state with grid done.");
            this.isSuppressSync = false;
            this.podLayerGrid.render();
        },

        onSet: function(item, attribute, oldValue, newValue) {

            if (this.isSuppressSync) {
                return;
            }

            if (this.currentProduct === null) {

                alert(i18n.podLayerList.visibilityChange);
                return;
            }

            if (oldValue == newValue) {

                alert(string.substitute(i18n.podLayerList.noValueChange, {
                    newValue: newValue
                }));
                return;
            }

            var layer = this.podLayerList[item.colName[0]];
            if (layer.isDynamic) {

                if (this.onDynamicLayerChanged !== null && this.currentProduct.getAttributeValue("extentLayer") != layer.name) {

                    console.log("PodLayerList.onSet(" + layer.name + "): setting layer " + ((item.colView[0]) ? "on" : "off"));
                    this.onDynamicLayerChanged(layer.name, item.colView[0]);
                } else {
                    item.colView[0] = false;
                }
            } else { // isBasemap

                if (this.onBaseLayerChanged !== null && this.currentProduct.getAttributeValue("basemapLayer") != layer.name) {
                    this.onBaseLayerChanged(layer.name);
                } else {
                    item.colView[0] = false;
                }
            }
        },

        togglePopup: function() {

            if (this.isGridVisible) {

                popup.close(this.podLayerListDlg);
                this.isGridVisible = false;
                return;
            }

            this.isGridVisible = true;
            clearTimeout(this.closeTimeoutHandle);
            popup.open({
                popup: this.podLayerListDlg,
                x: this.container.offsetLeft + this.container.offsetWidth / 2,
                y: this.container.offsetTop
            });
            this.podLayerGrid.render();
        },

        enable: function(value) {
            if (value == null) {
                value = true;
            }

            if (value === false) {
                this.enableState = [];
            }

            for (var idx = 0; idx < this.podLayerGrid.rowCount; ++idx) {
                var item = this.podLayerGrid.getItem(idx);
                if (value === false) {
                    this.enableState[idx] = item.colView[0];
                }
                var tag = dom.byId("podLayerList_cb" + idx.toString());
                if (tag != null) {
                    if (value === false) {
                        tag.setAttribute("disabled", "disabled", 1);
                    } else {
                        tag.setAttribute("disabled", "", 1);
                    }
                }
            }

            console.log("Layers list has been " + ((value) ? "enabled" : "disabled"));
        }
    });
});
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
    "dojo/_base/window",
    "dojo/dom",
    "dojo/string",
    "dojo/on",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/i18n!./nls/podi18n",
    "esri/map",
    "esri/dijit/BasemapGallery",
    "esri/dijit/BasemapLayer",
    "esri/dijit/Basemap",
    "esri/layers/OpenStreetMapLayer",
    "esri/geometry",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/toolbars/draw",
    "esri/toolbars/edit",
    "esri/toolbars/navigation",
    "./ConfigurationManager",
    "./PodLayerList",
    "./CoordsInformer",
    "dojo/domReady!"
], function(declare, lang, win, dom, string, on, domStyle, domConstruct, i18n,
    EsriMap, EsriBasemapGallery, EsriBasemapLayer, EsriBasemap, OpenStreetMapLayer, Geometry, ArcGISDynamicMapServiceLayer,
    ToolbarDraw, ToolbarEdit, ToolbarNavigation, cfgManager, LayerListDlg, CoordInfo) {

    return declare("PodMap", null, {
        currentProduct: null,
        layerList: [],
        isWaitingForMapUpdateEnd: false,
        basemapGallery: null,
        defaultBasemapLayer: null,
        pendingLayerLoadOps: 0,
        layersToRemove: [],
        currentCoordinates: null,
        selectionTooltip: null,
        map: null,
        onClick: null,
        constructor: function(mapNode) {

            this.map = new EsriMap(mapNode, {
                extent: Geometry.Extent(cfgManager.getBaseTableProperties("mapExtent", "value")),
                sliderStyle: "small"
            });

            this.defaultBasemapLayer = cfgManager.getApplicationSetting("defaultBasemapLayer");
            var d, i;
            var extentLayerDomains = cfgManager.getTableProperties("extentLayer", "domain");
            for (d = 0; d < extentLayerDomains.length; d++) {

                var extentLayerDomain = cfgManager.getTable(extentLayerDomains[d]);
                for (i = 0; i < extentLayerDomain.length; i++) {
                    this.layerList[extentLayerDomain[i].value] = {
                        oidField: (extentLayerDomain[i].oidField == null) ? "OBJECTID" : extentLayerDomain[i].oidField,
                        name: extentLayerDomain[i].value,
                        url: extentLayerDomain[i].url,
                        isLoading: false,
                        isOnMap: false,
                        isDynamic: true,
                        sublayer: (typeof extentLayerDomain[i].sublayer == "undefined") ? 0 : extentLayerDomain[i].sublayer
                    };
                }
            }

            var basemapLayerDomains = cfgManager.getTableProperties("basemapLayer", "domain");
            for (d = 0; d < basemapLayerDomains.length; d++) {

                var basemapLayerDomain = cfgManager.getTable(basemapLayerDomains[d]);
                for (i = 0; i < basemapLayerDomain.length; i++) {
                    this.layerList[basemapLayerDomain[i].value] = {
                        oidField: (basemapLayerDomain[i].oidField == null) ? "OBJECTID" : basemapLayerDomain[i].oidField,
                        name: basemapLayerDomain[i].value,
                        url: basemapLayerDomain[i].url,
                        isOnMap: false,
                        isDynamic: false
                    };
                }
            }

            this.currentCoordinates = new CoordInfo({
                map: this.map
            });
            this.podLayerList = new LayerListDlg("mslist", this.map.id, this.layerList);
            this.podLayerList.onBaseLayerChanged = lang.hitch(this, function(baseLayerName) {
                if (this.currentProduct === null) {
                    return;
                }

                var oldBaselayerName = this.currentProduct.getAttributeValue("basemapLayer");
                this.currentProduct.setAttributeValue("basemapLayer", baseLayerName);
                this.resetBasemapLayer(oldBaselayerName, baseLayerName);
            });
            this.podLayerList.onDynamicLayerChanged = lang.hitch(this, function(layerName, isToBeOnMap) {
                if (this.currentProduct === null) {
                    return;
                }

                var layer = this.layerList[layerName];
                if (layer.isOnMap && !isToBeOnMap) {
                    this.removeExtentLayer(layerName);
                } else if (!layer.isOnMap && isToBeOnMap) {
                    this.addExtentLayer(layerName);
                }
            });

            this.createBasemapGallery();

            on(dom.byId("mapServicesLink"), "click", lang.hitch(this.podLayerList, this.togglePopupPodLayerList));

            this.map.on("update-start", lang.hitch(this, this.onUpdateStart));
            this.map.on("update-end", lang.hitch(this, this.onUpdateEnd));
            this.map.on("mouse-move", lang.hitch(this, this.onMouseMove));
            this.map.on("mouse-out", lang.hitch(this, this.onMouseOut));
            this.map.on("load", lang.hitch(this, this.onLoad));

            console.log("PodMap object created");

        },

        getPodLayer: function(layerName) {

            return this.layerList[layerName];
        },

        removeExtentLayer: function(layerName) {

            var mapLayer = this.map.getLayer(layerName);
            if (mapLayer === undefined) {
                return;
            }

            var layer = this.getPodLayer(layerName);
            if (layer.isLoading) {

                console.log("removeExtentLayer(" + layerName + "): layer loading cancelled");
                layer.isLoading = false;
            } else if (mapLayer === undefined) {
                console.log("Layer (" + layerName + ") to be removed has not been found on map.");
            } else if (this.isWaitingForMapUpdateEnd) {
                this.layersToRemove.push(layerName);
            } else {

                this.map.removeLayer(mapLayer);
                layer.isOnMap = false;
                console.log("removeExtentLayer(" + layerName + "): layer removed from map");
            }
        },

        createBasemapGallery: function () {

            // Create a list of basemaps to display (from config file)
            var slKeys = Object.keys(this.layerList);

            var basemaps = [];
            for (var i = 0; i < slKeys.length; i++) {

                var layer = this.layerList[slKeys[i]];
                if (layer.isDynamic) {
                    continue;
                }

                // Each basemap may have more than one URL
                var baseLayers = [];
                var urls = layer.url.split(",");
                for (var j = 0; j < urls.length; j++)
                    if (layer.name != "OpenStreetMap") {
                        if (j == urls.length - 1)
                            baseLayers.push(new EsriBasemapLayer({
                                url: urls[j],
                                isReference: true
                            }));
                        else
                            baseLayers.push(new EsriBasemapLayer({
                                url: urls[j]
                            }));
                    }
                    else {
                        baseLayers.push(new EsriBasemapLayer({
                            type: "OpenStreetMap"
                        }));
                    }

                var basemap = new EsriBasemap({
                    layers: baseLayers,
                    id: layer.name,
                    title: layer.name
                });

                basemaps.push(basemap);
            }

            this.basemapGallery = new EsriBasemapGallery({
                showArcGISBasemaps: false,
                basemaps: basemaps,
                map: this.map
            });

        },

        addExtentLayer: function(layerName) {
            if (layerName == null) {
                return;
            }

            var layer = this.getPodLayer(layerName);
            if (layer == null) {
                return;
            }

            if (this.isLayerOnMap(layerName)) {

                if (layer.isLoading) {
                    alert(string.substitute(i18n.podMap.layerLoading, {
                        layerName: layerName
                    }));
                } else {
                    console.log("Layer (" + layerName + ") loading on map resumed.");
                }
                layer.isLoading = true;
                return;
            }

            if (layer.isLoading) {
                alert(string.substitute(i18n.podMap.layerNotInMap, {
                    layerName: layerName
                }));
            } else {
                console.log("addExtentLayer(" + layerName + ") loading on map initiated.");
            }

            var mapLayer = new ArcGISDynamicMapServiceLayer(layer.url, {
                "id": layer.name,
                "opacity": 0.5
            });

            var visible = [];
            layer.isLoading = true;
            visible.push(layer.sublayer);
            mapLayer.setVisibleLayers(visible);
            this.map.addLayer(mapLayer);
            layer.isOnMap = true;
            this.pendingLayerLoadOps++;

            mapLayer.on("load", lang.hitch(this, this.addExtentLayerOK));

            mapLayer.on("error", lang.hitch({
                podMap: this,
                layerName: layerName
            }, this.addExtentLayerCancel));
            if (mapLayer.loaded) {
                mapLayer.emit("load", {
                    "layer": mapLayer
                });
            }
        },

        addExtentLayerCancel: function(evt) {
            console.log("Layer '" + this.layerName + "' load error: " + evt.error.description);
            this.podMap.getPodLayer(this.layerName).isLoading = false;
            this.podMap.pendingLayerLoadOps--;
        },

        addExtentLayerOK: function(evt) {

            console.log("Layer (" + evt.layer.id + ") loaded");
            var layer = this.getPodLayer(evt.layer.id);

            this.pendingLayerLoadOps--;
            if (layer.isLoading) {
                layer.isLoading = false;
                var par = {
                    map: this.map,
                    layer: evt.layer.id,
                    name: layer.name,
                    position: this.map.layerIds.length + 1
                };
                setTimeout(lang.hitch(par, function() {
                    if (this.map !== null)
                        this.map.reorderLayer(this.layer, this.position);

                    console.log("addExtentLayerOK(): pulling up layer (" + this.name + ")");
                }), 10);
            } else {
                setTimeout(lang.hitch(this, function() {
                    this.removeExtentLayer(evt.layer.id);
                }, 50));
            }
        },

        resetBasemapLayer: function (oldLayerName, newLayerName) {
            if (oldLayerName == null || oldLayerName === "") {
                oldLayerName = this.defaultBasemapLayer;
            }
            if (newLayerName === null || newLayerName === "") {
                newLayerName = this.defaultBasemapLayer;
            }

            var oldlayer = this.layerList[oldLayerName];
            oldlayer.isOnMap = false;
            this.layerList[newLayerName].isOnMap = true;

            this.basemapGallery.select(newLayerName);

            //console.log("resetBasemapLayer(" + newLayerName + ") overrides the layer: " + oldLayerName);
            //this.map.setBasemap(newLayerName);
        },

        isLayerOnMap: function(layerName, product) {
            if (layerName == null) {
                return false;
            }

            var layer = this.getPodLayer(layerName);
            if (layer == null) {
                return false;
            }

            var isOnMap = false;
            if (layer.isDynamic) {

                var mapLayer = this.map.getLayer(layerName);
                if (mapLayer !== undefined) {

                    isOnMap = true;
                    if (!mapLayer.visible) {
                        alert(string.substitute(i18n.podMap.layerNotVisible, {
                            layerName: layerName
                        }));
                    }
                }

                if (product != null) {

                    var extentLayer = product.getAttributeValue("extentLayer");
                    if (product.type == "Fixed" && extentLayer == layerName && !isOnMap) {
                        alert(string.substitute(i18n.podMap.layerNonVisible, {
                            layerName: layerName
                        }));
                    }
                }
            } else if (this.basemapGallery !== null) {

                var basemap = this.basemapGallery.getSelected();
                isOnMap = (layerName == basemap.id);

                if (this.currentProduct !== null) {

                    var bmLayer = this.currentProduct.getAttributeValue("basemapLayer");
                    if (bmLayer != basemap.id && (layerName == bmLayer || layerName == basemap.id)) {
                        alert(string.substitute(i18n.podMap.layerNotMatch, {
                            basemapID: basemap.id,
                            layerID: bmLayer
                        }));
                    }
                }
            }

            return isOnMap;
        },

        reorderLayers: function() {

            var slKeySet = Object.keys(this.layerList);
            for (var i = 0; i < slKeySet.length; i++) {
                var layer = this.layerList[slKeySet[i]];
                if (!layer.isDynamic) {
                    continue;
                }
                var mapLayer = this.map.getLayer(layer.name);
                if (mapLayer === undefined || !layer.isOnMap) {
                    continue;
                }

                this.map.reorderLayer(layer.name, this.map.layerIds.length + 1);
                console.log("reorderLayers(): pulling up layer (" + layer.name + ")");
                if (!mapLayer.visible) {
                    alert(string.substitute(i18n.podMap.layerNotVisible, {
                        layerName: mapLayer.id
                    }));
                }
            }

            if (this.pendingLayerLoadOps !== 0 && !this.isWaitingForMapUpdateEnd) {
                console.log(this.pendingLayerLoadOps + " dynamic " + ((this.pendingLayerLoadOps == 1) ? "layer is" : "layers are") + " loading");
            }

        },

        adjustToProduct: function(selectedProduct) {
            var product = this.currentProduct;
            if (product == selectedProduct) {
                return;
            }

            this.currentProduct = selectedProduct;

            var selectedProduct_extentLayer;
            var selectedProduct_basemapLayer;
            if (selectedProduct !== null) {
                selectedProduct_extentLayer = selectedProduct.getAttributeValue("extentLayer");
                selectedProduct_basemapLayer = selectedProduct.getAttributeValue("basemapLayer");
            } else {
                selectedProduct_basemapLayer = this.defaultBasemapLayer;
            }
            var product_extentLayer;
            var product_basemapLayer;
            if (product !== null) {
                product_extentLayer = product.getAttributeValue("extentLayer");
                product_basemapLayer = product.getAttributeValue("basemapLayer");
            }

            console.log("Product Change Sequence Started");
            if (selectedProduct_basemapLayer != product_basemapLayer) {
                this.resetBasemapLayer(product_basemapLayer, selectedProduct_basemapLayer);
            }

            if (product_extentLayer != selectedProduct_extentLayer) {
                this.removeExtentLayer(product_extentLayer);
                this.addExtentLayer(selectedProduct_extentLayer);
            }

            this.podLayerList.setProduct(selectedProduct);
        },

        onLoad: function() {
            this.isWaitingForMapUpdateEnd = false;
            this.resetBasemapLayer(null, (this.currentProduct === null) ? null : this.currentProduct.getAttributeValue("basemapLayer"));
            this.map.on("click", lang.hitch(this, function(event) {
                if (this.onClick !== null)
                    this.onClick(event);
            }));

        },

        onUpdateStart: function() {
            var node = dom.byId("ProductFactoryDialog");
            if (node != null) {
                domStyle.set(node, "cursor", "wait");
            }
            this.isWaitingForMapUpdateEnd = true;
            this.podLayerList.enable(false);
            if (this.currentProduct !== null)
                this.currentProduct.blocked = true;

            console.log("Map Update Start event");
            this.map.setMapCursor("wait");
        },

        onUpdateEnd: function() {

            var cursor = SelectionTool.selectCursor;
            if (this.currentToolbar) {
                cursor = "url(images/cross.cur),auto";
            }

            this.map.setMapCursor(cursor);

            if (this.currentProduct !== null)
                this.currentProduct.blocked = false;

            var node = dom.byId("ProductFactoryDialog");
            if (node != null) {
                domStyle.set(node, "cursor", "auto");
            }
            this.isWaitingForMapUpdateEnd = false;
            this.podLayerList.enable();

            for (var i = this.layersToRemove.length; i--;) {
                setTimeout(lang.hitch(this, function() {
                    this.removeExtentLayer(this.layersToRemove.pop());
                }), 50);
            }

            this.reorderLayers();
            this.podLayerList.updatePodLayerList(this.layerList);

            if (this.currentToolbar) {
                this.curentToolbar.activate();
            }
            if (this.onMapUpdated) {
                this.onMapUpdated();
            }
            this.runEventHandlers("update-end");
            console.log("Map Update End event");
        },

        // Update the tooltip as the mouse moves over the map
        onMouseMove: function(evt) {

            var px, py;
            if (evt.clientX || evt.pageY) {
                px = evt.clientX;
                py = evt.clientY;
            } else {
                px = evt.clientX + win.body().scrollLeft - win.body().clientLeft;
                py = evt.clientY + win.body().scrollTop - win.body().clientTop;
            }


            this.setTooltipPosition(px, py);
            this.currentCoordinates.update(evt.mapPoint);
            this.runEventHandlers("mouse-move", evt);
        },

        // Hide the tooltip if the cursor isn't over the map
        onMouseOut: function() {

            this.hideTooltip();
            this.currentCoordinates.hide();
        },

        onExtentChange: function() {

            this.currentCoordinates.hide();
        },

        onPanEnd: function() {

            this.currentCoordinates.hide();
        },

        setMapTooltip: function(txt, display) {

            if (this.selectionTooltip === null) {
                this.selectionTooltip = domConstruct.create("div", {
                    "class": "selectionTooltip",
                    "innerHTML": ""
                }, this.map.container);
            }

            if (txt != null) {
                this.selectionTooltip.innerHTML = txt;
            }

            if (PodUtilities.trim(this.selectionTooltip.innerHTML) === "") {
                display = false;
            }

            this.selectionTooltip.show = (display == null || display) ? "block" : "none";
        },

        hideTooltip: function() {

            if (this.selectionTooltip !== null) {
                this.selectionTooltip.style.display = "none";
            }
        },

        setTooltipPosition: function(px, py) {

            if (this.selectionTooltip === null || this.selectionTooltip.show == "none") {
                return;
            }
            domStyle.set(this.selectionTooltip, {
                left: (px + 15) + "px",
                top: (py) + "px",
                display: this.selectionTooltip.show
            });
        },

        togglePopupPodLayerList: function() {
            this.togglePopup();
        },

        getExtent: function() {
            return this.map.extent;
        },

        removeGraphic: function(graphic) {
            this.map.graphics.remove(graphic);
        },

        addGraphic: function(graphic) {
            this.map.graphics.add(graphic);
        },

        createDrawToolbar: function(showToolTips) {
            this.curentToolbar = new ToolbarDraw(this.map, {
                showTooltips: showToolTips
            });
            return this.curentToolbar;
        },

        createEditToolbar: function() {
            this.curentToolbar = new ToolbarEdit(this.map);
            return this.curentToolbar;
        },

        createNavigationToolbar: function() {
            this.curentToolbar = new ToolbarNavigation(this.map);
            return this.curentToolbar;
        },

        setMapCursor: function(url) {
            this.map.setMapCursor(url);
        },

        resize: function() {
            this.map.resize();
        },

        setExtent: function(ext, mode) {
            this.map.setExtent(ext, mode);
        },

        centerAt: function(cp) {
            this.map.centerAt(cp);
        },

        setEvent: function(event, handler) {
            if (!this.eventHandlers) {
                this.eventHandlers = [];
            }

            this.eventHandlers.push({
                event: event,
                handler: handler
            });
        },

        runEventHandlers: function(eventName, event) {
            if (!this.eventHandlers) {
                return;
            }

            for (var ev in this.eventHandlers) {
                var evObj = this.eventHandlers[ev];
                if (evObj.event != eventName) {
                    continue;
                }

                evObj.handler(event);
            }
        }
    });
});
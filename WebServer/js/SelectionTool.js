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
        "dojo/_base/array",
        "dojo/_base/connect",
        "dojo/when",
        "dojo/Deferred",
        "dojo/dom",
        "dojo/dom-construct",
        "dojo/dom-style",
        "dojo/on",
        "dojo/i18n!./nls/podi18n",
        "dijit/registry",
        "dijit/TooltipDialog",
        "dijit/form/Button",
        "dijit/popup",
        "esri/request",
        "esri/graphic",
        "esri/Color",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/toolbars/draw",
        "esri/toolbars/navigation",
        "esri/geometry",
        "esri/geometry/Point",
        "esri/geometry/Polyline",
        "esri/geometry/Polygon",
        "esri/SpatialReference",
        "esri/tasks/FeatureSet",
        "esri/tasks/Geoprocessor",
        "esri/tasks/query",
        "esri/tasks/QueryTask",
        "esri/tasks/ProjectParameters",
        "esri/tasks/AreasAndLengthsParameters",
        "esri/tasks/BufferParameters",
        "esri/tasks/GeometryService",
        "./Toolbox",
        "./MapContextMenu",
        "./ConfigurationManager",
        "./Product/ImagePreview",
        "./podUtilities",
        "./Product/ProductFactory",
        "./Product/ProductPageExtent"
    ],
    function(
        declare, lang, string, array, Connect, when, Deferred, dom, domConstruct, domStyle, on, i18n,
        registry, TooltipDialog, Button, Popup, esriRequest, Graphic, Color,
        SimpleFillSymbol, SimpleLineSymbol, toolbarDraw, toolbarNavigation,
        Geometry, Point, Polyline, Polygon, SpatialReference,
        FeatureSet, Geoprocessor, Query, QueryTask, ProjectParameters,
        AreasAndLengthsParameters, BufferParameters, GeometryService,
        ProductToolbox, Menu, cfgManager, ImagePreview) {

        var maxFlashNumber = 6;
        var currentSymbolHighlighted = false;
        var anchorPoint = null;
        var contextMenu = null;
        var flashNumber = 0;
        var selectedSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([98, 194, 204]), 2),
            new Color([98, 194, 204, 0.25]));
        selectedSymbol.name = "selected";
        var preparedSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 255, 255]), 2),
            new Color([255, 255, 255, 0.2]));
        preparedSymbol.name = "prepared";
        var highlightedSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL,
                new Color([204, 98, 94]), 1),
            new Color([244, 98, 94, 0.25]));
        highlightedSymbol.name = "highlighted";
        var createdSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([0, 0, 0, 0.5]), 1),
            new Color([255, 127, 0, 0.25]));
        createdSymbol.name = "created";

        productLimitExceeded = function () {

            var countLimit = cfgManager.getApplicationSetting("maxProductsInExportGrid");
            if (Object.keys(SelectionTool.products).length >= countLimit) {
                alert("Export list cannot contain more than " + countLimit.toString() + " products.");
                return true;
            }

            return false;
        }

        var SelectionTool = declare("SelectionTool", null, {
            podMap: null,
            onProductsSelected: null,
            toolbox: null,
            drawToolbarGraphic: null,
            navigationToolbar: null,
            activeMapCommand: null,
            drawToolbar: null,
            moveToolbar: null,
            panZoomToolbar: null,
            gpCalculateExtent: null,
            gpCalculateStripMap: null,
            selectCursor: "wait",
            constructor: function() {},
            getInstance: function(podMap) {
                SelectionTool.symbols = {
                    selected: selectedSymbol,
                    prepared: preparedSymbol,
                    highlighted: highlightedSymbol,
                    created: createdSymbol
                };

                if (podMap == null) {
                    return this;
                }

                if (this.podMap == podMap) {
                    return this;
                }

                this.podMap = podMap;
                var mapCommandDomains = cfgManager.getBaseTableProperties("mapCommandContextMenu", "domain");
                var mapCommandDomain = cfgManager.getTable(mapCommandDomains);

                contextMenu = Menu.create("podMapMenu", mapCommandDomain, lang.hitch(this, this.selectTool), this.podMap);

                setInterval(lang.hitch(this, this.flashProduct), 500);
                this.toolbox = ProductToolbox.create("headerIconTool", lang.hitch(this, this.toolChanged));
                this.toolbox.onClearExtent = lang.hitch(this, function(isSelectedOnly) {
                    this.onDeleteProducts(isSelectedOnly);
                });
                this.panZoomToolbar = this.podMap.createNavigationToolbar();
                return this;
            },

            toolChanged: function(mapCommand) {
                this.selectTool(this.podMap, mapCommand);
            },

            StartFlash: function() {
                flashNumber = 0;
            },

            switchProduct: function(podMap, product) {

                if (ProductFactory.product == product) {
                    return;
                }

                this.selectTool(podMap, null);
                ProductFactory.product = product;
                contextMenu.adjustToProduct(product);
                podMap.adjustToProduct(product);
                this.toolbox.productChanged(product);
                if (product) {
                    dom.byId("headerIconProduct").title = product.productName;
                } else {
                    dom.byId("headerIconProduct").title = i18n.productFactory.title;
                }
                if (product != null) {
                    this.selectTool(podMap, product.getAttributeValue("mapCommandDefault"));
                }
            },

            flashProduct: function() {
                var productCollection = Object.keys(SelectionTool.products);

                if (flashNumber == maxFlashNumber) { //a >=

                    array.forEach(productCollection, function(productId, gcIndex) {
                        var product = SelectionTool.products[productId];
                        if (product.state == "prepared" && product.flashed === true) {

                            product.flashed = false;
                            product.setHighlighted(false);
                        }
                    });

                    return;
                }

                flashNumber++;
                currentSymbolHighlighted = !currentSymbolHighlighted;

                array.forEach(productCollection, function(productId, gcIndex) {
                    var product = SelectionTool.products[productId];
                    if (product.state == "prepared" && product.flashed === true) {
                        product.setHighlighted(currentSymbolHighlighted);
                    }
                });

            },

            onMapClicked: function(event) {

                var product = ProductFactory.product;
                if (this.activeMapCommand == "extent_point") {

                    if (this.checkForProductChosenAndNoPendingOp(this.drawToolbarGraphic)) {
                        return;
                    }

                    if (product.type === "Area") {
                        this.defineProductOnMap(event.mapPoint);
                    } else if (product.type === "Fixed" && product.getAttributeValue("extentLayer") !== "") {

                        // Set wait cursor and temporary graphic
                        this.podMap.setMapCursor("wait");

                        // Prepare data for GP service
                        var extLayer = this.podMap.getPodLayer(product.getAttributeValue("extentLayer"));
                        var queryTask = new QueryTask(extLayer.url + "/" + extLayer.sublayer);
                        var query = new Query();
                        anchorPoint = event.mapPoint;

                        // Run GP service
                        query.outFields = [];
                        query.returnGeometry = true;
                        query.geometry = event.mapPoint;
                        query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
                        queryTask.execute(query, lang.hitch(this, this.drawFixedResultsArea), lang.hitch(this, this.cancelDrawFixedResultsArea));
                    } else {
                        this.defineProductByPoint(event);
                    }
                }
            },

            // Adds selection as the result of the Query Task execution on map
            drawFixedResultsArea: function(results) {
                this.podMap.setMapCursor(SelectionTool.selectCursor);
                var currentFeature = results.features[0];
                if (currentFeature == null) {

                    alert(i18n.selectionTool.noFeaturePresented);
                    return;
                }

                if (ProductFactory.product.type != "Fixed") {

                    alert(i18n.selectionTool.invalidOperation);
                    return;
                }

                if (productLimitExceeded()) {
                    return;
                }

                var geometry = lang.clone(currentFeature.geometry);

                var cp = geometry.getExtent().getCenter();
                if (anchorPoint != null) {

                    var dx = cp.x - anchorPoint.x;
                    var dy = cp.y - anchorPoint.y;
                    array.forEach(geometry.rings, function(ring, i) {

                        array.forEach(ring, function(pt, j) {

                            geometry.rings[i][j][0] = pt[0] - dx;
                            geometry.rings[i][j][1] = pt[1] - dy;
                        });
                    });

                    geometry = new Polygon(geometry.toJson()); //to recalculate the extent
                }

                var product = ProductFactory.createProductInstance(ProductFactory.product, true, currentFeature);
                product.setGeometry(this.podMap, geometry);
                product.draw();

                SelectionTool.products[product.uuid] = product;
                if (this.onProductsSelected !== null)
                    this.onProductsSelected();
            },

            removeTemporaryGraphic: function() {

                if (this.drawToolbarGraphic == null) {
                    return;
                }

                this.podMap.removeGraphic(this.drawToolbarGraphic);
                this.drawToolbarGraphic = null;
            },

            cancelDrawFixedResultsArea: function(results) {

                this.removeTemporaryGraphic();
                alert(PodUtilities.makeErrorMessage(results));
                this.podMap.setMapCursor(SelectionTool.selectCursor);
            },

            getProductIdsCollection: function() {

                return Object.keys(SelectionTool.products);
            },

            onDeleteProducts: function(selectedOnly) {},

            selectTool: function(podMap, mapCommand) {

                if (mapCommand == this.activeMapCommand)
                    return;

                // Unselect command
                if (this.activeMapCommand != null) {

                    if (this.panZoomToolbar != null)
                        this.panZoomToolbar.deactivate();

                    SelectionTool.selectCursor = "url(images/pan.cur),auto";
                    this.podMap.setMapCursor(SelectionTool.selectCursor);
                    this.moveToolbarActivate(false);
                    if (this.drawToolbar != null)
                        this.drawToolbar.deactivate();

                    this.podMap.setMapTooltip("", false);
                    this.toolbox.activate(null);
                    this.drawToolbar = null;
                    this.removeTemporaryGraphic();
                }

                this.activeMapCommand = mapCommand;
                if (ProductFactory.product !== null && mapCommand != null &&
                    mapCommand != "clear_selected" && mapCommand != "clear_all" && mapCommand != "layer_zoomto")
                    ProductFactory.product.setAttributeValue("mapCommandDefault", mapCommand);

                // Select command
                if (mapCommand == "zoomin" || mapCommand == "zoomout") {

                    SelectionTool.selectCursor = "url(images/" + ((mapCommand == "zoomin") ? "zoomin.cur" : "zoomout.cur") + "),auto";
                    this.panZoomToolbar.activate((mapCommand == "zoomin") ? toolbarNavigation.ZOOM_IN : toolbarNavigation.ZOOM_OUT);
                } else if (mapCommand == "clear_selected" || mapCommand == "clear_all") {

                    var isAll = (mapCommand == "clear_all");
                    this.toolbox.activate(mapCommand);
                    if (this.toolbox.onClearExtent != null)
                        this.toolbox.onClearExtent(!isAll);

                    setTimeout(lang.hitch(this, function() {

                        if (ProductFactory.product === null)
                            this.selectTool(podMap, null);
                        else
                            this.selectTool(podMap, ProductFactory.product.getAttributeValue("mapCommandDefault"));
                    }), 150);
                } else if (mapCommand == "layer_zoomto") {

                    this.toolbox.activate(mapCommand);
                    var extent = "";
                    while (true) {

                        if (ProductFactory.product === null)
                            break;

                        extent = ProductFactory.product.getAttributeValue("mapExtent");
                        if (extent !== "")
                            break;

                        extent = ProductFactory.product.getAttributeValue("layerExtent");
                        if (extent !== "")
                            break;

                        var extentLayerName = ProductFactory.product.getAttributeValue("extentLayer");
                        if (extentLayerName === "")
                            break;

                        function layerHandler(response) {

                            ProductFactory.product.setTableAttribute({
                                attr: "layerExtent",
                                value: response.extent
                            });
                            podMap.setExtent(Geometry.Extent(response.extent), true);
                        }

                        var layer = podMap.getPodLayer(extentLayerName);
                        esriRequest({
                            url: layer.url + "/" + layer.sublayer,
                            content: {
                                f: "json"
                            },
                            callbackParamName: "callback",
                            load: layerHandler
                        });

                        break;
                    }

                    if (extent !== "")
                        podMap.setExtent(Geometry.Extent(extent), true);

                    setTimeout(lang.hitch(this, function() {

                        if (ProductFactory.product === null)
                            this.selectTool(podMap, null);
                        else
                            this.selectTool(podMap, ProductFactory.product.getAttributeValue("mapCommandDefault"));
                    }), 150);
                } else if (mapCommand != null && mapCommand != "pan") {

                    this.drawToolbarActivate(podMap, mapCommand);
                    this.toolbox.activate(mapCommand);
                    if (mapCommand != "extent_move")
                        SelectionTool.selectCursor = "url(images/cross.cur),auto";
                    else {

                        SelectionTool.selectCursor = "pointer";
                        this.moveToolbarActivate(true);
                    }

                }
                var iconTitle = i18n.toolbox.title;
                if (mapCommand !== null) {
                    var toolbarButton = dom.byId("button_" + mapCommand);
                    if (toolbarButton != null){
                        iconTitle = toolbarButton.title;
                    }
                }

                dom.byId("headerIconTool").title = iconTitle;
                this.podMap.setMapCursor(SelectionTool.selectCursor);

                contextMenu.adjustToCommand(mapCommand);
            },

            drawToolbarActivate: function(podMap, mapCommand) {

                var func = this.addSelectionGraphicFixedExtent;
                if (mapCommand == "extent_point") {

                    this.podMap.setMapTooltip("Click to add an extent");
                } else if (mapCommand == "select_point") {

                    this.podMap.setMapTooltip("Click to select an extent");
                    this.drawToolbar = this.podMap.createDrawToolbar(false);
                    this.drawToolbar.activate(toolbarDraw.POINT);
                } else if (mapCommand == "select_polyline") {

                    this.drawToolbar = this.podMap.createDrawToolbar(true);
                    this.drawToolbar.activate(toolbarDraw.POLYLINE);
                    this.podMap.setMapTooltip("", false);
                } else if (mapCommand == "select_polygon") {

                    this.drawToolbar = this.podMap.createDrawToolbar(true);
                    this.drawToolbar.activate(toolbarDraw.POLYGON);
                    this.podMap.setMapTooltip("", false);
                } else if (mapCommand == "extent_polyline") {

                    this.drawToolbar = this.podMap.createDrawToolbar(true);
                    this.drawToolbar.activate(toolbarDraw.POLYLINE);
                    this.podMap.setMapTooltip("", false);
                    func = this.defineStripMap;
                } else if (mapCommand == "extent_polygon") {

                    this.drawToolbar = this.podMap.createDrawToolbar(true);
                    this.drawToolbar.activate(toolbarDraw.POLYGON);
                    this.podMap.setMapTooltip("", false);
                    ProductFactory.product.setAttributeValue("units", "Meters");
                    func = this.defineProduct;
                }

                Connect.connect(this.drawToolbar, "onDrawEnd", lang.hitch(this, func));
            },

            addSelectionGraphicFixedExtent: function(geometry) {

                // Check if the requested op is valid
                if (this.checkForProductChosenAndNoPendingOp(this.drawToolbarGraphic))
                    return;

                var product = ProductFactory.product;
                if (product.type != "Fixed") {

                    alert(i18n.selectionTool.invalidOperationForNonFixed);
                    return;
                }

                var currentExtentLayer = product.getAttributeValue("extentLayer");
                if (currentExtentLayer === "")
                    return;

                // Set wait cursor and temporary graphic
                var symbol;
                var type = geometry.type;
                if (type === "point" || type === "multipoint") {
                    symbol = this.drawToolbar.markerSymbol;
                } else if (type === "line" || type === "polyline") {
                    symbol = this.drawToolbar.lineSymbol;
                } else { // type === "polygon"
                    symbol = this.drawToolbar.fillSymbol;
                }

                this.drawToolbarGraphic = new Graphic(geometry, symbol);
                this.podMap.addGraphic(this.drawToolbarGraphic);
                this.podMap.setMapCursor("wait");

                var extentLayerAttr = null;
                //find extent layers source
                var extentLayers = null;
                var typeAttr = ProductFactory.getProductTypeAttr(product);
                if (typeAttr != null)
                    extentLayers = cfgManager.getTable(typeAttr.source);

                for (var singleExtentLayer in extentLayers) {
                    if (extentLayers.hasOwnProperty(singleExtentLayer)) {

                        if (extentLayers[singleExtentLayer].value != currentExtentLayer)
                            continue;

                        extentLayerAttr = extentLayers[singleExtentLayer];
                        break;
                    }
                }
                var extLayerName = product.getAttributeValue("extentLayer");
                var extentLayer = this.podMap.getPodLayer(extLayerName);
                var fields = extentLayer.oidField;
                if (fields != "*") {
                    var sourceAttributes = product.getAttributesByKey("source");

                    for (var idx in sourceAttributes) {
                        if (sourceAttributes.hasOwnProperty(idx)) {

                            var source = sourceAttributes[idx].source;

                            if (source == null || source === "")
                                continue;

                            var sourceField = extentLayerAttr[source];
                            if (sourceField != null)
                                fields += "," + sourceField;
                        }
                    }
                }
                // Run GP service
                var queryTask = new QueryTask(extentLayer.url + "/" + extentLayer.sublayer);


                var query = new Query();
                query.returnGeometry = true;
                query.geometry = geometry;
                query.outFields = [fields];
                query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
                queryTask.execute(query, lang.hitch(this, this.addSelectionGraphicFixedExtentOK), lang.hitch(this, this.addSelectionGraphicFixedExtentCancel));
            },

            // Cancel the gp task execution and remove temporary graphic from map
            calculateCancel: function(results) {

                this.removeTemporaryGraphic();
                alert(PodUtilities.makeErrorMessage(results));
                this.podMap.setMapCursor(SelectionTool.selectCursor);
                if (this.moveToolbar != null)
                    this.podMap.setMapTooltip(null);
            },

            addSelectionGraphicFixedExtentCancel: function(results) {

                this.removeTemporaryGraphic();
                alert(PodUtilities.makeErrorMessage(results));
                this.podMap.setMapCursor(SelectionTool.selectCursor);
            },

            addSelectionGraphicFixedExtentOK: function(results) {
                if (results.features.length >= 500) { // only first 500 results are returned so we prevent incomplete selection here

                    this.removeTemporaryGraphic();
                    this.podMap.setMapCursor(SelectionTool.selectCursor);
                    alert(string.substitute(i18n.selectionTool.selectionTooLarge, {
                        featureCount: results.features.length
                    }));
                    return;
                }

                var productCollection = this.getProductsByLayer(ProductFactory.product.getAttributeValue("extentLayer"));

                var oidField;
                var isAnySelect = false;
                var i;
                for (i = 0; i < results.features.length; i++) {

                    if (productLimitExceeded()) {
                        break;
                    }

                    var currentFeature = results.features[i];
                    var geometry = currentFeature.geometry;
                    var type = geometry.type;
                    var symbol;
                    if (type === "point" || type === "multipoint")
                        symbol = this.drawToolbar.markerSymbol;
                    else if (type === "line" || type === "polyline")
                        symbol = this.drawToolbar.lineSymbol;
                    else // type == "polygon"
                        symbol = SelectionTool.symbols.selected;

                    for (var attribute in currentFeature.attributes) {
                        if (currentFeature.attributes.hasOwnProperty(attribute)) {

                            if (attribute.toUpperCase() != "OBJECTID")
                                continue;

                            oidField = attribute;
                            break;
                        }
                    }

                    // Prevent duplicate selection for already selected features
                    var isAlreadySelected = false;

                    array.forEach(productCollection, function(product) {

                        if (product.feature != null && currentFeature.attributes[oidField] == product.feature.attributes[oidField]) {
                            isAlreadySelected = true;
                            return;
                        }
                    });

                    // If feature not selected then select it
                    if (!isAlreadySelected) {

                        var product = ProductFactory.createProductInstance(ProductFactory.product, false, currentFeature);
                        product.setGeometry(this.podMap, geometry);
                        product.draw();

                        SelectionTool.products[product.uuid] = product;
                        isAnySelect = true;
                    }
                }

                // If all features already selected then clear this area
                if (!isAnySelect) {

                    for (i = 0; i < results.features.length; i++) {

                        currentFeature = results.features[i];
                        array.forEach(productCollection, function(product) {

                            if (product.feature != null && currentFeature.attributes[oidField] == product.feature.attributes[oidField]) {

                                if (product.state == "selected") {
                                    product.hide();
                                    delete SelectionTool.products[product.uuid];
                                }
                            }
                        });
                    }
                }

                this.removeTemporaryGraphic();
                this.podMap.setMapCursor(SelectionTool.selectCursor);
                if (this.onProductsSelected !== null)
                    this.onProductsSelected();

            },

            getProductsByLayer: function(layerId) {

                var productIds = this.getProductIdsCollection();
                var productCollection = [];
                array.forEach(productIds, function(productId) {
                    var product = SelectionTool.products[productId];
                    if (product.getAttributeValue("extentLayer") == layerId)
                        productCollection.push(product);
                });

                return productCollection;
            },

            productsAddedInfo: function(message) {

                var container = this.toolbox.getContainer();
                var tooltip = domConstruct.create("div", {
                    "class": "productsAddedInfo",
                    "innerHTML": message
                }, container);

                tooltip.show = "true";
                domStyle.set(tooltip, {
                    left: (container.offsetLeft + container.offsetWidth / 2 - 10) + "px",
                    top: (container.offsetTop + container.offsetHeight / 2 + 19) + "px",
                    display: tooltip.show
                });

                setTimeout(function() {
                    tooltip.style.display = "none";
                }, 5000);
            },

            defineProductOnMap: function(mapPoint, searchDrawOk, searchDrawCancel) {

                // Check if the requested op is valid
                var product = ProductFactory.product;
                if (this.checkForProductChosenAndNoPendingOp(this.drawToolbarGraphic))
                    return;

                var isSearchMode = (searchDrawOk != null && searchDrawCancel != null);
                var dblWidth = parseFloat(product.getAttributeValue("width"));
                var dblHeight = parseFloat(product.getAttributeValue("height"));
                var isAreaUnknown = isNaN(dblWidth) || isNaN(dblHeight);
                if (isSearchMode && isAreaUnknown) {

                    dblWidth = 100;
                    dblHeight = 100;
                    isAreaUnknown = false;
                }

                var inGroundHeight = null;
                var inGroundWidth = null;
                if (!isAreaUnknown) {

                    inGroundWidth = {
                        distance: dblWidth,
                        units: product.getAttributeValue("units")
                    };
                    inGroundHeight = {
                        distance: dblHeight,
                        units: product.getAttributeValue("units")
                    };
                } else if (product.type == "Scale" || product.type == "PageSize") {

                    alert(i18n.selectionTool.areaNoSpecified);
                    return false;
                }

                var createdProductGraphic = new Graphic(mapPoint);
                createdProductGraphic.productType = product.type;

                var features = [];
                features.push(createdProductGraphic);
                var featureSet = new FeatureSet();
                featureSet.features = features;
                featureSet.fields = [];
                var calculateServiceParameters = {
                    "ptln_of_interest": featureSet,
                    "product_name": product.productName,
                    "grid_xml": product.getAttributeValue("gridXml"),
                    "scale": product.getAttributeValue("scale"),
                    "page_size": ProductFactory.makePageSizeValue(product.getAttribute("pageSize"), product.getAttributeValue("orientation")),
                    "margin": product.getAttributeValue("pageMargin"),
                    "env:outSR":"102100"
                };

                if (!isAreaUnknown) {
                    calculateServiceParameters.groundwidth = inGroundWidth;
                    calculateServiceParameters.groundheight = inGroundHeight;
                }

                // Run GP service
                product.calculateServiceParameters = calculateServiceParameters;
                if (this.gpCalculateExtent === null)
                    this.gpCalculateExtent = new Geoprocessor(cfgManager.getApplicationSetting("gpCalculateExtentUrl"));

                if (isSearchMode)
                    this.gpCalculateExtent.execute(product.calculateServiceParameters, searchDrawOk, searchDrawCancel);
                else
                    this.gpCalculateExtent.execute(product.calculateServiceParameters, lang.hitch(this, this.defineProductOnMapOK), lang.hitch(this, this.calculateCancel));

            },

            defineProductOnMapOK: function(results) {

                this.podMap.setMapCursor(SelectionTool.selectCursor);
                if (results[0].paramName != "out_extent") {

                    alert(string.substitute(i18n.selectionTool.unexpectedResponse, {
                        paramName: results[0].paramName
                    }));
                    return;
                }

                var features = results[0].value.features;
                var interval = ProductFactory.product.getAttributeValue("roundToNearest");
                var needRounded = !!interval;
                for (var i = 0; i < features.length; i++) {

                    if (productLimitExceeded()) {
                        break;
                    }

                    var productGraphic = features[i];
                    productGraphic.geometry.angle = features[i].attributes.Angle;
                    productGraphic.geometry.direction = features[i].attributes.Direction;

                    var deferred = new Deferred();
                    deferred.resolve(productGraphic); // defer resolved immediately

                    if (needRounded) {
                        var gsvc = new GeometryService(cfgManager.getApplicationSetting("geometryServiceUrl"));
                        var areasAndLengthParams = new AreasAndLengthsParameters();
                        areasAndLengthParams.lengthUnit = GeometryService.UNIT_METER;
                        areasAndLengthParams.areaUnit = GeometryService.UNIT_SQUARE_METERS;
                        areasAndLengthParams.polygons = [productGraphic.geometry];
                        deferred = gsvc.areasAndLengths(areasAndLengthParams).then(function(result) {
                            return result;
                        });
                    }

                    when(deferred).then(lang.hitch({
                        geometry: productGraphic.geometry,
                        podMap: this.podMap,
                        onProductsSelected: this.onProductsSelected
                    }, function(result) {
                        var deferred2 = new Deferred();
                        deferred2.resolve(this.geometry);
                        if (result.hasOwnProperty("areas")) { // calculated area value from initial polygon
                            var area = result.areas[0];
                            var length = result.lengths[0];
                            var newArea = Math.floor(area / (interval * interval)) * (interval * interval);
                            var delta = area - newArea;
                            var distance = (length - Math.sqrt(length * length - 16 * delta)) / 8;

                            var params = new BufferParameters();
                            params.geometries = [this.geometry];
                            params.distances = [-distance];
                            params.unit = GeometryService.UNIT_METER;
                            params.bufferSpatialReference = new SpatialReference(102100);
                            params.outSpatialReference = new SpatialReference(102100);

                            deferred2 = gsvc.buffer(params).then(function(bufferedAOIs) {
                                return bufferedAOIs[0];
                            });
                        }
                        when(deferred2).then(lang.hitch(this, function(aoi) {
                            var product = ProductFactory.createProductInstance(ProductFactory.product);
                            product.setGeometry(this.podMap, aoi);
                            product.draw();

                            SelectionTool.products[product.uuid] = product;
                            if (this.onProductsSelected !== null)
                                this.onProductsSelected();
                        }));
                    }));
                }
            },

            defineProduct: function(mapPolygon) {

                if (this.checkForProductChosenAndNoPendingOp())
                    return;

                // Set wait cursor and temporary graphic
                var extent = mapPolygon.getExtent();
                var aoi = new Polygon(extent.spatialReference);
                aoi.addRing([
                    [extent.xmin, extent.ymin],
                    [extent.xmin, extent.ymax],
                    [extent.xmax, extent.ymax],
                    [extent.xmax, extent.ymin],
                    [extent.xmin, extent.ymin]
                ]);
                this.drawToolbarGraphic = new Graphic(aoi);
                this.podMap.setMapCursor("wait");

                // Prepare data for GP service
                var product = ProductFactory.product;
                var features = [];
                features.push(this.drawToolbarGraphic);
                var featureSet = new FeatureSet();
                featureSet.features = features;
                featureSet.fields = [];

                // common parameters for calculator
                var calculateServiceParameters = {
                    "area_of_interest": featureSet,
                    "product_name": product.productName,
                    "grid_xml": product.getAttributeValue("gridXml"),
                    "margin": product.getAttributeValue("pageMargin")
                };

                // product specific parameters for calculator
                var gpCalculateUrl;
                switch (product.type) {
                    case "PageSize":
                        calculateServiceParameters.Scale = product.getAttributeValue("scale");
                        gpCalculateUrl = cfgManager.getApplicationSetting("gpCalculatePageSizeUrl");
                        break;
                    case "Scale":
                        calculateServiceParameters.page_size = ProductFactory.makePageSizeValue(product.getAttribute("pageSize"), product.getAttributeValue("orientation"));
                        gpCalculateUrl = cfgManager.getApplicationSetting("gpCalculateScaleUrl");
                        break;
                    default:
                        break;
                }

                // Run GP service
                this.gpCalculate = new Geoprocessor(gpCalculateUrl);
                product.calculateServiceParameters = calculateServiceParameters;
                this.gpCalculate.execute(product.calculateServiceParameters, lang.hitch(this, this.defineProductOK), lang.hitch(this, this.calculateCancel));
            },

            defineProductOK: function(results) {

                var kindOfProduct = ProductFactory.product;
                this.podMap.setMapCursor(SelectionTool.selectCursor);
                if (results[0].paramName != "out_scale" && results[0].paramName != "out_page_size") {
                    alert(string.substitute(i18n.selectionTool.unexpectedResponse, {
                        paramName: results[0].paramName
                    }));
                    this.removeTemporaryGraphic();
                    return;
                }

                if (productLimitExceeded())
                    return;

                var product = ProductFactory.createProductInstance(kindOfProduct);
                var interval = product.getAttributeValue("roundToNearest");
                var needRounded = !!interval;
                switch (product.type) {
                    case "Scale":
                        var scale = results[0].value;
                        if (needRounded) {
                            scale = this.roundToNearest(product, scale, interval);
                        }
                        product.setAttributeValue("scale", scale);
                        break;
                    case "PageSize":
                        var pageSize = results[0].value;
                        if (needRounded) {
                            product.calculatedPageSize = pageSize;
                            pageSize = this.roundToNearest(product, pageSize, interval);
                        }

                        product.pageSize = pageSize;
                        var pageSizeValue = Math.round(pageSize.width * 100) / 100 + " " + Math.round(pageSize.height * 100) / 100 + " " + pageSize.units;
                        product.setAttributeValue("pageSize", pageSizeValue);
                        product.setAttributeValue("orientation", (pageSize.width > pageSize.height) ? "LANDSCAPE" : "PORTRAIT");
                        break;
                    default:
                        break;
                }

                product.setGeometry(this.podMap, this.drawToolbarGraphic.geometry);
                product.draw();
                SelectionTool.products[product.uuid] = product;
                this.removeTemporaryGraphic();
                this.podMap.setMapCursor(SelectionTool.selectCursor);
                if (this.onProductsSelected !== null)
                    this.onProductsSelected();
            },

            roundToNearest: function(product, initialValue, interval) {

                // initialValue for pageSize example: {height: 11, width: 8, units: "INCHES"}
                // initialValue for scale example: 102546
                // initialValue for extent example:
                var MAX_NUMBER = 1000000000;
                var roundedValue = initialValue;
                switch (product.type) {
                    case "Scale":
                        if (typeof interval == "number" && interval > 0) { // round to interval
                            return Math.ceil(initialValue / interval) * interval;
                        } else { // round to next small scale
                            var scale = product.getAttribute("scale");
                            var availableScales;
                            if (scale.filter != null) {
                                availableScales = scale.filter;
                            } else if (scale.domain != null) {
                                availableScales = cfgManager.getTable(scale.domain);
                            } else {
                                console.log("RoundToNearest: No scale is available");
                                return initialValue;
                            }

                            var fitScale = MAX_NUMBER;
                            for (var i in availableScales) {
                                var currentScale = availableScales[i].value;
                                if (initialValue < currentScale && fitScale > currentScale) { // we only rounded to a smaller scale, bigger number.
                                    fitScale = currentScale;
                                }

                            }

                            if (fitScale != MAX_NUMBER) {
                                return fitScale;
                            }
                        }
                        break;

                    case "PageSize":
                        var pageSize = product.getAttribute("pageSize");
                        var availablePages;
                        if (pageSize.filter != null) {
                            availablePages = pageSize.filter;
                        } else if (pageSize.domain != null) {
                            availablePages = cfgManager.getTable(pageSize.domain);
                        } else {
                            console.log("RoundToNearest: No page is available");
                            return initialValue;
                        }

                        var width = initialValue.width;
                        var height = initialValue.height;
                        var units = initialValue.units;
                        var orientation = height > width ? "PORTRAIT" : "LANDSCAPE";

                        var fitWidth = MAX_NUMBER;
                        var fitHeight = MAX_NUMBER;

                        for (var j in availablePages) {
                            // get width, height, units values from the available pages in product definition
                            // and find the page whihc is the best fit
                            var page = PodUtilities.getPageSize(availablePages[j], orientation);
                            if (page.units !== units) {
                                page.width = PodUtilities.convertUnits(page.width, page.units, units);
                                page.height = PodUtilities.convertUnits(page.height, page.units, units);
                                page.units = units;
                            }

                            if (page.width >= width && page.height >= height) { // we only rounded to bigger pages
                                if (page.width < fitWidth) {
                                    if (page.height < fitHeight) { // both width and height are smaller
                                        fitHeight = page.height;
                                        fitWidth = page.width;
                                    } else if (page.width * page.height < fitWidth * fitHeight) { // width is smaller, but height is greater. pick the one with samller area
                                        fitHeight = page.height;
                                        fitWidth = page.width;
                                    }
                                } else if (page.width * page.height < fitWidth * fitHeight) { // width is greater, pick the one with samller area  
                                    fitHeight = page.height;
                                    fitWidth = page.width;
                                }
                            }
                        }

                        if (fitWidth !== MAX_NUMBER) { // find best fit page
                            roundedValue = {
                                "width": fitWidth,
                                "height": fitHeight,
                                "units": units
                            };
                        }

                        break;
                }

                return roundedValue;
            },

            defineStripMap: function(mapPolyline) {

                // Check if the requested op is valid
                var isAllPointsTheSame = true;
                var paths = mapPolyline.paths[0];
                for (var i = 1; i < paths.length; i++) {

                    if (paths[i - 1][0] != paths[i][0] || paths[i - 1][1] != paths[i][1]) {

                        isAllPointsTheSame = false;
                        break;
                    }
                }

                if (isAllPointsTheSame) {

                    alert(i18n.selectionTool.needTwoPoints);
                    return;
                }

                if (this.checkForProductChosenAndNoPendingOp(this.drawToolbarGraphic))
                    return;

                // Set wait cursor and temporary graphic
                this.podMap.setMapCursor("wait");

                // Prepare data for GP service
                var product = ProductFactory.product;
                var createdProductGraphic = new Graphic(mapPolyline);
                createdProductGraphic.productType = product.type;

                var features = [];
                features.push(createdProductGraphic);
                var featureSet = new FeatureSet();
                featureSet.features = features;
                featureSet.fields = [];

                var calculateServiceParameters = {
                    "ptln_of_interest": featureSet,
                    "grid_xml": product.getAttributeValue("gridXml"),
                    "scale": product.getAttributeValue("scale"),
                    "page_size": ProductFactory.makePageSizeValue(product.getAttribute("pageSize"), product.getAttributeValue("orientation")),
                    "margin": product.getAttributeValue("pageMargin")
                };

                // Run GP service
                product.calculateServiceParameters = calculateServiceParameters;
                if (this.gpCalculateExtent === null)
                    this.gpCalculateExtent = new Geoprocessor(cfgManager.getApplicationSetting("gpCalculateExtentUrl"));

                this.gpCalculateExtent.execute(product.calculateServiceParameters, lang.hitch(this, this.defineProductOnMapOK), lang.hitch(this, this.calculateCancel));
            },

            updateProductGeometry: function(graphic) {

                if (this.onProductMoved != null) {
                    this.onProductMoved(graphic.UID);
                }
            },

            // Activates or deactivates moving graphics on map
            moveToolbarActivate: function(isActivateMoving) {

                if (this.moveToolbar === isActivateMoving) // nothing to do
                    return;

                // Deactivate moving
                if (!isActivateMoving) {
                    for (var product in SelectionTool.products) {
                        SelectionTool.products[product].activateEditor(false);
                    }

                }

                // Activate moving
                if (isActivateMoving) {
                    for (product in SelectionTool.products) {
                        SelectionTool.products[product].activateEditor(this.podMap, lang.hitch(this, this.onMoveStart), lang.hitch(this, this.onMoveEnd));
                    }

                    this.podMap.setMapTooltip(i18n.selectionTool.selectExtentTooltip);
                }
                this.moveToolbar = isActivateMoving;
            },

            onMoveStart: function(graph) {
                if (!graph.graphic.UID) {
                    return;
                }
                var movedProduct = SelectionTool.products[graph.graphic.UID];
                if (!movedProduct || !movedProduct.isCustom) {
                    return;
                }

                movedProduct.setMoved();

                this.oldSymbol = graph.graphic.symbol;
                var symb = new SimpleFillSymbol();
                graph.graphic.setSymbol(symb);

                this.podMap.setMapTooltip(null, false);
                this.podMap.hideTooltip();
            },

            onMoveEnd: function(info) {

                this.podMap.setMapTooltip(null); //restore tooltip

                // Check if the requested op is valid
                var graphic = info.graphic;
                var geometry = graphic.geometry;
                var geometryCenter = geometry.getExtent().getCenter();
                var product = SelectionTool.products[graphic.UID];
                if (!product.isCustom) {

                    alert(i18n.selectionTool.invalidOperationForFixed);
                    return;
                }

                product.setMoved(false);
                var imagePreview = new ImagePreview();
                imagePreview.resetImagePreview(product);
                imagePreview.prepareImagePreview(product);
                if (product.type == "Fixed") {
                    this.updateProductGeometry(graphic);
                    product.replace(geometry);
                    return;
                }

                // Set wait cursor and temporary graphic
                this.podMap.setMapCursor("wait");

                // Prepare data for GP service
                this.movedGraphic = graphic;
                var params = product.calculateServiceParameters;

                if (product.type === "Area") {
                    // Run GP service
                    if (params.ptln_of_interest != null) {
                        if (params.ptln_of_interest.features[0].geometry.type === "point") {

                            product.calculateServiceParameters.ptln_of_interest.features = [new Graphic(geometryCenter)];
                        }
                        else if (params.ptln_of_interest.features[0].geometry.type == "polyline") {

                            var polyline = new Polyline(geometry.spatialReference);
                            polyline.paths.push([]);

                            var x = (geometry.rings[0][1][0] + geometry.rings[0][0][0]) / 2;
                            var y = (geometry.rings[0][1][1] + geometry.rings[0][0][1]) / 2;
                            polyline.paths[0].push([x, y]); // center of the tail side of the polygon, along the strip map path

                            x = (geometry.rings[0][3][0] + geometry.rings[0][2][0]) / 2;
                            y = (geometry.rings[0][3][1] + geometry.rings[0][2][1]) / 2;
                            polyline.paths[0].push([x, y]); // center of the front side of the polygon, along the strip map path

                            var features = [];
                            features.push(new Graphic(polyline));
                            var featureSet = new FeatureSet();
                            featureSet.features = features;
                            featureSet.fields = [];

                            product.calculateServiceParameters.ptln_of_interest = featureSet;
                        }

                        this.gpCalculateExtent.execute(product.calculateServiceParameters, lang.hitch(this, this.drawResultsAreaForMoved), lang.hitch(this, this.calculateCancel));
                    }
                } else {

                    var gpCalculateUrl;
                    product.calculateServiceParameters.area_of_interest.features = [graphic];
                    switch (product.type) {
                        case "PageSize":
                            gpCalculateUrl = cfgManager.getApplicationSetting("gpCalculatePageSizeUrl");
                            break;
                        case "Scale":
                            gpCalculateUrl = cfgManager.getApplicationSetting("gpCalculateScaleUrl");
                            break;
                        default:
                            break;
                    }

                    this.gpCalculate = new Geoprocessor(gpCalculateUrl);
                    this.gpCalculate.execute(product.calculateServiceParameters, lang.hitch(this, this.drawResultsAreaForMoved), lang.hitch(this, this.calculateCancel));
                }
            },

            // Draw results obtained from the GP service for moved object
            drawResultsAreaForMoved: function(results) {

                var uid = this.movedGraphic.UID;
                var product = SelectionTool.products[uid];
                if (results[0].paramName === "out_extent") {
                    var feature = results[0].value.features[0];
                    var geom = feature.geometry;
                    if (feature.attributes.Angle != null) {
                        geom.angle = feature.attributes.Angle;
                    }

                    this.movedGraphic.setGeometry(geom);
                } else {

                    var interval = product.getAttributeValue("roundToNearest");
                    var needRounded = !!interval;
                    switch (product.type) {
                        case "Scale":
                            var scale = results[0].value;
                            if (needRounded) {
                                scale = this.roundToNearest(product, scale, interval);
                            }
                            product.setAttributeValue("scale", scale);
                            break;
                        case "PageSize":
                            var pageSize = results[0].value;
                            if (needRounded)
                                pageSize = this.roundToNearest(product, pageSize, interval);

                            product.pageSize = pageSize;
                            var pageSizeValue = Math.round(pageSize.width * 100) / 100 + " " + Math.round(pageSize.height * 100) / 100 + " " + pageSize.units;
                            product.setAttributeValue("pageSize", pageSizeValue);
                            product.setAttributeValue("orientation", (pageSize.width > pageSize.height) ? "LANDSCAPE" : "PORTRAIT");
                            break;
                        default:
                            break;
                    }
                }

                product.replace(this.movedGraphic.geometry);
                
                this.podMap.setMapCursor(SelectionTool.selectCursor);
                this.updateProductGeometry(this.movedGraphic);
                this.podMap.setMapTooltip(i18n.selectionTool.moveExtentTooltip);
            },

            checkForProductChosenAndNoPendingOp: function(drawing) {

                if (ProductFactory.product === null) {

                    alert(i18n.selectionTool.selectProduct);
                    return true;
                }

                return (drawing != null); // true: another selection operation is in progress, need to wait for its completion
            },

            defineProductByPoint: function(event) {

                this.drawToolbarGraphic = new Graphic(event.mapPoint, SelectionTool.symbols.created);
                var pageSizeDialog = registry.byId("PageSizeDialog");

                if (!pageSizeDialog) {

                    var content = domConstruct.create("div", {
                        className: "panel",
                        id: "dialog_content"
                    });

                    domConstruct.create("h1", {
                        innerHTML: "Input map extent ..."
                    }, content);

                    var table = domConstruct.create("table", {}, content);
                    var tr = domConstruct.create("tr", {}, table);
                    domConstruct.create("td", {
                        innerHTML: "Width"
                    }, tr);
                    var tdValue = domConstruct.create("td", {}, tr);
                    domConstruct.create("input", {
                        id: "width",
                        type: "text",
                        productAttr: "width",
                        onkeypress: PodUtilities.validateNumber
                    }, tdValue);

                    tr = domConstruct.create("tr", {}, table);
                    domConstruct.create("td", {
                        innerHTML: "Height"
                    }, tr);
                    tdValue = domConstruct.create("td", {}, tr);
                    domConstruct.create("input", {
                        id: "height",
                        type: "text",
                        productAttr: "height",
                        onkeypress: PodUtilities.validateNumber
                    }, tdValue);

                    tr = domConstruct.create("tr", {}, table);
                    domConstruct.create("td", {
                        innerHTML: "Units"
                    }, tr);
                    tdValue = domConstruct.create("td", {}, tr);
                    var selectValue = domConstruct.create("select", {
                        id: "units"
                        
                    }, tdValue);
                    selectValue.className = "mapExtentUnitsCombo";

                    var filter = ProductFactory.product.getAttribute("units").filter;
                    for (var unit in filter) {
                        if (filter.hasOwnProperty(unit)) {
                            domConstruct.create("option", {
                                innerHTML: ProductFactory.product.getAttribute("units").filter[unit]
                            }, selectValue);
                        }
                    }

                    tr = domConstruct.create("tr", {}, table);
                    var td = domConstruct.create("td", {
                        align: "right"
                    }, tr);
                    domConstruct.create("div", {
                        id: "ok_button_place"
                    }, td);

                    td = domConstruct.create("td", {
                        align: "left"
                    }, tr);
                    domConstruct.create("div", {
                        id: "cancel_button_place"
                    }, td);

                    pageSizeDialog = new TooltipDialog({
                        id: "PageSizeDialog",
                        autofocus: true
                    });

                    pageSizeDialog.attr("content", content);

                    Popup.open({
                        popup: pageSizeDialog,
                        x: event.x,
                        y: event.y
                    });

                    var okButton = new Button({
                        label: "OK"
                    }, "ok_button_place");
                    okButton.startup();
                    okButton.on("click", lang.hitch(this, function() {
                        Popup.close(pageSizeDialog);

                        // Convert width and height into measure in meters
                        var width = parseFloat(dom.byId("width").value);
                        var height = parseFloat(dom.byId("height").value);
                        var units = dom.byId("units").value;
                        ProductFactory.product.setAttributeValue("width", width);
                        ProductFactory.product.setAttributeValue("height", height);
                        ProductFactory.product.setAttributeValue("units", units);

                        var deferred;
                        if (units.toLowerCase() === "decimal degrees") {
                            var gsvc = new GeometryService(cfgManager.getApplicationSetting("geometryServiceUrl"));
                            var params = new ProjectParameters();
                            params.geometries = [this.drawToolbarGraphic.geometry.normalize()];
                            params.outSR = new SpatialReference(4326);
                            deferred = gsvc.project(params).then(function(projectedPoints) {
                                return projectedPoints[0];
                            });
                        } else {
                            // Get grid projection by calling calculate extent 
                            var centroid = this.drawToolbarGraphic.geometry;
                            var product = ProductFactory.product;
                            var features = [new Graphic(centroid)];
                            var featureSet = new FeatureSet();
                            featureSet.features = features;
                            featureSet.fields = [];
                            var calculateServiceParameters = {
                                "ptln_of_interest": featureSet,
                                "product_name": product.productName,
                                "grid_xml": product.getAttributeValue("gridXml"),
                                "scale": 10000,
                                "page_size": ProductFactory.makePageSizeValue(product.getAttribute("pageSize"), product.getAttributeValue("orientation")),
                                "margin": product.getAttributeValue("pageMargin")
                            };

                            // Run GP service
                            product.calculateServiceParameters = calculateServiceParameters;
                            if (this.gpCalculateExtent === null)
                                this.gpCalculateExtent = new Geoprocessor(cfgManager.getApplicationSetting("gpCalculateExtentUrl"));
                            var deferred = this.gpCalculateExtent.execute(product.calculateServiceParameters).then(function(calculatedAOIs) {
                                return calculatedAOIs[0].value.features[0].geometry.getCentroid();
                            });
                        }

                        when(deferred).then(lang.hitch(this, function(centroid) {

                            if (units.toLowerCase() === "kilometers") {
                                width = width * 1000;
                                height = height * 1000;
                            }

                            var xmin = centroid.x - width / 2;
                            var xmax = centroid.x + width / 2;
                            var ymin = centroid.y - height / 2;
                            var ymax = centroid.y + height / 2;
                            this.drawToolbarGraphic = null;
                            var aoi = new Polygon(centroid.spatialReference);
                            aoi.addRing([
                                [xmin, ymin],
                                [xmin, ymax],
                                [xmax, ymax],
                                [xmax, ymin],
                                [xmin, ymin]
                            ]);

                            var gsvc = new GeometryService(cfgManager.getApplicationSetting("geometryServiceUrl"));
                            var params = new ProjectParameters();
                                params.geometries = [aoi];
                                params.outSR = new SpatialReference(102100);
                                deferred2 = gsvc.project(params).then(function(projectedAOIs) {
                                    return projectedAOIs[0];
                                });

                            when(deferred2).then(lang.hitch(this, function(aoi) {
                                this.drawToolbarGraphic = null;
                                this.defineProduct(aoi);
                            }));
                        }));
                    }));

                    var cancelButton = new Button({
                        label: "Cancel"
                    }, "cancel_button_place");
                    cancelButton.startup();
                    cancelButton.on("click", function() {
                        Popup.close(pageSizeDialog);
                    });
                }

                Popup.open({
                    popup: pageSizeDialog,
                    x: event.x,
                    y: event.y
                });
            }
        });

        SelectionTool.symbols = {};
        SelectionTool.products = [];
        SelectionTool.selectCursor = "url(images/pan.cur),auto";

        return new SelectionTool();
    });
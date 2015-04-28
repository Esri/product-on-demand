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
        "dojo/_base/array",
        "dojo/_base/Color",
        "esri/symbols/Font",
        "esri/symbols/TextSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/graphic",
        "esri/geometry",
        "esri/geometry/Point",
        "esri/geometry/Polygon",
        "esri/geometry/Extent",
        "../podUtilities"
    ],
    function(declare, lang, array, Color, Font, TextSymbol, SimpleFillSymbol, SimpleLineSymbol,
        Graphic, Geometry, Point, Polygon, Extent) {

        var labelTextColor = new Color([0, 100, 100]);
        var productLabelsCount = {dataframe: 3, page: 2};
        
        var pageSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1),
            new Color([255, 255, 255, 0.7]));

        var dataFrameSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1),
            new Color([200, 100, 100, 0.5]));

        var dataFrameForMoveSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            null,
            new Color([0, 100, 0, 0.0]));

        var dataFrameMoveSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            null,
            new Color([200, 100, 100, 0.7]));

        var cornerSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1),
            new Color([255, 255, 255]));

        function distance(a, b) {
            return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        }

        function findAngle(a, b) {
            return Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x);
        }

        function rotatePoint(pnt, angle, center) {
            if (!center) {
                return pnt;
            }

            // Find the mid-point between A and B - i make a copy of pointA just to be safe
            var v = {
                x: pnt[0] - center.x,
                y: pnt[1] - center.y
            };

            var s = Math.sin(angle * Math.PI / 180);
            var c = Math.cos(angle * Math.PI / 180);

            var vx = c * v.x - s * v.y;
            var vy = s * v.x + c * v.y;

            v.x = vx + center.x;
            v.y = vy + center.y;

            return [v.x, v.y];
        }

        function rotateGeometry(g, angle, centroid) {

            if (g.type === "point") {
                var newPoint = rotatePoint([g.x, g.y], angle, centroid);
                g.update(newPoint[0], newPoint[1]);

            } else {
                for (var r in g.rings) {
                    for (var rr in g.rings[r]) {
                        g.setPoint(r, rr, new Point(rotatePoint(g.rings[r][rr], angle, centroid)));
                    }
                }
            }
        }

        function createTextSymbol () {
            var symbol = new TextSymbol();
            symbol.setColor(labelTextColor);
            symbol.setAlign(TextSymbol.ALIGN_MIDDLE);
            return symbol;
        }

        return declare("ProductPageExtent", null, {
            dataFrameGraphic: null,
            graphicElements: null,
            margin: null,
            productType: null,
            UID: null,
            offsets: null,
            podMap: null,
            parameters: null,
            constructor: function (product) {
                this.dataFrameGraphic = new Graphic();
                this.pageShown = false;
                this.graphicElements = {
                    page: new Graphic(),
                    corner: new Graphic(),
                    dataFrameClipped: new Graphic(),
                    labels: {
                        dataframe: [null, null, null],
                        page: [null, null]
                    },
                    formove: new Graphic()
                };

                for (var label in this.graphicElements.labels.dataframe){
                    this.graphicElements.labels.dataframe[label] = { symbol: createTextSymbol(), graphic: new Graphic };
                }
                for (var pageLabel in this.graphicElements.labels.page){
                    this.graphicElements.labels.page[pageLabel] = { symbol: createTextSymbol(), graphic: new Graphic };
                }

                this.offsets = {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0
                };

                this.parameters = {
                    scale: null,
                    pageSize: null,
                    margin: null
                };
                this.parameters.margin = PodUtilities.getPageMargin(product.getAttributeValue("pageMargin"));

                var productPageSizeOrient = product.getAttributeValue("orientation");
                this.parameters.pageSize = product.pageSize; //PageSize product
                if (!product.pageSize) {
                    var productPageSizeAttr = product.getAttribute("pageSize");
                    this.parameters.pageSize = PodUtilities.getPageSize(productPageSizeAttr, productPageSizeOrient);
                }

                this.textColor = new Color([0, 100, 100]);

                this.product = product;
            },

            setGeometry: function(initialGeometry) {
                var units = this.product.getAttributeValue("units");
                if (units === "") {
                    units = "METERS";
                    this.product.setAttributeValue("units", units);
                }
                var scale = this.product.getAttributeValue("scale");
                var width = this.product.getAttributeValue("width");
                var height = this.product.getAttributeValue("height");

                var marginTop = PodUtilities.convertUnits(this.parameters.margin.top, this.parameters.margin.units, units);
                var marginRight = PodUtilities.convertUnits(this.parameters.margin.right, this.parameters.margin.units, units);
                var marginBottom = PodUtilities.convertUnits(this.parameters.margin.bottom, this.parameters.margin.units, units);
                var marginLeft = PodUtilities.convertUnits(this.parameters.margin.left, this.parameters.margin.units, units);

                this.dataFrameGraphic.setSymbol(dataFrameSymbol);
                this.dataFrameGraphic.UID = this.product.uuid;
                this.dataFrameGraphic.setAttributes({
                    "type": "dataframe"
                });

                //page graphics
                this.graphicElements.page.setSymbol(pageSymbol);

                this.graphicElements.dataFrameClipped.setSymbol(dataFrameSymbol);
                this.graphicElements.dataFrameClipped.UID = this.product.uuid;

                this.graphicElements.corner.setSymbol(cornerSymbol);
                this.graphicElements.formove.UID = this.product.uuid;
                this.graphicElements.formove.setSymbol(dataFrameForMoveSymbol);

                this.dataFrameGraphic.setGeometry(initialGeometry);
                this.graphicElements.formove.setGeometry(initialGeometry);

                var rotParams = this.calculateRotationParams();
                this.product.angle = rotParams.angle;
                this.product.centroid = rotParams.centroid;
                this.product.setAttributeValue("angle", this.product.angle);

                this.parameters.rotatedExtent = rotParams.extent;
                var extent = this.parameters.rotatedExtent;
                if (extent.xmin == NaN)
                    alert("NaN");

                var extentWidth = extent.getWidth();
                var extentHeight = extent.getHeight();
                var offset = (extentWidth > extentHeight) ? extentHeight * 0.05 : extentWidth * 0.05;

                if (this.product.pageSize) {
                    this.parameters.pageSize.width = this.product.pageSize.width;
                    this.parameters.pageSize.height = this.product.pageSize.height;
                }

                var pageWidth = PodUtilities.convertUnits(this.parameters.pageSize.width, this.parameters.pageSize.units, units);
                var pageHeight = PodUtilities.convertUnits(this.parameters.pageSize.height, this.parameters.pageSize.units, units);

                var calculatedPageWidth = pageWidth;
                var calculatedPageHeight = pageHeight;
                if (this.product.calculatedPageSize !== undefined) {
                    var calculatedPageWidth = PodUtilities.convertUnits(this.product.calculatedPageSize.width, this.product.calculatedPageSize.units, units);
                    var calculatedPageHeight = PodUtilities.convertUnits(this.product.calculatedPageSize.height, this.product.calculatedPageSize.units, units);
                }

                var referenceScaleX = extentWidth / (calculatedPageWidth - marginLeft - marginRight);
                var referenceScaleY = extentHeight / (calculatedPageHeight - marginTop - marginBottom);
                var referenceScale = Math.max(referenceScaleX, referenceScaleY);

                if (!width) {
                    width = width = (calculatedPageWidth - marginLeft - marginRight) * scale;
                    this.product.setAttributeValue("width", width);
                }
                if (!height) {
                    height = (calculatedPageHeight - marginTop - marginBottom) * scale;                    
                    this.product.setAttributeValue("height", height);                
                }

                this.offsets.bottom = marginBottom * referenceScale;
                this.offsets.left = marginLeft * referenceScale;
                this.offsets.top = (pageHeight - marginBottom) * referenceScale - extentHeight;
                this.offsets.right = (pageWidth - marginLeft) * referenceScale - extentWidth;

                var units_short = units;
                switch (units.toLowerCase()) {
                    case "meters":
                        units_short = "m";
                        break;
                    case "kilometers":
                        units_short = "km";
                        break;
                    case "decimal degrees":
                        units_short = "degrees";
                        break;
                    default:
                        units_short = "inches"; //inches
                }

                this.createPageGraphics();

                // ground width label
                var text = Math.round(width) + " " + units_short;
                var point_x = (extent.xmin + extent.xmax) / 2;
                var point_y = extent.ymin + offset;
                var point = new Point(point_x, point_y, extent.spatialReference);
                rotateGeometry(point, this.product.angle, this.product.centroid);
                this.graphicElements.labels.dataframe[0].symbol.text = text;
                this.graphicElements.labels.dataframe[0].symbol.setAngle(-this.product.angle);
                this.graphicElements.labels.dataframe[0].graphic.setGeometry(point);

                // ground height label
                text = Math.round(height) + " " + units_short;
                point_x = extent.xmin + offset;
                point_y = (extent.ymin + extent.ymax) / 2;
                point = new Point(point_x, point_y, extent.spatialReference);
                rotateGeometry(point, this.product.angle, this.product.centroid);
                this.graphicElements.labels.dataframe[1].symbol.text = text;
                this.graphicElements.labels.dataframe[1].symbol.setAngle(90 - this.product.angle);
                this.graphicElements.labels.dataframe[1].graphic.setGeometry(point);

                //scale
                text = "Scale: " + Math.round(scale);
                point_x = (extent.xmin + extent.xmax) / 2;
                point_y = (extent.ymin + extent.ymax) / 2;
                point = new Point(point_x, point_y, extent.spatialReference);
                rotateGeometry(point, -this.product.angle, this.product.centroid);
                this.graphicElements.labels.dataframe[2].symbol.text = text;
                this.graphicElements.labels.dataframe[2].symbol.setAngle(-this.product.angle);
                this.graphicElements.labels.dataframe[2].graphic.setGeometry(point);

                // page width label
                text = Math.round(this.parameters.pageSize.width * 100) / 100 + " " + this.parameters.pageSize.units.toLowerCase();
                point_x = (extent.xmin - this.offsets.left + extent.xmax + this.offsets.right) / 2;
                point_y = extent.ymax + this.offsets.top + offset;
                point = new Point(point_x, point_y, extent.spatialReference);
                rotateGeometry(point, this.product.angle, this.product.centroid);
                this.graphicElements.labels.page[0].symbol.text = text;
                this.graphicElements.labels.page[0].symbol.setAngle(-this.product.angle);
                this.graphicElements.labels.page[0].graphic.setGeometry(point);

                // page height label
                text = Math.round(this.parameters.pageSize.height * 100) / 100 + " " + this.parameters.pageSize.units.toLowerCase();
                point_x = extent.xmax + this.offsets.right + offset;
                point_y = (extent.ymin - this.offsets.bottom + extent.ymax + this.offsets.top) / 2;
                point = new Point(point_x, point_y, extent.spatialReference);
                rotateGeometry(point, this.product.angle, this.product.centroid);
                this.graphicElements.labels.page[1].symbol.text = text;
                this.graphicElements.labels.page[1].symbol.setAngle(90 - this.product.angle);
                this.graphicElements.labels.page[1].graphic.setGeometry(point);


                this.show();
            },

            calculateRotationParams: function () {
                var lineAngle = this.dataFrameGraphic.geometry.angle == null ? 0 : this.dataFrameGraphic.geometry.angle;
                var dfPoints = this.dataFrameGraphic.geometry.rings[0];
                var c = this.dataFrameGraphic.geometry.getCentroid();
                if (dfPoints.length > 5) {
                    return {
                        extent: this.dataFrameGraphic.geometry.getExtent(),
                        angle: 0,
                        centroid: c
                    };
                }

                var x1 = dfPoints[1][0] - dfPoints[0][0];
                var y1 = dfPoints[1][1] - dfPoints[0][1];
                var angle = - 180 / Math.PI * findAngle({ x: 0, y: 1 }, { x: x1, y: y1 });

                if (this.dataFrameGraphic.geometry.angle != null) {
                    if (this.dataFrameGraphic.geometry.direction == null) {
                        angle = 90 - this.dataFrameGraphic.geometry.angle;
                    }
                    else {
                        angle += 90;
                        var trend = this.dataFrameGraphic.geometry.direction;
                        var trendAngle = -60;
                        switch (trend) {
                            case "WE_NS":
                                trendAngle = -120;
                                break;
                            case "EW_NS":
                                trendAngle = 120;
                                break;
                            case "EW_SN":
                                trendAngle = 60;
                                break;
                            default:
                                trendAngle = -60;
                                break;
                        }

                        if (angle < trendAngle)
                            angle += 360;

                        if (angle >= trendAngle + 360)
                            angle -= 360;

                        if (angle >= trendAngle + 180)
                            angle -= 180;
                    }
                }

                rotateGeometry(this.dataFrameGraphic.geometry, -angle, c);
                baseExtent = this.dataFrameGraphic.geometry.getExtent();
                rotateGeometry(this.dataFrameGraphic.geometry, angle, c);
                
                return {
                    extent: baseExtent,
                    angle: angle,
                    centroid: c
                };
            },

            createPageGraphics: function() {

                var extent = this.parameters.rotatedExtent;

                var cornerDim = 0.2;
                var pageWidth = extent.getWidth() + this.offsets.left + this.offsets.right;
                var pageHeight = extent.getHeight() + this.offsets.top + this.offsets.bottom;
                var cornerSize = cornerDim * ((pageHeight > pageWidth) ? pageWidth : pageHeight);
                var pageXmin = extent.xmin - this.offsets.left;
                var pageYmin = extent.ymin - this.offsets.bottom;
                var pageXmax = extent.xmax + this.offsets.right;
                var pageYmax = extent.ymax + this.offsets.top;

                //add dataFrameClipped
                var dataFrameClipped = this.dataFrameGraphic.geometry;
                if (extent.xmax > pageXmax - cornerSize && extent.ymax > pageYmax - cornerSize) {
                    dataFrameClipped = new Polygon(extent.spatialReference);
                    dataFrameClipped.addRing([
                        [extent.xmin, extent.ymin],
                        [extent.xmin, extent.ymax],
                        [pageXmax - cornerSize, extent.ymax],
                        [pageXmax - cornerSize, pageYmax - cornerSize],
                        [extent.xmax, pageYmax - cornerSize],
                        [extent.xmax, extent.ymin],
                        [extent.xmin, extent.ymin]
                    ]);
                    rotateGeometry(dataFrameClipped, this.product.angle, this.product.centroid);
                }
                this.graphicElements.dataFrameClipped.setGeometry(dataFrameClipped);

                // add page
                var pageGeometry = new Polygon(extent.spatialReference);
                pageGeometry.addRing([
                    [pageXmin, pageYmin],
                    [pageXmin, pageYmax],
                    [pageXmax - cornerSize, pageYmax],
                    [pageXmax, pageYmax - cornerSize],
                    [pageXmax, pageYmin],
                    [pageXmin, pageYmin]
                ]);
                rotateGeometry(pageGeometry, this.product.angle, this.product.centroid);
                pageGeometry.addRing(this.graphicElements.dataFrameClipped.geometry.rings[0]);
                this.graphicElements.page.setGeometry(pageGeometry);

                //add corner
                var cornerGeometry = new Polygon(extent.spatialReference);
                cornerGeometry.addRing([
                    [extent.xmax + this.offsets.right - cornerSize, extent.ymax + this.offsets.top],
                    [extent.xmax + this.offsets.right, extent.ymax + this.offsets.top - cornerSize],
                    [extent.xmax + this.offsets.right - cornerSize, extent.ymax + this.offsets.top - cornerSize],
                    [extent.xmax + this.offsets.right - cornerSize, extent.ymax + this.offsets.top]
                ]);
                rotateGeometry(cornerGeometry, this.product.angle, this.product.centroid);
                this.graphicElements.corner.setGeometry(cornerGeometry);
            },

            calculateFontSize: function(extent) {

                var line = {};
                line.min = this.podMap.map.toScreen(new Point(extent.xmin, extent.ymin, extent.spatialReference));
                if (extent.xmax - extent.xmin < extent.ymax - extent.ymin) {
                    line.max = this.podMap.map.toScreen(new Point(extent.xmax, extent.ymin, extent.spatialReference));
                } else {
                    line.max = this.podMap.map.toScreen(new Point(extent.xmin, extent.ymax, extent.spatialReference));
                }

                var dist = Math.sqrt(Math.pow(line.min.x - line.max.x, 2) + Math.pow(line.min.y - line.max.y, 2));
                if (dist < 50) {
                    return null;
                } else if (dist < 100) {
                    return "6pt";
                } else if (dist < 150) {
                    return "8pt";
                } else if (dist < 200) {
                    return "10pt";
                }

                return "12pt";
            },

            updateLabels: function() {
                //create label graphics
                function setSymbols(labelArray, elementArray, fontSize, textColor) {
                    if (!fontSize) {
                        textColor = new Color(0, 0, 0, 0);
                        fontSize = "1pt";
                    }

                    var textFont = new Font(fontSize, Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLD, "Arial");

                    for (var label in labelArray) {
                        labelArray[label].symbol.setFont(textFont);
                        labelArray[label].symbol.setColor(textColor);
                        labelArray[label].graphic.setSymbol(labelArray[label].symbol);
                    }
                }

                var fontSize = this.calculateFontSize(this.parameters.rotatedExtent);
                setSymbols(this.graphicElements.labels.dataframe, this.graphicElements.labels.dataframe, fontSize, this.textColor);
                fontSize = this.calculateFontSize(this.parameters.rotatedExtent);
                setSymbols(this.graphicElements.labels.page, this.graphicElements.labels.page, fontSize, this.textColor);

            },

            drawPage: function() {

                //add page 
                this.podMap.addGraphic(this.graphicElements.page);

                //add dataFrameClipped
                this.podMap.addGraphic(this.graphicElements.dataFrameClipped);

                //add corner
                this.podMap.addGraphic(this.graphicElements.corner);

                for (var label in this.graphicElements.labels.page) {
                    this.podMap.addGraphic(this.graphicElements.labels.page[label].graphic);
                }
            },

            drawGraphics: function() {

                this.podMap.addGraphic(this.dataFrameGraphic);

                this.drawPage();
                this.hidePage();

                //add labels
                for (var label in this.graphicElements.labels.dataframe) {
                    this.podMap.addGraphic(this.graphicElements.labels.dataframe[label].graphic);
                }
                this.podMap.addGraphic(this.graphicElements.formove);

            },

            addToMap: function() {
                this.updateLabels();
                this.drawGraphics();
            },

            resetMoveGraphic: function(){
                this.graphicElements.formove.setSymbol(dataFrameForMoveSymbol);
                this.podMap.removeGraphic(this.graphicElements.formove);
                this.podMap.addGraphic(this.graphicElements.formove);
            },

            putOnTop: function() {
                //this.removeFromMap();
                this.updateLabels();
                this.show();
                this.resetMoveGraphic();
            },

            removePageFromMap: function() {

                //remove page 
                this.podMap.removeGraphic(this.graphicElements.page);

                //remove dataFrameClipped 
                this.podMap.removeGraphic(this.graphicElements.dataFrameClipped);

                //remove corner
                this.podMap.removeGraphic(this.graphicElements.corner);

                for (var label in this.graphicElements.labels.page) {
                    this.podMap.removeGraphic(this.graphicElements.labels.page[label].graphic);
                }

            },

            removeFromMap: function() {
                //remove dataframe and its labels
                this.podMap.removeGraphic(this.dataFrameGraphic);

                //remove labels
                for (var label in this.graphicElements.labels.dataframe) {
                    this.podMap.removeGraphic(this.graphicElements.labels.dataframe[label].graphic);
                }

                this.podMap.removeGraphic(this.graphicElements.formove);

                this.removePageFromMap();
            },

            hide: function () {
                this.dataFrameGraphic.hide();
                for (var label in this.graphicElements.labels.dataframe) {
                    this.graphicElements.labels.dataframe[label].graphic.hide();
                }
            },

            getDataframe: function() {
                return this.dataFrameGraphic.geometry;
            },

            getMoveGraphic: function () {
                this.resetMoveGraphic();
                return this.graphicElements.formove;
            },

            setHighlighted: function(highlight) {
                this.graphicElements.dataFrameClipped.setSymbol(highlight ? dataFrameMoveSymbol : dataFrameSymbol);
                if (highlight) {
                    this.inside = false;
                    this.showPage();
                }
            },

            updateGraphics: function() {
                this.updateLabels();
            },

            move: function(finish) {
                if (finish === false) {
                    this.isMoving = false;
                    return;
                }

                this.isMoving = true;
                this.hidePage();
                this.hide();
                this.graphicElements.formove.show();
            },

            hidePage: function() {
                this.dataFrameGraphic.setSymbol(dataFrameSymbol);
                this.graphicElements.page.hide();
                this.graphicElements.dataFrameClipped.hide();
                this.graphicElements.corner.hide();
                for (var iTap in this.graphicElements.taps) {
                    this.graphicElements.taps[iTap].hide();
                }
                for (var label in this.graphicElements.labels.page) {
                    this.graphicElements.labels.page[label].graphic.hide();
                }

                this.dataFrameGraphic.show();

                if (!this.isMoving) {
                    this.pageShown = false;
                    this.resetMoveGraphic();
                }
            },

            showPage: function() {
                this.dataFrameGraphic.hide();
                this.graphicElements.page.show();
                this.graphicElements.dataFrameClipped.show();
                this.graphicElements.corner.show();
                for (var iTap in this.graphicElements.taps) {
                    this.graphicElements.taps[iTap].show();
                }
                for (var label in this.graphicElements.labels.page) {
                    this.graphicElements.labels.page[label].graphic.show();
                }

                this.pageShown = true;
                this.resetMoveGraphic();
            },

            show: function() {

                //show dataframe
                this.dataFrameGraphic.show();

                //show labels
                for (var label in this.graphicElements.labels.dataframe) {
                    this.graphicElements.labels.dataframe[label].graphic.show();
                }

                if (this.pageShown)
                    this.showPage();

                this.resetMoveGraphic();
                this.graphicElements.formove.show();
            },

            replace: function(geometry) {
                this.setGeometry(geometry, true);
                this.putOnTop();
            },

            contains: function(mapPoint) {

                this.isInside = this.dataFrameGraphic.geometry.contains(mapPoint);
                return this.isInside;
            }
        });
    });
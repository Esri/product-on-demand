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

        var pageSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1),
            new Color([255, 255, 255, 0.7]));

        var dataFrameSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1),
            new Color([200, 100, 100, 0.5]));

        var dataFrameMoveSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            null,
            new Color([200, 100, 100, 0.7]));

        var cornerSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1),
            new Color([255, 255, 255]));

        function distance(a, b) {
            return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        }

        function findAngle(A, B, C) {
            var AB = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
            var BC = Math.sqrt(Math.pow(B.x - C.x, 2) + Math.pow(B.y - C.y, 2));
            var AC = Math.sqrt(Math.pow(C.x - A.x, 2) + Math.pow(C.y - A.y, 2));
            return Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
        }

        function linesIntersection(a1, a2, b1, b2) {

            var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
            var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
            var u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

            if (u_b !== 0) {
                var ua = ua_t / u_b;
                var ub = ub_t / u_b;

                if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
                    return {
                        x: a1.x + ua * (a2.x - a1.x),
                        y: a1.y + ua * (a2.y - a1.y)
                    };
                }
            }
            return null;
        }

        function rotateRing(ring, angle, center) {
            if (!center) {
                return ring;
            }

            // Find the mid-point between A and B - i make a copy of pointA just to be safe
            var v = {
                x: ring[0] - center.x,
                y: ring[1] - center.y
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
                var newPoint = rotateRing([g.x, g.y], angle, centroid);
                g.update(newPoint[0], newPoint[1]);

            } else {
                var rotatedRings = [];
                for (var r in g.rings) {
                    var ring = [];
                    var k = g.isClockwise(g.rings[r]) ? -1 : 1;
                    for (var rr in g.rings[r]) {
                        ring.push(rotateRing(g.rings[r][rr], k * angle, centroid));
                    }
                    rotatedRings.push(ring);
                }

                g.rings = [];

                for (var nr in rotatedRings) {
                    g.addRing(rotatedRings[nr]);
                }
            }
        }

        function createTextSymbol (text, angle) {

            //var textFont = new Font("12pt", Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLD, "Arial");
            var textColor = new Color([0, 100, 100]);
            var textSymbol = new TextSymbol(text);
            textSymbol.setAngle(angle);
            textSymbol.setColor(textColor);
            textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
            return textSymbol;
        }

        return declare("ProductPageExtent", null, {
            dataFrameGraphic: null,
            graphicElements: null,
            margin: null,
            productType: null,
            UID: null,
            //scale: null,
            offsets: null,
            podMap: null,
            parameters: null,
            constructor: function(product) {
                this.graphicElements = {
                    page: null,
                    corner: null,
                    dataFrameClipped: null,
                    labels: {
                        dataframe: [],
                        page: []
                    }
                };
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

            setGeometry: function(initialGeometry, replace) {
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

                if (!replace) {
                    this.removeFromMap();
                    this.dataFrameGraphic = new Graphic();
                    this.dataFrameGraphic.setSymbol(dataFrameSymbol);
                    this.dataFrameGraphic.UID = this.product.uuid;
                    this.dataFrameGraphic.setAttributes({
                        "type": "dataframe"
                    });

                    this.graphicElements.page = new Graphic();
                    this.graphicElements.page.setSymbol(pageSymbol);

                    this.graphicElements.dataFrameClipped = new Graphic();
                    this.graphicElements.dataFrameClipped.setSymbol(dataFrameSymbol);

                    this.graphicElements.corner = new Graphic();
                    this.graphicElements.corner.setSymbol(cornerSymbol);
                }

                this.dataFrameGraphic.setGeometry(initialGeometry);

                var rotParams = this.calculateRotationParams();
                if (this.dataFrameGraphic.geometry.angle !== undefined) {
                    this.product.angle = 90 - this.dataFrameGraphic.geometry.angle;
                } else {
                    this.product.angle = -rotParams.angle * 180 / Math.PI;
                }
                this.product.centroid = rotParams.centroid;
                this.product.setAttributeValue("angle", this.product.angle);

                // rotate polygon to up-right position
                rotateGeometry(initialGeometry, this.product.angle, this.product.centroid);
                var extent = initialGeometry.getExtent();
                this.parameters.rotatedExtent = extent;

                // rotate polygon to its original position
                rotateGeometry(initialGeometry, -this.product.angle, this.product.centroid);

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
                var referenceScale = (referenceScaleX > referenceScaleY) ? referenceScaleX : referenceScaleY;

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

                // ground width label
                var text = Math.round(width) + " " + units_short;
                var point_x = (extent.xmin + extent.xmax) / 2;
                var point_y = extent.ymin + offset;
                var point = new Point(point_x, point_y, extent.spatialReference);
                rotateGeometry(point, this.product.angle, this.product.centroid);
                this.graphicElements.labels.dataframe.push({
                    textSymbol: createTextSymbol(text, -this.product.angle),
                    graphic: new Graphic(point)
                });

                // ground height label
                text = Math.round(height) + " " + units_short;
                point_x = extent.xmin + offset;
                point_y = (extent.ymin + extent.ymax) / 2;
                point = new Point(point_x, point_y, extent.spatialReference);
                rotateGeometry(point, this.product.angle, this.product.centroid);
                this.graphicElements.labels.dataframe.push({
                    textSymbol: createTextSymbol(text, 90 - this.product.angle),
                    graphic: new Graphic(point)
                });

                // page width label
                text = Math.round(this.parameters.pageSize.width * 100) / 100 + " " + this.parameters.pageSize.units.toLowerCase();
                point_x = (extent.xmin - this.offsets.left + extent.xmax + this.offsets.right) / 2;
                point_y = extent.ymax + this.offsets.top + offset;
                point = new Point(point_x, point_y, extent.spatialReference);
                rotateGeometry(point, this.product.angle, this.product.centroid);
                this.graphicElements.labels.page.push({
                    textSymbol: createTextSymbol(text, -this.product.angle),
                    graphic: new Graphic(point)
                });

                // page height label
                text = Math.round(this.parameters.pageSize.height * 100) / 100 + " " + this.parameters.pageSize.units.toLowerCase();
                point_x = extent.xmax + this.offsets.right + offset;
                point_y = (extent.ymin - this.offsets.bottom + extent.ymax + this.offsets.top) / 2;
                point = new Point(point_x, point_y, extent.spatialReference);
                rotateGeometry(point, this.product.angle, this.product.centroid);
                this.graphicElements.labels.page.push({
                    textSymbol: createTextSymbol(text, 90 - this.product.angle),
                    graphic: new Graphic(point)
                });

                text = "Scale: " + Math.round(scale);
                point_x = (extent.xmin + extent.xmax) / 2;
                point_y = (extent.ymin + extent.ymax) / 2;
                point = new Point(point_x, point_y, extent.spatialReference);
                rotateGeometry(point, this.product.angle, this.product.centroid);
                this.graphicElements.labels.dataframe.push({
                    textSymbol: createTextSymbol(text, -this.product.angle),
                    graphic: new Graphic(point)
                });

                this.createPageGraphics();
                this.show();
            },

            calculateRotationParams: function() {

                var dfRings = this.dataFrameGraphic.geometry.rings[0];
                var c = this.dataFrameGraphic.geometry.getCentroid();

                if (dfRings.length > 5) {
                    return {
                        extent: this.dataFrameGraphic.geometry.getExtent(),
                        angle: 0,
                        centroid: c
                    };
                }

                var dim = [];

                for (var i = 0; i < dfRings.length - 1; ++i) {
                    var d = distance({
                        x: dfRings[i][0],
                        y: dfRings[i][1]
                    }, {
                        x: dfRings[i + 1][0],
                        y: dfRings[i + 1][1]
                    });
                    dim.push(d);
                }
                var height = dim[0] > dim[2] ? dim[0] : dim[2];
                var width = dim[1] > dim[3] ? dim[1] : dim[3];

                var baseExtent = new Extent(c.x - width / 2, c.y - height / 2, c.x + width / 2, c.y + height / 2, this.dataFrameGraphic.geometry.spatialReference);
                var df = new Polygon(baseExtent.spatialReference);
                df.addRing([
                    [baseExtent.xmin, baseExtent.ymin],
                    [baseExtent.xmin, baseExtent.ymax],
                    [baseExtent.xmax, baseExtent.ymin],
                    [baseExtent.xmax, baseExtent.ymin],
                    [baseExtent.xmin, baseExtent.ymin]
                ]);

                var dot = linesIntersection({
                    x: dfRings[0][0],
                    y: dfRings[0][1]
                }, {
                    x: dfRings[1][0],
                    y: dfRings[1][1]
                }, {
                    x: df.rings[0][0][0],
                    y: df.rings[0][0][1]
                }, {
                    x: df.rings[0][1][0],
                    y: df.rings[0][1][1]
                });

                var angle = 0;
                if (dot) {
                    angle = findAngle({
                        x: df.rings[0][0][0],
                        y: df.rings[0][0][1]
                    }, dot, {
                        x: dfRings[0][0],
                        y: dfRings[0][1]
                    });
                }
                if (baseExtent.xmin < dfRings[0][0])
                    angle = -angle;
                return {
                    extent: this.dataFrameGraphic.geometry.getExtent(),
                    angle: angle,
                    centroid: c
                };
            },

            createPageGraphics: function() {

                rotateGeometry(this.dataFrameGraphic.geometry, this.product.angle, this.product.centroid);
                var extent = this.dataFrameGraphic.geometry.getExtent();
                rotateGeometry(this.dataFrameGraphic.geometry, -this.product.angle, this.product.centroid);

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
                    rotateGeometry(dataFrameClipped, -this.product.angle, this.product.centroid);
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
                rotateGeometry(pageGeometry, -this.product.angle, this.product.centroid);
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
                rotateGeometry(cornerGeometry, -this.product.angle, this.product.centroid);
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
                        labelArray[label].textSymbol.setFont(textFont);
                        labelArray[label].textSymbol.setColor(textColor);
                        labelArray[label].graphic.setSymbol(labelArray[label].textSymbol);
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

                this.drawPage();
                this.hidePage();

                //add labels
                for (var label in this.graphicElements.labels.dataframe) {
                    this.podMap.addGraphic(this.graphicElements.labels.dataframe[label].graphic);
                }

                this.podMap.addGraphic(this.dataFrameGraphic);
            },

            addToMap: function() {
                this.updateLabels();
                this.drawGraphics();
            },

            putOnTop: function() {
                this.removeFromMap();
                this.updateLabels();
                this.drawGraphics();
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

                this.removePageFromMap();
            },

            hide: function() {},

            getDataframe: function() {
                return this.dataFrameGraphic.geometry;
            },

            getMoveGraphic: function() {
                this.dataFrameGraphic.setSymbol(dataFrameMoveSymbol);
                return this.dataFrameGraphic;
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
                    this.dataFrameGraphic.setSymbol(dataFrameSymbol);
                    return;
                }

                this.isMoving = true;

                //remove data frame labels
                for (var label in this.graphicElements.labels.dataframe) {
                    this.podMap.removeGraphic(this.graphicElements.labels.dataframe[label].graphic);
                }
                this.graphicElements.labels.dataframe = [];

                //remove page labels
                for (label in this.graphicElements.labels.page) {
                    this.podMap.removeGraphic(this.graphicElements.labels.page[label].graphic);
                }
                this.graphicElements.labels.page = [];
            },

            hidePage: function() {
                this.dataFrameGraphic.show();
                this.graphicElements.page.hide();
                this.graphicElements.dataFrameClipped.hide();
                this.graphicElements.corner.hide();
                for (var iTap in this.graphicElements.taps) {
                    this.graphicElements.taps[iTap].hide();
                }
                for (var label in this.graphicElements.labels.page) {
                    this.graphicElements.labels.page[label].graphic.hide();
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
            },

            show: function() {
                this.isMoving = true;

                this.showPage();

                //show dataframe
                this.dataFrameGraphic.show();

                //show labels
                for (var label in this.graphicElements.labels.dataframe) {
                    this.graphicElements.labels.dataframe[label].graphic.show();
                }
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
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
    "dojo/_base/Color",
    "esri/symbols/Font",
    "esri/symbols/TextSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/geometry",
    "esri/graphic",
    "esri/map",
    "./podUtilities"
], function(declare, Color, Font, TextSymbol, SimpleLineSymbol, SimpleFillSymbol, Geometry, Graphic) {

    var coordinatesOrder = "latitude";

    var CoordinatesInformer = declare("CoordinatesInformer", null, {
        map: null,
        size: {
            height: 10,
            width: 30
        },
        color: new Color([100, 100, 100, 0.8]),
        font: new Font(
            "16px",
            Font.STYLE_NORMAL,
            Font.VARIANT_NORMAL,
            Font.WEIGHT_BOLD,
            "Helvetica"
        ),
        shadow: 0.5,
        coordinates: {
            area: null,
            text: ""
        },
        constructor: function(settings) {
            if (settings == null) {
                return;
            }

            this.map = settings.map;
            if (settings.font != null) {
                this.font = settings.font;
            }
            if (settings.color != null) {
                this.color = settings.color;
            }
            if (settings.size != null) {
                this.size = settings.size;
            }
            if (settings.shadow != null) {
                this.shadow = settings.shadow;
            }
        },

        getSymbol: function(mapPoint) {

            var coord = PodUtilities.toGeographic(mapPoint.x, mapPoint.y);

            var textLat = PodUtilities.toDegreeString(coord.lat, "latitude");
            var textLon = PodUtilities.toDegreeString(coord.lon);
            var text = coordinatesOrder == "latitude" ? textLat + textLon : textLon + textLat;

            var textSymbol = new TextSymbol(text, this.font, this.color);
            textSymbol.setOffset(50, 0);
            var shadowSymbol = new TextSymbol(text, this.font, new Color([0, 0, 0, this.shadow]));
            shadowSymbol.setOffset(49, -1);

            var pt0 = this.map.toScreen(Geometry.Point(this.map.extent.xmin, this.map.extent.ymin, this.map.extent.spatialReference));
            var leftUpper = new Geometry.Point(pt0);
            leftUpper.x += 5;
            leftUpper.y -= 8;

            var leftLower = new Geometry.Point(leftUpper);
            leftLower.y -= 20;

            var rightUpper = new Geometry.Point(leftUpper);
            rightUpper.x += text.length * 8 + 4;

            var rightLower = new Geometry.Point(rightUpper);
            rightLower.y -= 20;

            var mleftUpper = this.map.toMap(leftUpper);
            var mleftLower = this.map.toMap(leftLower);

            var mrightUpper = this.map.toMap(rightUpper);
            var mrightLower = this.map.toMap(rightLower);

            var points = [
                mleftUpper,
                mrightUpper,
                mrightLower,
                mleftLower
            ];

            var poly = new Geometry.Polygon(this.map.spatialReference);
            poly.addRing(points);
            var area = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([250, 250, 250, 0.5]), 1),
                new Color([250, 250, 250, 0.7]));


            pt0 = new Geometry.Point(leftUpper);
            pt0.x += (rightUpper.x - leftUpper.x) / 2 - 50;
            pt0.y += (leftLower.y - leftUpper.y) / 2 + 6;

            var pt = this.map.toMap(pt0);

            this.coordinates.area = new Graphic(poly, area);
            this.coordinates.text = new Graphic(pt, textSymbol);
        },
        hide: function() {

            if (this.map.graphics == null) {
                return;
            }
            if (this.coordinates.area != null) {
                this.map.graphics.remove(this.coordinates.area);
            }
            if (this.coordinates.text != null) {
                this.map.graphics.remove(this.coordinates.text);
            }
        },
        show: function() {

            if (this.map.graphics == null) {
                return;
            }

            if (this.coordinates.area != null) {
                this.map.graphics.add(this.coordinates.area);
            }
            if (this.coordinates.text != null) {
                this.map.graphics.add(this.coordinates.text);
            }
        },
        update: function(mapPoint) {
            this.hide();
            this.getSymbol(mapPoint);
            this.show();

        }

    });

    CoordinatesInformer.setOrder = function(order) {
        if (order !== "latitude" && order != "longitude") {
            return;
        }

        coordinatesOrder = order;
    };

    return CoordinatesInformer;

});
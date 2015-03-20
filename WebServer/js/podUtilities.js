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
    "dojo/_base/declare"
], function(declare) {

    declare("PodUtilities", null, {});

    PodUtilities.generateUUID = function() {
        var d = new Date().getTime();
        var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
            var r = Math.floor((d + Math.random() * 16) % 16);
            d = Math.floor(d / 16);
            return (c == "x" ? r : Math.floor(r % 8 + 8)).toString(16);
        });
        return uuid;
    };

    PodUtilities.trim = function(str) {
        str = str.toString();
        var begin = 0;
        var end = str.length - 1;
        while (begin <= end && str.charCodeAt(begin) < 33) {
            ++begin;
        }
        while (end > begin && str.charCodeAt(end) < 33) {
            --end;
        }
        return str.substr(begin, end - begin + 1);
    };

    PodUtilities.toGeographic = function(x, y) {
        var coord = {
            lat: 0.0,
            lon: 0.0
        };
        var lon0 = x / 6378137.0;
        var lon1 = lon0 * 57.295779513082323;
        var lon2 = Math.floor((lon1 + 180.0) / 360.0);
        coord.lon = lon1 - (lon2 * 360.0);
        var lat0 = 1.5707963267948966 - (2.0 * Math.atan(Math.exp((-1.0 * y) / 6378137.0)));
        coord.lat = lat0 * 57.295779513082323;
        return coord;
    };

    PodUtilities.toDegreeString = function(m, ws) {

        var suf;
        if (ws == "latitude") {
            if (m < 0) {
                suf = "S";
            } else {
                suf = "N";
            }

        } else {
            if (m < 0) {
                suf = "W";
            } else {
                suf = "E";
            }
        }

        m = Math.abs(m);

        var Deg = Math.floor(m);
        var sDeg = Deg.toString();
        if (Deg < 10) {
            sDeg = "0" + sDeg;
        }
        var dMin = (m - Deg) * 60;
        var Min = Math.floor(dMin);
        var sMin = Min.toString();
        if (Min < 10) {
            sMin = "0" + sMin;
        }
        var Sec = Math.floor((dMin - Min) * 60);
        var sSec = Sec.toString();
        if (Sec < 10) {
            sSec = "0" + sSec;
        }
        return sDeg + "\xB0" + sMin + "\u2032" + sSec + "\u2033" + suf + " ";
    };

    PodUtilities.makeErrorMessage = function(results) {

        var msg = results.name + ": " + results.message + "\n";
        if (results.description != null) {
            msg += results.description + "\n";
        }
        if (results.details != null) {
            for (var i = 0; i < results.details.length; i++) {
                msg += "\n" + results.details[i];
            }
        }

        return msg;
    };

    PodUtilities.convertUnits = function(value, fromUnits, toUnits) {

        if (value === 0) {
            return value;
        }

        var from = fromUnits.toUpperCase();
        var to = toUnits.toUpperCase();

        if (from === to) {
            return value;
        }

        // Conversion factor from inches to meters
        var baseFactor = 0.03937;

        // Input unit to inches
        var factor = baseFactor;
        switch (from) {
            case "INCHES":
                factor = 1;
                break;
            case "CENTIMETERS":
                factor = baseFactor * 10;
                break;
            case "POINTS":
                factor = 1 / 72.0;
                break;
            default:
                console.log("unsupported units conversion <fromUnits>:" + fromUnits);
                break;
        }

        var returnValue = value * factor;

        // Inches to output units
        switch (to) {
            case "INCHES":
                factor = 1;
                break;
            case "CENTIMETERS":
                factor = 1 / (baseFactor * 10);
                break;
            case "METERS":
                factor = 1 / (baseFactor * 1000);
                break;
            case "POINTS":
                factor = 72.0;
                break;
            default:
                console.log("unsupported units conversion <toUnits>:" + toUnits);
                break;
        }

        return returnValue * factor;
    };

    PodUtilities.getPageSize = function(pageSize, orientation) {

        // pageSize example {value: "LETTER", DisplayName: "LETTER", Tooltip: "Letter (8.5in x 11in)"}
        //                  {value: "32 44 CENTIMETERS", width: 32, height: 44, units: "CENTIMETERS", displayName: "Custom Size 32*44 cm", tooltip: "Custom Size 32*44 cm"}
        var stdPageSizes = {
            "LETTER": "8.5x11",
            "LEGAL": "8.5x14",
            "TABLOID": "11x17",
            "A5": "5.83x8.27",
            "A4": "8.27x11.69",
            "A3": "11.69x16.54",
            "A2": "16.54x23.39",
            "A1": "23.39x33.11",
            "A0": "33.11x46.8",
            "C": "17x22",
            "D": "22x34",
            "E": "34x44"
        };

        var value = pageSize.value.toUpperCase();
        var size, width, height, units;
        if (stdPageSizes[value]) {
            size = stdPageSizes[value].split("x");
            width = parseFloat(size[0]);
            height = parseFloat(size[1]);
            units = "INCHES";
            if (orientation.toUpperCase() === "LANDSCAPE") {
                width = parseFloat(size[1]);
                height = parseFloat(size[0]);
            }
        } else {
            size = value.split(" ");
            width = size[0];
            height = size[1];
            units = size[2];
            if ((orientation.toUpperCase() === "LANDSCAPE" && width < height) || 
                (orientation.toUpperCase() === "PORTRAIT" && width > height)) {
                var flip = width;
                width = height;
                height = flip;
            }
        }

        return {
            "width": width,
            "height": height,
            "units": units
        };
    };

    PodUtilities.getPageMargin = function(margin_size) {

        var units;
        if (typeof margin_size !== "string") {
            console.log("Invalid parameter: margin_size should be a string");
        }

        var margin = margin_size.split(" ");
        var length = margin.length;
        if (length > 5) {
            console.log("Invalid parameter: margin_size must has less than 5 values defined");
        }

        if (isNaN(parseFloat(margin[length - 1]))) {
            units = margin[length - 1].toUpperCase();
        }
        margin_size = [];
        for (var i = 0; i < 4; i++) {
            try {
                margin_size.push(parseFloat(margin[i]));
            } catch (ex) {
                continue;
            }
        }

        if (units != "INCHES" && units != "MILLIMETERS" && units != "CENTIMETERS" && units != "POINTS") {
            units = "INCHES";
        }

        var top, right, bottom, left;
        top = right = bottom = left = 0;
        if (length == 1) {
            top = right = bottom = left = margin_size[0];
        } else if (length == 2) {
            top = bottom = margin_size[0];
            right = left = margin_size[1];
        } else if (length == 3) {
            top = margin_size[0];
            right = margin_size[1];
            bottom = margin_size[2];
            left = right;
        } else {
            top = margin_size[0];
            right = margin_size[1];
            bottom = margin_size[2];
            left = margin_size[3];
        }

        var pageMargin = {
            top: top,
            right: right,
            bottom: bottom,
            left: left,
            units: units
        };

        return pageMargin;
    };

    PodUtilities.validateNumber = function (event) {

        var theEvent = event || window.event;
        var keyCode = event.keyCode || event.charOrCode;
        if (keyCode === 37 || keyCode === 39 || keyCode === 46 || keyCode === 8 || keyCode == 9) {
            return;
        }

        var key = String.fromCharCode(keyCode);
        var regex = /[0-9]|\./;
        if (!regex.test(key)) {
            if (theEvent.preventDefault) {
                theEvent.preventDefault();
            }
        }
    };

    if (!String.prototype.format) {
    	String.prototype.format = function () {
    		var args = arguments;
    		return this.replace(/{(\d+)}/g, function (match, number) {
    			return typeof args[number] != 'undefined'
				  ? args[number]
				  : match
    			;
    		});
    	};
    }

});
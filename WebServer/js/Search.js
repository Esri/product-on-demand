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
    "dojo/_base/array",
    "dojo/string",
    "dojo/_base/Color",
    "dojo/dom",
    "dojo/on",
    "dojo/dom-style", 
    "dojo/dom-class",   
    "dojo/i18n!./nls/podi18n",
    "dijit/TooltipDialog",
    "dijit/popup",
    "esri/geometry",
    "esri/graphic",
    "esri/SpatialReference",
    "esri/InfoTemplate",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/Font",
    "esri/symbols/TextSymbol",
    "esri/tasks/FindTask",
    "esri/tasks/FindParameters",
    "esri/tasks/locator",
    "./SelectionTool",
    "./ConfigurationManager",
    "./Product/ProductFactory",
    "./CoordsInformer",
    "./podUtilities"
], function(declare, array, string, Color, dom, on, domStyle, domClass, i18n, 
    TooltipDialog, popup, Geometry, Graphic, SpatialReference, InfoTemplate,
    SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Font, TextSymbol,
    FindTask, FindParameters, Locator, SelectionTool, cfgManager) {

    var locator;
    var start = 0;
    var numResults = 10; // number of each type of result shown (geocoding and map services)
    var tooltipListWidth = 250;
    var searchedLocation = null;
    var locatePerformed = false;
    var keyString = "POD_DYNAMIC_LAYER";


    declare("SearchTool", null, {});

    var SearchData = {
        graphics: {
            area: null,
            label: null
        },
        results: [],
        startIndex: 0,
        selectedSearchItem: {
            id: "",
            symbol: null,
            label: null
        },
        taskCount: 0,
        placeholder: i18n.search.searchHint,
        map: null
    };

    var hideSearchList = function() {
        popup.close(searchTooltipDialog);
    };


    function searchTextChangeHandler() {
        var searchText = dom.byId("searchText");
        if (searchText.disabled === false) {
            return;
        }

        hideSearchList();
    }

    // Finds features based on input string from map services
    function findFeatures() {
        if (SearchData.taskCount !== 0) {
            return;
        }
        locatePerformed = false;
        removeSearchResult(false);
        searchTooltipDialog.currentItem = 0;
        searchTooltipDialog.currentPage = 0;

        hideSearchList();
        var findResults = dom.byId("findResults");
        domStyle.set(findResults, "cursor", "wait");
        var searchText = dom.byId("searchText");
        domStyle.set(searchText, "cursor", "wait");
        searchText.disabled = true;
        findResults.disabled = true;

        var searchWhat = searchText.value;

        // Create find task with url to map service (visible extent layer)
        var extentLayerDomains = cfgManager.getTableProperties("extentLayer", "domain");
        var extentLayerDomain = cfgManager.getTable(extentLayerDomains);
        for (var iLayer in extentLayerDomain) {
            var layer = extentLayerDomain[iLayer];
            var mapLayer = SearchData.map.getLayer(layer.value);
            if (mapLayer == null) {
                continue;
            }

            SearchData.taskCount = SearchData.taskCount + 1;
            var findTask = new FindTask(layer.url);
            findTask.executeLastResult = null;

            // Create find parameters and define known values
            var findParams = new FindParameters();
            findParams.contains = true;
            findParams.returnGeometry = true;
            findParams.layerIds = [0];
            findParams.searchFields = [layer.data0];

            // Set the search text to find parameters
            findParams.searchText = searchWhat; // Text entered in search bar
            findParams.extLayer = layer.value;
            findTask.execute(findParams,
                function(results) {
                    array.forEach(results, function(result) {
                        var item = result.value;
                        if (SearchData.results.fixed[item] == null) {
                            SearchData.results.fixed[item] = {
                                type: "Fixed",
                                layer: findParams.extLayer,
                                geometry: result.feature.geometry,
                                graphic: null,
                                label: item
                            };
                        }
                    });

                    SearchData.taskCount = SearchData.taskCount - 1;
                    if (SearchData.taskCount === 0) {
                        locate(searchWhat);
                    }
                },
                function() {
                    SearchData.taskCount = SearchData.taskCount - 1;
                    if (SearchData.taskCount === 0) {
                        locate(searchWhat);
                    }
                });
        }

        if (SearchData.taskCount === 0) {
            locate(searchWhat);
        }
    }

    SearchTool.initializeSearch = function(podMap) {

        SearchData.map = podMap.map;
        locator = new Locator(cfgManager.getApplicationSetting("geocodeServiceUrl"));
        on(dom.byId("findResults"), "click", function() {
            start = 0;
            findFeatures();
        });
        on(dom.byId("searchText"), "keydown", function(event) {

            if (event.keyCode === 13) {
                findFeatures();
            }

            var displayRemover = "block";
            if (this.value === "" && SearchData.graphics.area === null) {
                displayRemover = "none";
            }

            domStyle.set(dom.byId("removeResult"), "display", displayRemover);

        });

        on(dom.byId("removeResult"), "click", removeSearchResult);
        on(dom.byId("searchText"), "keyup", searchTextChangeHandler);
        on(dom.byId("searchText"), "activate", function() {
            SelectionTool.getInstance().selectTool(podMap);
        });

        searchTooltipDialog = new TooltipDialog({
            id: "searchTooltipDialog",
            style: "width: " + tooltipListWidth + "px;",
            tabindex: 2,
            currentItem: 0,
            currentPage: 0,
            inProcess: false,
            onFocus: function() {
                this.selectResultItem("div" + this.currentItem + this.currentPage * numResults);
            },
            onKeyDown: function(event) {
                var keyCode = event.keyCode;
                var item = null;

                if (keyCode == 9) {
                    if (event.preventDefault != null) {
                        event.preventDefault();
                    }

                    return;
                }

                var pageItem, page, countOnLastPage, resultCount, resultIndex;
                switch (keyCode) {
                    case 27: //escape
                        dom.byId("searchText").focus();
                        setTimeout(hideSearchList, 100);
                        event.returnValue = false;
                        break;
                    case 13: // enter
                        this.inProcess = true;
                        var id = this.getResultID();

                        showSelectedResult(id);
                        break;

                    case 37: // arrow left
                    case 33: // page up
                        // previous page
                        page = this.currentPage;
                        updateResultsPage(false);
                        item = this.currentItem + this.currentPage * numResults;
                        if (page == this.currentPage && item > 0) {
                            item = 0;
                        }

                        event.returnValue = false;
                        break;

                    case 38: // arrow up
                        //previous item
                        pageItem = this.currentItem - 1;
                        page = this.currentPage;
                        if (pageItem == -1) {
                            updateResultsPage(false);
                            if (page != this.currentPage) {
                                pageItem = numResults - 1;
                            } else {
                                pageItem = 0;
                            }
                        }

                        item = pageItem + this.currentPage * numResults;
                        break;

                    case 39: // arrow right
                    case 34: // page down
                        //next page
                        page = this.currentPage;
                        updateResultsPage(true);


                        pageItem = this.currentItem;
                        resultIndex = this.currentPage * numResults + pageItem;
                        resultCount = Object.keys(SearchData.results.interleaved).length;

                        countOnLastPage = resultCount % numResults;
                        if (countOnLastPage === 0 && resultCount !== 0) {
                            countOnLastPage = numResults;
                        }

                        if (pageItem > countOnLastPage - 1) {
                            pageItem = countOnLastPage - 1;
                        }

                        item = pageItem + this.currentPage * numResults;
                        var isLastPage = resultCount - resultIndex <= numResults;

                        if (!isLastPage) {
                            break;
                        }

                        if (page == this.currentPage) {
                            item = countOnLastPage - 1 + this.currentPage * numResults;
                        }

                        break;

                    case 40: // arrow down
                        // next item
                        pageItem = this.currentItem + 1;
                        page = this.currentPage;
                        countOnLastPage = getLastPageCount();
                        if (countOnLastPage === 0 && resultCount !== 0)
                            countOnLastPage = numResults;

                        if (pageItem == numResults) {
                            updateResultsPage(true);

                            if (page == this.currentPage) {

                                if (pageItem > countOnLastPage - 1) {
                                    pageItem = countOnLastPage - 1;
                                }
                            } else {
                                pageItem = 0;
                            }
                        }

                        item = pageItem + this.currentPage * numResults;
                        break;

                    case 36: // home
                        this.currentItem = 0;
                        this.currentPage = 0;
                        SearchData.startIndex = 0;
                        item = 0;
                        createResultsContent();
                        break;
                    case 35: // end
                        resultCount = Object.keys(SearchData.results.interleaved).length;

                        countOnLastPage = resultCount % numResults;
                        if (countOnLastPage === 0 && resultCount !== 0)
                            countOnLastPage = numResults;

                        this.currentItem = countOnLastPage - 1;
                        this.currentPage = Math.floor(resultCount / numResults);

                        SearchData.startIndex = resultCount - countOnLastPage;
                        createResultsContent();
                        item = resultCount - 1;
                        break;
                }

                if (item !== null) {
                    this.selectResultItem("div" + item);
                }
            },

            onClickItem: function(numId) {
                this.selectResultItem("div" + numId);
                var id = this.getResultID();
                showSelectedResult(id);
            },

            selectResultItem: function(id) {

                var currentDiv = dom.byId("div" + (this.currentItem + this.currentPage * numResults));
                if (currentDiv != null) {
                    domClass.remove(currentDiv, "searchResultListSelected");
                }

                var num = parseInt(id.substring(3), 10);
                this.currentPage = Math.floor(num / numResults);
                this.currentItem = num % numResults;
                var item = dom.byId(id);
                if (item != null) {
                    domClass.toggle(item, "searchResultListSelected");
                }
            },

            getResultID: function() {
                var showItem = this.currentItem + this.currentPage * numResults;
                var results = Object.keys(SearchData.results.interleaved);
                return results[showItem];
            }

        });

        var searchText = dom.byId("searchText");
        setPlaceHolder(searchText);
    };

    SearchTool.failedCalculateExtent = function() {

        SearchData.map.setMapCursor(SelectionTool.selectCursor);
        setSearchMapExtent(SearchData.map, SearchData.graphics.area.geometry, 5);
    };

    // Draw the selected search result obtained from the GP service
    SearchTool.drawSelectedSearchResultsArea = function(results) {

        SearchData.map.setMapCursor("wait");

        if (results[0].paramName != "out_extent") {
            alert(string.substitute(i18n.search.unexpectedResponse, {
                paramName: results[0].paramName
            }));
            return;
        }

        var polygon;
        if (results[0].dataType == "GPFeatureRecordSetLayer" && results[0].value.features.length !== 0) {
            polygon = results[0].value.features[0].geometry;
        } else {
            polygon = new Geometry.Polygon(results[0].value.spatialReference);
            polygon.rings = results[0].value.rings;
        }

        setSearchMapExtent(SearchData.map, polygon, 5);
    };

    function getLastPageCount() {
        var resultCount = Object.keys(SearchData.results.interleaved).length;

        var countOnLastPage = resultCount % numResults;
        if (countOnLastPage === 0 && resultCount !== 0) {
            countOnLastPage = numResults;
        }
        return countOnLastPage;
    }

    function setPlaceHolder(searchText) {
        if (searchText.placeholder != null) {
            searchText.placeholder = SearchData.placeholder;
        }
        else { // for old versions of IE
            if (!domClass.contains(searchText, "searchText")){
                domClass.add(searchText, "searchText");
            }
            searchText.value = SearchData.placeholder;
            domClass.remove(searchText, "searchTextFocused");
            on(searchText, "focus", function() {
                if (this.value == SearchData.placeholder) {
                    this.value = "";
                    domClass.add(this, "searchTextFocused");
                    this.onfocus = "";
                }
            });
        }
    }


    // Gets results from geocode service and adds to results table
    function getGeocodeResults(results) {

        var symbol = new SimpleMarkerSymbol();
        var infoTemplate = new InfoTemplate(
            "Location",
            "Address: ${address}<br />Score: ${score}<br />Source locator: ${locatorName}"
        );

        symbol.setStyle(SimpleMarkerSymbol.STYLE_CIRCLE, 100);
        symbol.setColor(new Color([0, 0, 0, 0.5]));

        array.forEach(results, function(result) {
            var attributes = {
                address: result.address,
                score: result.score,
                locatorName: result.attributes.Loc_name
            };
            var graphic = new Graphic(result.location, symbol, attributes, infoTemplate); // add a graphic to the map at the geocoded location
            var item = result.address;
            if (SearchData.results.geocoding[item] == null) {
                SearchData.results.geocoding[item] = {
                    type: "Geocode",
                    geometry: result.location,
                    graphic: graphic,
                    label: attributes.address
                };
            }
        });

        SearchData.taskCount = SearchData.taskCount - 1;
        if (SearchData.taskCount === 0) {
            createResultsContent();
        }
    }

    function getReverseGeocodeResults(evt) {

        var symbol = new SimpleMarkerSymbol();

        symbol.setStyle(SimpleMarkerSymbol.STYLE_CIRCLE, 100);
        symbol.setColor(new Color([0, 0, 0, 0.5]));

        var item = PodUtilities.trim(dom.byId("searchText").value);
        var label;
        var attributes;
        var geometry;
        if (evt != null) {
            label = evt.address.City;

            if (label !== "") {
                label += ", ";
            }
            label += evt.address.CountryCode;

            attributes = {
                address: evt.address,
                score: evt.score
            };

            geometry = evt.location;
        } else {
            label = item;
            geometry = searchedLocation;
        }

        if (geometry.x == null || geometry.y == null) {
            geometry = searchedLocation;
        }

        if (geometry != null) {
            var graphic = new Graphic(geometry, symbol, attributes); // add a graphic to the map at the geocoded location

            if (item !== "" && SearchData.results.rgeocoding[item] == null) {
                SearchData.results.rgeocoding[item] = {
                    type: "ReverseGeocode",
                    geometry: geometry,
                    graphic: graphic,
                    label: label
                };
            }
        }

        SearchData.taskCount = SearchData.taskCount - 1;
        if (SearchData.taskCount === 0) {
            createResultsContent();
        }
    }

    function mergeResults() {
        var geocodeResults = SearchData.results.geocoding;
        var rgKeys = Object.keys(SearchData.results.rgeocoding);
        if (rgKeys.length > 0) {
            for (var i = 0; i < rgKeys.length; ++i) {
                geocodeResults[rgKeys[i]] = SearchData.results.rgeocoding[rgKeys[i]];
            }
        }

        SearchData.results.interleaved = [];
        var gcKeys = Object.keys(geocodeResults);
        if (gcKeys.length === 0) {
            return;
        }
        var fKeys = Object.keys(SearchData.results.fixed);
        var insertNum = numResults / 2;
        var insertIndex = insertNum;
        var insertedGeocodeIndex = 0;
        for (var ind = 0; ind < fKeys.length; ++ind) {
            if (ind == insertIndex) {
                // add geocodeResults
                var lim = insertedGeocodeIndex + insertNum;
                var inserted = 0;
                for (var gi = insertedGeocodeIndex; gi < lim; ++gi, insertedGeocodeIndex++) {
                    if (gi < gcKeys.length) {
                        SearchData.results.interleaved[gcKeys[gi]] = geocodeResults[gcKeys[gi]];
                        inserted++;
                    }
                }

                insertIndex += numResults - inserted;
            }

            SearchData.results.interleaved[fKeys[ind] + keyString + SearchData.results.fixed[fKeys[ind]].layer] = SearchData.results.fixed[fKeys[ind]];
        }

        for (var rem = insertedGeocodeIndex; rem < gcKeys.length; ++rem) {
            SearchData.results.interleaved[gcKeys[rem]] = geocodeResults[gcKeys[rem]];
        }
    }

    function createResultsContent() {
        var findResults = dom.byId("findResults");
        domStyle.set(findResults, "cursor", "");

        var searchText = dom.byId("searchText");
        domStyle.set(searchText, "cursor", "");
        searchText.disabled = false;
        findResults.disabled = false;

        mergeResults();
        var results = Object.keys(SearchData.results.interleaved);

        var resultCount = results.length;

        if (resultCount == 1) {

            showSelectedResult(results[0]);
            return;
        } else if (resultCount === 0) {
            alert(i18n.search.noItemFound);
            return;
        }

        var content = "<span class='searchToolHeader' >" + resultCount + " items found</span>";
        content += "<div>";
        var count = 0;
        var iRes = SearchData.startIndex;
        for (; iRes < SearchData.startIndex + numResults && iRes < resultCount; ++iRes, count++) {
            if (results[iRes] == null) {
                continue;
            }

            content += "<div id='div" + iRes + "' onClick='searchTooltipDialog.onClickItem(" + iRes + ")'>";

            if (resultCount > numResults) {
                content += "<label class='searchToolLine' >" + (iRes + 1) + ".</label>";
            }
            var res = SearchData.results.interleaved[results[iRes]];
            if (res == null) {
                continue;
            }

            var type = res.type;
            if (type == "Fixed") {
                content += "<img src='images/mapService-result.png' class='searchIcon' />";
            }
            else if (type == "Geocode") {
                content += "<img src='images/geocode-result.png' class='searchIcon' />";
            }
            else {
                content += "<img src='images/geocode-reverse-result.png' class='searchIcon' />";
            }

            var resLabel = results[iRes];
            var rlIdx = resLabel.indexOf(keyString);
            if (rlIdx != -1) {
                resLabel = resLabel.substr(0, rlIdx);
            }
            content += "<label id='result" + (iRes) + "' class='searchToolItem' >" + resLabel + " </label></div>";
        }

        var btm = "";
        if (resultCount > numResults) {
            btm += "<div >";

            var mrgn = tooltipListWidth - 70;
            if (SearchData.startIndex >= numResults) {
                btm += "<a href='#' class='searchToolFooter' id='prevItemsLink' title='Previous results' style='visibility:visible;' onClick='updateResultsPage(false)' >&lsaquo;&lsaquo;Previous</a>";
                mrgn -= 65;
            }

            if (results.length - SearchData.startIndex > numResults) {
                btm += "<a href='#' class='searchToolFooter' id='nextItemsLink' style='margin-left:" + mrgn + "px;' title='Next results' style='visibility:visible;' onClick='updateResultsPage(true)' >Next&rsaquo;&rsaquo;</a>";
            }

            btm += "</div>";
        }

        content += btm;
        content += "</div>";

        searchTooltipDialog.attr("content", content);

        popup.open({
            popup: searchTooltipDialog,
            around: dom.byId("searchText")
        });

        searchTooltipDialog.focus();
    }

    updateResultsPage = function(next) {
        if (searchTooltipDialog.inProcess === true) {
            searchTooltipDialog.inProcess = false;
            return;
        }

        var mlt = next ? 1 : -1;
        var dirNode = dom.byId(next ? "nextItemsLink" : "prevItemsLink");
        if (dirNode == null) {
            return;
        }
        searchTooltipDialog.currentPage = searchTooltipDialog.currentPage + mlt;
        SearchData.startIndex += numResults * mlt;
        if (SearchData.startIndex < 0) {
            SearchData.startIndex = 0;
        }
        hideSearchList();
        createResultsContent();
    };

    function showSelectedResult(id) {
        if (SearchData.graphics.area != null) {
            SearchData.map.graphics.remove(SearchData.graphics.area);
            SearchData.graphics.area = null;
        }
        if (SearchData.graphics.label != null) {
            SearchData.map.graphics.remove(SearchData.graphics.label);
            SearchData.graphics.label = null;
        }

        id = PodUtilities.trim(id);

        var smbl = new SimpleFillSymbol(SimpleFillSymbol.STYLE_NONE, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([0, 0, 0]), 2), new Color([0, 0, 0, 0.25]));
        var font = new Font(
            "16pt",
            Font.STYLE_NORMAL,
            Font.VARIANT_NORMAL,
            Font.WEIGHT_BOLD,
            "Helvetica"
        );
        var results = SearchData.results.interleaved;
        if (results[id] == null) {
            return;
        }
        var textSymbol = new TextSymbol(results[id].label, font, new Color("#666633"));
        textSymbol.setOffset(0, 8);

        SearchData.selectedSearchItem = {
            type: results[id].type,
            id: id,
            symbol: smbl,
            label: textSymbol
        };

        dom.byId("searchText").value = results[id].label;

        var searchGeometry = results[id].geometry;

        var centerPoint;
        if (searchGeometry.type == "point") {
            centerPoint = searchGeometry;
        } else {
            centerPoint = searchGeometry.getExtent().getCenter();
        }
        SearchData.graphics.label = new Graphic(centerPoint, SearchData.selectedSearchItem.label);
        SearchData.map.graphics.add(SearchData.graphics.label);

        if (results[id].type == "Fixed") {
            SearchData.graphics.area = new Graphic(searchGeometry, SearchData.selectedSearchItem.symbol);
            setSearchMapExtent(SearchData.map, searchGeometry, 5);
        } else {
            SearchData.graphics.area = results[id].graphic;
            if (ProductFactory.product === null) {
                setSearchMapExtent(SearchData.map, SearchData.graphics.area.geometry, 5);
            } else {
                var selectionTool = SelectionTool.getInstance();
                selectionTool.defineProductOnMap(results[id].geometry, SearchTool.drawSelectedSearchResultsArea, SearchTool.failedCalculateExtent);
            }
        }

        SearchData.map.graphics.add(SearchData.graphics.area);

    }

    // Finds locations using geocode service
    function locate(searchWhat) {
        if (locatePerformed) {
            return;
        }
        locatePerformed = false;
        var address = {
            "SingleLine": searchWhat
        };
        locator.outSpatialReference = SearchData.map.spatialReference;

        var options = {
            address: address,
            outFields: ["Loc_name"]
        };

        SearchData.taskCount = SearchData.taskCount;

        searchedLocation = null;
        searchWhat = PodUtilities.trim(searchWhat);
        var parts = searchWhat.split(",");
        var runAddrToLoc = true;
        if (parts.length == 2) {
            var str1 = PodUtilities.trim(parts[0].toUpperCase());
            var str2 = PodUtilities.trim(parts[1].toUpperCase());
            var coord1 = converStringToCoord(str1, "latitude");
            var coord2 = converStringToCoord(str2, "longitude");

            if (coord1 !== null && coord2 !== null) {
                if (coord1.isLatitude == coord2.isLatitude) {

                    if (coord1.isDefault) {
                        coord1.isLatitude = !coord2.isLatitude;
                    } else {
                        coord2.isLatitude = !coord1.isLatitude;
                    }
                }

                var y = coord1.isLatitude ? coord1.value : coord2.value;
                var x = coord2.isLatitude ? coord1.value : coord2.value;

                if (coord1.isLatitude) {
                    CoordinatesInformer.setOrder("latitude");
                } else {
                    CoordinatesInformer.setOrder("longitude");
                }

                searchedLocation = new Geometry.Point([x, y], new SpatialReference({
                    wkid: 4326
                }));
            }

            if (searchedLocation !== null) {
                SearchData.taskCount = SearchData.taskCount + 1;
                locator.locationToAddress(searchedLocation, 10000, getReverseGeocodeResults, rLocatorError);
                runAddrToLoc = false;
            }
        }

        if (runAddrToLoc === true) {
            SearchData.taskCount = SearchData.taskCount + 1;
            locator.addressToLocations(options, getGeocodeResults, locatorError);
        }
    }

    function converStringToCoord(testStr, defaultAxis) {
        var str = testStr;
        var direction = 1;
        var coord = {
            value: 0.0,
            isLatitude: (defaultAxis == "latitude"),
            isDefault: true
        };
        var dirArr = [{
            symb: "N",
            direction: +1,
            isLatitude: true
        }, {
            symb: "S",
            direction: -1,
            isLatitude: true
        }, {
            symb: "E",
            direction: +1,
            isLatitude: false
        }, {
            symb: "W",
            direction: -1,
            isLatitude: false
        }];

        var dirDetected = false;

        // Define axis and direction
        for (var i in dirArr) {
            var strLen = str.length;
            var dir = str.indexOf(dirArr[i].symb);
            if (dir === 0 || dir === strLen - 1) {
                if (dirDetected) {
                    return null;
                }
                str = str.replace(dirArr[i].symb, "");
                coord.isLatitude = dirArr[i].isLatitude;
                coord.isDefault = false;
                direction = dirArr[i].direction;
                dirDetected = true;
            } else if (dir != -1) {
                return null;
            }
        }

        // Convert string to the decimal value
        str = PodUtilities.trim(str);

        var parts = str.split(" ");
        if (parts.length > 3) {
            return null;
        }
        var coeff = [1, 60, 3600];
        for (i in parts) {
            var part = PodUtilities.trim(parts[i]);
            var partValue = parseFloat(part);
            if (isNaN(partValue)) {
                return null;
            }
            if (partValue !== 0) {
                coord.value += partValue / coeff[i] * direction;
            }
        }

        return coord;
    }

    function rLocatorError(res) {
        if (res.code != 400) {
            alert("locator error: " + res);
        }
        getReverseGeocodeResults();
    }

    function locatorError(res) {
        if (res.code != 400) {
            alert("locator error: " + res);
        }
        SearchData.taskCount = SearchData.taskCount - 1;
        if (SearchData.taskCount === 0) {
            createResultsContent();
        }
    }

    removeSearchResult = function (removeText) {
        hideSearchList();
        if (removeText == null) {
            removeText = false;
        }
        SearchData.results.fixed = [];
        SearchData.results.geocoding = [];
        SearchData.results.rgeocoding = [];
        SearchData.startIndex = 0;
        if (SearchData.graphics.area != null) {
            SearchData.map.graphics.remove(SearchData.graphics.area);
            SearchData.graphics.area = null;
        }
        if (SearchData.graphics.label != null) {
            SearchData.map.graphics.remove(SearchData.graphics.label);
            SearchData.graphics.label = null;
        }

        if (removeText !== false) {
            dom.byId("searchText").value = "";
            dom.byId("removeResult").style.display = "none";
        }
    };

    function setSearchMapExtent(map, sourceGeometry) { // , factor)
        var cp;
        if (sourceGeometry.type != "point") {
            var ext = sourceGeometry.getExtent().expand(5);
            var dw = map.extent.getWidth() / ext.getWidth();
            dw = dw >= 1 ? dw : (1 / dw);
            var dh = map.extent.getHeight() / ext.getHeight();
            dh = dh >= 1 ? dh : (1 / dh);
            if (dw > 5 || dh > 5) {
                map.setExtent(ext, false);
            }
            cp = ext.getCenter();
        } else {
            cp = sourceGeometry;
        }

        map.centerAt(cp);
    }
});
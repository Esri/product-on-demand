define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/i18n!./nls/podi18n",
    "esri/map",
    "esri/dijit/Search",
    "esri/layers/FeatureLayer",
    "esri/InfoTemplate",
    "esri/SpatialReference",
    "esri/geometry/Extent",
    "esri/tasks/locator",
    "dojo/domReady!"
], function(declare, array, lang, i18n, Map, EsriSearch, FeatureLayer, InfoTemplate, SpatialReference, Extent, Locator) {
    return declare("esri.production.dijit.Search", [EsriSearch], {
        sourceGeocodes: [],
        sourceLayers: [],
        esriMap: null,

        setSearchLayers: function(sourceLayers) {
            var sources = [];

            array.forEach(sourceLayers, function(sourceLayer) {

                var infoFieldsTemplate = sourceLayer.infoTemplate;
                if (infoFieldsTemplate === undefined) {
                    var infoFields = [sourceLayer.displayFiled];
                    for (var i = 0; i < sourceLayer.searchFields.length; i++) {
                        if (sourceLayer.searchFields[i] != "*" && sourceLayer.searchFields[i] != sourceLayer.displayFiled) {
                            infoFields.push(sourceLayer.searchFields[i]);
                        }
                    }
                    infoFieldsTemplate = "";
                    for (i = 0; i < infoFields.length; i++) {
                        infoFieldsTemplate += infoFields[i].toString() + ": ${" + infoFields[i] + "}</br>";
                    }
                }

                sources.push({
                    featureLayer: new FeatureLayer(sourceLayer.url),
                    searchFields: sourceLayer.searchFields,
                    displayField: sourceLayer.displayFiled,
                    exactMatch: false,
                    outFields: sourceLayer.searchFields,
                    name: sourceLayer.title,
                    placeholder: i18n.search.searchHint,
                    infoTemplate: new InfoTemplate(sourceLayer.title, infoFieldsTemplate),
                    enableSuggestions: true,
                    minCharacters: 0
                });

                // Fix "Pagination is not supported"
                var featureLayer = sources[sources.length-1].featureLayer;
                if (featureLayer.queryPagination === false) {
                    sources[sources.length-1].maxSuggestions = "somestring";
                    sources[sources.length-1].maxResults = "somestring";
                }
            });
            array.forEach(this.sourceGeocodes, function(sourceGeocode) {
                sources.push({
                    locator: new Locator(sourceGeocode.url),
                    singleLineFieldName: "SingleLine",
                    name: sourceGeocode.title,
                    localSearchOptions: {
                        minScale: 300000,
                        distance: 50000
                    },
                    placeholder: i18n.search.searchHint,
                    enableSuggestions: true,
                    minCharacters: 0
                });
            });
            this.set("sources", sources);
        },

        getSources: function() {
            return this.get("sources");
        },

        updateSources: function() {
            var sourceLayersOnMap = this.getSourceLayersOnMap();
            if (this.areLayersActual(sourceLayersOnMap))
                return;
            this.setSearchLayers(sourceLayersOnMap);
        },

        getSourceLayersOnMap: function() {
            var sourceLayersOnMap = [];
            for (var i = 0; i < this.sourceLayers.length; i++) {
                var sourceLayer = this.sourceLayers[i];
                if (this.map.getLayer(sourceLayer.title))
                    sourceLayersOnMap.push(sourceLayer);
            }
            return sourceLayersOnMap;
        },

        getLocatorCount: function() {
            var locatorCount = 0;
            var sources = this.getSources();
            array.forEach(sources, function(source) {
                if (source.locator !== undefined)
                    locatorCount++;
            });
            return locatorCount;
        },

        areLayersActual: function(infoLayers) {
            var sources = this.getSources();
            if (infoLayers.length != sources.length - this.getLocatorCount())
                return false;
            var isActualSourceLayer = true;
            for (var i = 0; i < infoLayers.length; i++) {
                var infoLayer = infoLayers[i];
                isActualSourceLayer = false;
                for (var j = 0; j < sources.length; j++) {
                    var source = sources[j];
                    if (source.featureLayer !== undefined && source.featureLayer.url && infoLayer.url == source.featureLayer.url) {
                        isActualSourceLayer = true;
                        break;
                    }
                }
                if (!isActualSourceLayer)
                    break;
            }
            return isActualSourceLayer;
        },

        addSourceLayer: function(sourceLayer) {
            this.sourceLayers.push(sourceLayer);
            this.updateSources();
        },

        startup: function(sourceLayers, sourceGeocodes) {
            this.inherited(arguments);
            if (sourceLayers !== undefined)
                this.sourceLayers = sourceLayers;
            if (sourceGeocodes !== undefined)
                this.sourceGeocodes = sourceGeocodes;
            this.updateSources();
            this.map.on("layer-remove", lang.hitch(this, function() {
                this.updateSources();
            }));
            this.map.on("layer-add", lang.hitch(this, function() {
                this.updateSources();
            }));
        },

        _supportsPagination: function(source) {
            for (var i = 0; i < this.sources.length; i++) {
                //Fix "Pagination is not supported"
                var featureLayer = this.sources[i].featureLayer;
                if (featureLayer !== undefined && featureLayer.advancedQueryCapabilities.supportsPagination === false) {
                    this.sources[i].maxSuggestions = "somestring";
                }
            }
            return true;
        },

        _insertSuggestions: function(suggestions) {
            for (var i = 0; i < this.sources.length; i++) {
                var featureLayer = this.sources[i].featureLayer;
                if (featureLayer !== undefined && featureLayer.advancedQueryCapabilities.supportsPagination === false) {
                    this.sources[i].maxSuggestions = this.maxSuggestions;;
                }
            }
            this.inherited(arguments);
        }
    });

});
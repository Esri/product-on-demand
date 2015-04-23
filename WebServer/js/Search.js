define([
    "dojo/_base/declare",
    "dojo/_base/array",
	"dojo/_base/lang",
	"dojo/i18n!./nls/podi18n",
	"esri/map",
	"./CustomSearch",
	"esri/layers/FeatureLayer",
	"esri/InfoTemplate",
	"esri/SpatialReference",
	"esri/geometry/Extent",
	"esri/tasks/locator",
	"dojo/domReady!"
], function (declare, array, lang, i18n, Map, CustomSearch, FeatureLayer, InfoTemplate, SpatialReference, Extent, Locator) {
	var maxSuggestionCount = 20;
	var Search = declare("Search", null, {
		search: null,
		map: null,
		sourceGeocodes: [],
		sourceLayers: [],
		constructor: function (map, divName, sourceLayers, sourceGeocodes) {
			this.map = map;
			this.sourceGeocodes = sourceGeocodes;
			this.sourceLayers = sourceLayers;
			this.search = new CustomSearch({
				enableButtonMode: false, //this enables the search widget to display as a single button
				enableLabel: true,
				enableInfoWindow: true,
				enableHighlight: true,
				showInfoWindowOnSelect: true,
				maxSuggestions: maxSuggestionCount,
				map: map
			}, divName);
			this.search.startup();

			this.setSearchLayers = function (sourceLayers) {
				var sources = [];
				array.forEach(sourceLayers, function (sourceLayer) {
					sources.push(
						  {
						  	featureLayer: new FeatureLayer(sourceLayer.url),
						  	searchFields: sourceLayer.searchFields,
						  	displayField: sourceLayer.displayFiled,
						  	exactMatch: false,
						  	outFields: sourceLayer.searchFields,
						  	name: sourceLayer.title,
						  	placeholder: i18n.search.searchHint,
						  	maxResults: maxSuggestionCount,
						  	maxSuggestions: maxSuggestionCount,
						  	infoTemplate: sourceLayer.infoTemplate !== undefined
											? sourceLayer.infoTemplate 
											: new InfoTemplate(sourceLayer.title, sourceLayer.displayFiled.toString() + ": ${" + sourceLayer.displayFiled + "}"),
						  	enableSuggestions: true,
						  	minCharacters: 0
						  });
				});
				array.forEach(this.sourceGeocodes, function (sourceGeocode) {
					sources.push({
						locator: new Locator(sourceGeocode.url),
						singleLineFieldName: "SingleLine",
						name: sourceGeocode.title,
						localSearchOptions: {
							minScale: 300000,
							distance: 50000
						},
						placeholder: i18n.search.searchHint,
						maxResults: maxSuggestionCount,
						maxSuggestions: maxSuggestionCount,
						enableSuggestions: true,
						minCharacters: 0
					})
				});
				this.search.set("sources", sources);
			};

			this.getSources = function () { return this.search.get("sources"); }

			this.updateSources = function () {
				var sourceLayersOnMap = this.getSourceLayersOnMap();
				if (this.areLayersActual(sourceLayersOnMap))
					return;
				this.setSearchLayers(sourceLayersOnMap);
			}

			this.getSourceLayersOnMap = function () {
				var sourceLayersOnMap = [];
				array.forEach(this.sourceLayers, function (sourceLayer) {
					if (map.getLayer(sourceLayer.title))
						sourceLayersOnMap.push(sourceLayer);
				});
				return sourceLayersOnMap;
			};

			this.getLocatorCount = function (actualInfoLayers) {
				var locatorCount = 0;
				var sources = this.getSources();
				array.forEach(sources, function (source) {
					if (source.locator !== undefined)
						locatorCount++;
				});
				return locatorCount;
			}

			this.areLayersActual = function (infoLayers) {
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
			};

			this.setSearchLayers([]);
			this.map.on("layer-remove", lang.hitch(this, function () { this.updateSources(); }));
			this.map.on("layer-add", lang.hitch(this, function () { this.updateSources(); }));
		}
	});

	return Search;

});



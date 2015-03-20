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
    "dojo/i18n!./nls/podi18n"
], function (i18n) {

	var i18n = i18n.podConfig;

	return {
		// Keep this the first statement to catch most syntax errors in this file
		isSyntaxError: false,

		// Name should match the file name
		podConfig: {

			// ############################################
			// APPLICATION LEVEL SETTINGS
			// ############################################
			AppLevelSettings: {

				// Header
				logoImage: "images/esri-logo.png", // image size is recalculated automatically accordingly CSS settings
				applicationTitle: i18n.applicationTitle,
				applicationSubtitle: i18n.applicationSubtitle, // optional

				// Welcome screen
				isSplash: true,
				isSplashContactInfo: true,
				splashTitle: i18n.splashTitle,
				splashText: i18n.splashText,
				splashEmailDesc: i18n.splashEmailDesc,
				splashEmail: i18n.splashEmail,
				splashEmailAlias: i18n.splashEmailAlias,
				splashWebsiteDesc: i18n.splashWebsiteDesc,
				splashWebsite: i18n.splashWebsite,
				splashDoNotShow: i18n.splashDoNotShow,

				// Left panel
				isExportedFilesAliveCheck: true, // if true, when user clicks a link, checks if files exported in that job are available
				maxProductsInExportGrid: 50, // maximum number of products that may be added to the export list
				maxProductsToExport: 5, // maximum number of products that may be exported in one job

				// Map layers
				isDataFieldChecks: true, // set to false to disable checking extent layer fields referred to in products when site loads
				defaultBasemapLayer: "Light Gray Canvas", // default basemap layer when no product is selected

				// Urls
				geocodeServiceUrl: "http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
				geometryServiceUrl: "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",

				gpCalculateExtentUrl: "http://<yourServer>/arcgis/rest/services/mcs_pod/Calculators/GPServer/CalculateExtent",
				gpCalculateStripMapUrl: "http://<yourServer>/arcgis/rest/services/mcs_pod/Calculators/GPServer/CalculateStripMap",
				gpCalculatePageSizeUrl: "http://<yourServer>/arcgis/rest/services/mcs_pod/Calculators/GPServer/CalculatePageSize",
				gpCalculateScaleUrl: "http://<yourServer>/arcgis/rest/services/mcs_pod/Calculators/GPServer/CalculateScale",

				// If Gateway address changed, update the <serverUrl> tag content in ..\proxy\proxy.config
				// Otherwise, you'll get the following error when trying to export more than two products in one job:
				// "RequestError. Unable to load proxy/proxy.ashx?http://<POD Gateway service address> status: 500"
				gpExportGatewayUrl: "http://<yourServer>/arcgis/rest/services/mcs_pod/Gateway/GPServer/Gateway"
			},

			// ############################################
			// APPLICATION LEVEL DOMAINS
			// ############################################


			// Describes the four supported product types in POD
			ProductTypes: [
				{ value: "Fixed", source: "ExtentLayers" },
				{ value: "Area", source: null },
				{ value: "Scale", source: null },
				{ value: "PageSize", source: null }
			],

			// For ExtentLayers and BasemapLayers, use oidField:"*" or oidField:"<FieldName>" property if the OID field
			// is other than "OBJECTID". Please note that "*" may seriously affect selection performance on the layer
			// and significantly increase the network traffic.

			// For ExtentLayers and BasemapLayers, use oidField:"*" or oidField:"<FieldName>" property if the OID field
			// is other than "OBJECTID". Please note that "*" may seriously affect selection performance on the layer
			// and significantly increase the network traffic.

			// Basemaps that can be used in a product definition
			BasemapLayers: [
				{ value: "Topographic", url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer" },
				{ value: "Imagery", url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" },
				{ value: "Imagery with Labels", url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer,http://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer" },
				{ value: "Streets", url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer" },
				{ value: "Terrain with Labels", url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer,http://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer" },
				{ value: "Light Gray Canvas", url: "http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer,http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer" },
				{ value: "National Geographic", url: "http://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer" },
				{ value: "Oceans", url: "http://services.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer" }
			],

			// Operational layers for a product 
			ExtentLayers: [
				{ value: "25K Index", url: "http://<yourServer>/arcgis/rest/services/mcs_pod/ExtentLayers/MapServer", sublayer: 0, data0: "QUAD_NAME", data1: "SECOORD" },
				{ value: "Boundaries", url: "http://<yourServer>/arcgis/rest/services/mcs_pod/ExtentLayers/MapServer", sublayer: 3, data0: "STATE_NAME" }
			],

			// Available output formats to generate maps 
			Exporters: [
				{ value: "PDF", extensions: "pdf" },
				{ value: "JPEG", extensions: "jpg,jpeg" },
				{ value: "TIFF", extensions: "tiff" },
				{ value: "Multi-page PDF", extensions: "pdf" }, // name is special, recognized in .js code
				{ value: "Production PDF", extensions: "pdf" },
				{ value: "Layout GeoTIFF", extensions: "tiff" },
				{ value: "Map Package", extensions: "mpk" }
			],

			// Scale Values typically used for "Area" and "PageSize" type products
			ScaleList: [
				{ value: 5000, displayName: "1:5,000" },
				{ value: 25000, displayName: "1:25,000" },
				{ value: 50000, displayName: "1:50,000" },
				{ value: 100000, displayName: "1:100,000" },
				{ value: 250000, displayName: "1:250,000" },
				{ value: 500000, displayName: "1:500,000" }
			],

			// Pagesize values for "area" and "scale" type produc
			// Paper size chart: http://resources.printhandbook.com/pages/paper-size-chart.php
			PageSizeList: [
				{ value: "A0", displayName: "A0", tooltip: i18n.pageSizeList.tooltip_A0 },
				{ value: "A1", displayName: "A1", tooltip: i18n.pageSizeList.tooltip_A1 },
				{ value: "A2", displayName: "A2", tooltip: i18n.pageSizeList.tooltip_A2 },
				{ value: "A3", displayName: "A3", tooltip: i18n.pageSizeList.tooltip_A3 },
				{ value: "A4", displayName: "A4", tooltip: i18n.pageSizeList.tooltip_A4 },
				{ value: "A5", displayName: "A5", tooltip: i18n.pageSizeList.tooltip_A5 },
				{ value: "C", displayName: "ANSI C", tooltip: i18n.pageSizeList.tooltip_ANSI_C },
				{ value: "D", displayName: "ANSI D", tooltip: i18n.pageSizeList.tooltip_ANSI_D },
				{ value: "E", displayName: "ANSI E", tooltip: i18n.pageSizeList.tooltip_ANSI_E },
				{ value: "Letter", displayName: "Letter", tooltip: i18n.pageSizeList.tooltip_LETTER },
				{ value: "Legal", displayName: "Legal", tooltip: i18n.pageSizeList.tooltip_LEGAL },
				{ value: "Tabloid", displayName: "Tabloid", tooltip: i18n.pageSizeList.tooltip_TABLOID },
				{ value: "32 44 CENTIMETERS", displayName: "Custom Size 32*44 cm", tooltip: i18n.pageSizeList.tooltip_CUSTOM_32_44 },
				{ value: "63 88 CENTIMETERS", displayName: "Custom Size 63*88 cm", tooltip: i18n.pageSizeList.tooltip_CUSTOM_63_88 }
			],

			// Tools that are available in the application for map extent creation and management of map sheets
			MapCommands: [
				{
					value: "-", // a special value for separator
					displayName: "",
					image: "", tooltip: ""
				},
				{
					value: "zoomin", // activates zooming-in mode on map
					displayName: i18n.mapCommands.displayName_zoomIn,
					image: "images/zoomin.png", tooltip: i18n.mapCommands.tooltip_zoomIn
				},
				{
					value: "zoomout", // activates zooming-out mode on map
					displayName: i18n.mapCommands.displayName_zoomOut,
					image: "images/zoomout.png", tooltip: i18n.mapCommands.tooltip_zoomOut
				},
				{
					value: "pan", // activates pan mode on map
					displayName: i18n.mapCommands.displayName_pan,
					image: "images/pan.png", tooltip: i18n.mapCommands.tooltip_pan
				},
				{
					value: "select_point", // select a fixed extent by clicking on map
					displayName: i18n.mapCommands.displayName_selectPoint,
					image: "images/select-point.png", tooltip: i18n.mapCommands.tooltip_selectPoint
				},
				{
					value: "extent_point", // select a custom extent by clicking on map
					displayName: i18n.mapCommands.displayName_extentPoint,
					image: "images/extent-point.png", tooltip: i18n.mapCommands.tooltip_extentPoint
				},
				{
					value: "select_polyline", // select fixed extents by drawing a polyline on map
					displayName: i18n.mapCommands.displayName_selectPolyline,
					image: "images/select-polyline.png", tooltip: i18n.mapCommands.tooltip_selectPolyline
				},
				{
					value: "extent_polyline", // select series of custom extents by drawing a polyline on map
					displayName: i18n.mapCommands.displayName_extentPolyline,
					image: "images/extent-stripmap.png", tooltip: i18n.mapCommands.tooltip_extentPolyline
				},
				{
					value: "select_polygon", // select fixed extents by drawing a polygon on map
					displayName: i18n.mapCommands.displayName_selectPolygon,
					image: "images/select-polygon.png", tooltip: i18n.mapCommands.tooltip_selectPolygon
				},
				{
					value: "extent_polygon", // create a custom extent by drawing a polygon on map
					displayName: i18n.mapCommands.displayName_extentPolygon,
					image: "images/select-polygon.png", tooltip: i18n.mapCommands.tooltip_extentPolygon
				},
				{
					value: "extent_move", // move custom extents on map
					displayName: i18n.mapCommands.displayName_extentMove,
					image: "images/extent-move.png", tooltip: i18n.mapCommands.tooltip_extentMove
				},
				{
					value: "layer_zoomto", // zoom to the current extent layer
					displayName: i18n.mapCommands.displayName_zoomTo,
					image: "images/layer-zoomto.png", tooltip: i18n.mapCommands.tooltip_zoomTo
				},
				{
					value: "clear_selected", // clear selected extents on map
					displayName: i18n.mapCommands.displayName_clearSelected,
					image: "images/select-clear.png", tooltip: i18n.mapCommands.tooltip_clearSelected
				},
				{
					value: "clear_all", // clear all extents on map
					displayName: i18n.mapCommands.displayName_clearAll,
					image: "images/all-clear.png", tooltip: i18n.mapCommands.tooltip_clearAll
				}
			],

			// ############################################
			// BASE PRODUCT SETTINGS
			// ############################################

			// Individual product attribute tables inherit, and may override data from BaseProductTable.
			// Product instance tables inherit attributes from both product attribute tables and BaseProductTable.
			// Do not alter the attributes in BaseProductTable and BaseInstanceTable
			// Instead override them by defining them in the product tables them selves with the structure below

			// attr - specifies the product attribute name
			// displayName - shows the attribute in UI and is visible when non-empty string is set as value. Is hidden when empty string is set as value
			// value - initial attribute value
			// domain - specifies the application domains to derive possible attribute values 
			// filter - allows creation of subset of domain values
			// isEditable - determines if the attribute is editable in a textbox or combo box by the web user
			// passToServer - determines name of the attribute to pass to export as part of product definition
			// source - attribute value would be taken from the corresponding extent layer data field definition.

			// Required Defintion for Products
			BaseProductTable: [ // this table defines base product properties for all products
				{ attr: "type", domain: "ProductTypes" },
				{ attr: "productName", displayName: i18n.attrsDisplayName.product, passToServer: true }, // special: displayed under product icon
				{ attr: "description", displayName: i18n.attrsDisplayName.description }, // special: displayed as a product tooltip
				{ attr: "makeMapScript", passToServer: true },
				{ attr: "toolName", passToServer: true },
				{ attr: "imageOverride", value: false },
				{ attr: "extentLayer", domain: "ExtentLayers" },
				{ attr: "basemapLayer", domain: "BasemapLayers", value: "Light Gray Canvas" },
				{ attr: "mapExtent", value: { xmin: -15204166.06, ymin: 1593253.26, xmax: -6398620.40, ymax: 7463617.03, spatialReference: { wkid: 102100 } } },
				{ attr: "mxd", passToServer: true },
				{ attr: "gridXml", passToServer: true },
				{ attr: "pageMargin", value: "0", passToServer: true },
				{ attr: "exporter", displayName: i18n.attrsDisplayName.exporter, domain: "Exporters", value: "PDF", passToServer: true, isEditable: true },
				{ attr: "exportOption", filter: ["Preview", "Export"], passToServer: true }, // special: preview/export mode selection. For "Preview", exporter is always JPEG
				{ attr: "geometry", passToServer: true }, // special: representation of the product geometry as a string
				{ attr: "angle", passToServer: true },    // special: angle of the product geometry in degree 
				{ attr: "scale", displayName: i18n.attrsDisplayName.scale, domain: "ScaleList", value: 500000, passToServer: true, isEditable: true },
				{ attr: "pageSize", displayName: i18n.attrsDisplayName.pageSize, domain: "PageSizeList", value: "Letter", passToServer: true },
				{ attr: "orientation", displayName: i18n.attrsDisplayName.orientation, filter: ["Portrait", "Landscape"], value: "Portrait", passToServer: false, isEditable: true },
				{ attr: "mapCommandDefault", domain: "MapCommands" },
				{ attr: "mapCommandButtons", domain: "MapCommands" },
				{ attr: "mapCommandContextMenu", domain: "MapCommands", filter: ["zoomin", "zoomout", "pan"] },
				{ attr: "roundToNearest", passToServer: false }
			],

			// Required Defintion for Instances
			BaseProductInstanceTable: [ // this table defines product properties for all product instances
				{ attr: "description", displayName: "" }, //inherited attribute overridden with "" to hide from UI 
				{ attr: "exporter", displayName: i18n.attrsDisplayName.exporter, isEditable: false },
				{ attr: "scale", ddisplayName: i18n.attrsDisplayName.scale, isEditable: false },
				{ attr: "pageSize", displayName: i18n.attrsDisplayName.pageSize, isEditable: false },
				{ attr: "orientation", displayName: i18n.attrsDisplayName.orientation, isEditable: false },
				{ attr: "width", displayName: i18n.attrsDisplayName.width, isEditable: false },
				{ attr: "height", displayName: i18n.attrsDisplayName.height, isEditable: false },
				{ attr: "units", displayName: i18n.attrsDisplayName.units, isEditable: false },
				{ attr: "mapSheetName", displayName: i18n.attrsDisplayName.mapSheetName, passToServer: true }, // read-only text field
				{ attr: "customName", displayName: i18n.attrsDisplayName.customName, isEditable: true, passToServer: true } // editable text field
			],

			// ############################################
			// CUSTOMIZABLE PRODUCT SETTINGS
			// ############################################
			// Create settings here to define new products or override base product setting

			Fixed25KTable: [
				{ attr: "type", value: "Fixed" },
				{ attr: "productName", value: "Fixed 25K" },
				{ attr: "description", value: "Produces a map to a 1:25000 scale with a set page size of width 25 inches and height 35 inches." },
				{ attr: "makeMapScript", value: "Fixed25K_MapGenerator.pyt" },
				{ attr: "toolName", value: "MapGenerator" },
				{ attr: "basemapLayer", value: "Topographic" },
				{ attr: "extentLayer", value: "25K Index" },
				{ attr: "quad_id", source: "data1", passToServer: true },
				{ attr: "mapExtent", value: null }, // use value: null for zooming to extentLayer.fullExtent
				{ attr: "mxd", value: "CTM25KTemplate.mxd" },
				{ attr: "scale", domain: "ScaleList", value: 250000, passToServer: false, isEditable: false },
				{ attr: "pageSize", displayName: i18n.attrsDisplayName.pageSize, value: "63 88 CENTIMETERS", isEditable: false },
				{ attr: "orientation", displayName: "", value: "Portrait" },
				{ attr: "gridXml", value: "CTM_UTM_WGS84_grid.xml" },
				{ attr: "pageMargin", value: "4.5 8 23 8 CENTIMETERS" },
				{ attr: "imageOverride", value: true },
				{ attr: "thumbnail", value: "Fixed 25K.png" },
				{ attr: "exporter", value: "PDF" },
				{ attr: "mapCommandDefault", value: "select_point" },
				{ attr: "mapCommandButtons", filter: ["select_point", "select_polyline", "select_polygon", "-", "extent_point", "extent_move", "clear_selected"] },
				{ attr: "mapCommandContextMenu", filter: ["zoomin", "zoomout", "pan", "-", "select_point", "select_polyline", "select_polygon", "-", "extent_point", "extent_move", "-", "layer_zoomto", "-", "clear_selected", "clear_all"] },
				{ attr: "roundToNearest", value: false }
			],

			Fixed25KInstanceTable: [
				{ attr: "mapSheetName", source: "data0" },
				{ attr: "width", displayName: "" },
				{ attr: "height", displayName: "" },
				{ attr: "units", displayName: "" }
			],

			DynamicAreaTable: [
				{ attr: "type", value: "Area" },
				{ attr: "productName", value: "Dynamic Area" },
				{ attr: "description", value: "Produces a map by adjusting the ground area based on provided scale and page size." },
				{ attr: "makeMapScript", value: "DynamicArea_MapGenerator.pyt" },
				{ attr: "toolName", value: "MapGenerator" },
				{ attr: "layoutrulesXML", value: "DynamicAreaLayoutRulesOSM.xml", passToServer: true },
				{ attr: "extentLayer", displayName: "", value: "Boundaries" },
				{ attr: "basemapLayer", value: "Topographic" },
				{ attr: "mapExtent", value: null }, // use value: null for zooming to extentLayer.fullExtent
				{ attr: "imageOverride", value: false },
				{ attr: "mxd", value: "DynamicAreaOSM.mxd" },
				{ attr: "gridXml", value: "DynamicAreaUTM.xml" },
				{ attr: "pageMargin", value: "0.15 2.85 0.15 0.15 INCHES" },
				{ attr: "thumbnail", value: "Area.png" },
				{ attr: "exporter", filter: ["PDF", "JPEG", "Multi-page PDF", "Map Package"], value: "PDF" },
				{ attr: "scale", displayName: i18n.attrsDisplayName.scale, value: 100000 },
				{ attr: "pageSize", displayName: i18n.attrsDisplayName.pageSize, value: "Letter", isEditable: true },
				{ attr: "orientation", displayName: i18n.attrsDisplayName.orientation, value: "Landscape", isEditable: true },
				{ attr: "mapCommandDefault", value: "extent_point" },
				{ attr: "mapCommandButtons", filter: ["extent_point", "extent_polyline", "extent_move", "-", "clear_selected"] },
				{ attr: "mapCommandContextMenu", filter: ["zoomin", "zoomout", "pan", "-", "extent_point", "extent_polyline", "extent_move", "-", "layer_zoomto", "-", "clear_selected", "clear_all"] },
				{ attr: "roundToNearest", value: false }
			],

			DynamicAreaInstanceTable: [
				{ attr: "width", displayName: "" },
				{ attr: "height", displayName: "" },
				{ attr: "units", displayName: "" }
			],

			DynamicScaleTable: [
				{ attr: "type", value: "Scale" },
				{ attr: "productName", value: "Dynamic Scale" },
				{ attr: "description", value: "Produces a map by adjusting the scale based on provided ground area and page size." },
				{ attr: "makeMapScript", value: "DynamicScale_MapGenerator.pyt" },
				{ attr: "toolName", value: "MapGenerator" },
				{ attr: "basemapLayer", value: "Streets" },
				{ attr: "layoutrulesXML", value: "DynamicScaleLayoutRulesOSM.xml", passToServer: true },
				{ attr: "extentLayer", displayName: "", value: "Boundaries" },
				{ attr: "mxd", value: "DynamicScaleOSM.mxd" },
				{ attr: "gridXml", value: "DynamicScaleUTM.xml" },
				{ attr: "pageMargin", value: "0.5 0.5 0.5 0.5" },
				{ attr: "thumbnail", value: "Scale.png" },
				{ attr: "exporter", value: "PDF" },
				{ attr: "width", displayName: "", isEditable: true },
				{ attr: "height", displayName: "", isEditable: true },
				{ attr: "units", displayName: "", filter: ["Meters", "Kilometers", "Decimal Degrees"], value: "Kilometers", isEditable: true },
				{ attr: "scale", displayName: "", value: 0 },
				{ attr: "pageSize", displayName: i18n.attrsDisplayName.pageSize, value: "A4", isEditable: true, filter: ["A3", "A4", "A5", "Letter", "Legal", "Tabloid", "32 44 CENTIMETERS"] },
				{ attr: "orientation", displayName: i18n.attrsDisplayName.orientation, value: "Portrait", isEditable: true },
				{ attr: "mapCommandDefault", value: "extent_polygon" },
				{ attr: "mapCommandButtons", filter: ["extent_point", "extent_polygon", "extent_move", "clear_selected"] },
				{ attr: "mapCommandContextMenu", filter: ["zoomin", "zoomout", "pan", "-", "extent_point", "extent_move", "-", "clear_selected", "clear_all"] },
				{ attr: "roundToNearest", value: 1000 }
			],

			DynamicScaleInstanceTable: [
				{ attr: "scale", displayName: i18n.attrsDisplayName.scale }
			],

			DynamicPageTable: [
				{ attr: "type", value: "PageSize" },
				{ attr: "productName", value: "Dynamic Page" },
				{ attr: "description", value: "Produces a map by adjusting the pagesize based on provided ground area and scale." },
				{ attr: "makeMapScript", value: "DynamicPage_MapGenerator.pyt" },
				{ attr: "toolName", value: "MapGenerator" },
				{ attr: "layoutrulesXML", value: "DynamicPageLayoutRulesOSM.xml", passToServer: true },
				{ attr: "extentLayer", displayName: "", value: "Boundaries" },
				{ attr: "basemapLayer", value: "National Geographic" },
				{ attr: "mxd", value: "DynamicPageOSM.mxd" },
				{ attr: "gridXml", value: "DynamicPageUTM.xml" },
				{ attr: "pageMargin", value: "0.5 0.5 0.5 0.5 INCHES" },
				{ attr: "thumbnail", value: "PageSize.png" },
				{ attr: "imageOverride", value: true },
				{ attr: "exporter", value: "PDF" },
				{ attr: "width", displayName: "" },
				{ attr: "height", displayName: "" },
				{ attr: "units", displayName: "", filter: ["Meters", "Kilometers", "Decimal Degrees"], value: "Meters" },
				{ attr: "scale", displayName: i18n.attrsDisplayName.scale, value: 500000 },
				{ attr: "pageSize", displayName: "", value: "A4" },
				{ attr: "orientation", displayName: "", value: "Portrait" },
				{ attr: "mapCommandDefault", value: "extent_polygon" },
				{ attr: "mapCommandButtons", filter: ["extent_point", "extent_polygon", "extent_move", "clear_selected"] },
				{ attr: "mapCommandContextMenu", filter: ["zoomin", "zoomout", "pan", "-", "extent_polygon", "extent_move", "-", "clear_selected", "clear_all"] },
				{ attr: "roundToNearest", value: true }
			],

			DynamicPageInstanceTable: [
			   { attr: "pageSize", displayName: i18n.attrsDisplayName.pageSize }
			],

			ProductDefinitions: [
				{ attrTable: "Fixed25KTable", instanceTable: "Fixed25KInstanceTable" },
				{ attrTable: "DynamicAreaTable", instanceTable: "DynamicAreaInstanceTable" },
				{ attrTable: "DynamicScaleTable", instanceTable: "DynamicScaleInstanceTable" },
				{ attrTable: "DynamicPageTable", instanceTable: "DynamicPageInstanceTable" }
			]
		}
	}
});
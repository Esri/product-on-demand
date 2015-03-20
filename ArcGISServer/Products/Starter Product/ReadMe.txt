Starter Product ReadMe
This is a starter product that is designed to allow you to try out creating new Products using POD. 
This folder contains of
1. A python tool that generates a map output with input from the POD javascript application. 
2. A grid template that facilitates the creation of map extents in the web map and is used in the abovemention script to scale, pan the map to the correct location. 
Before starting read the Setup Documentation to get familiar with POD. 

To use this starter product:
a. Copy a properly sourced map document into this location. 
	- Ensure that the page units for the mxd are in INCHES
	- Note down the PageSize of the Layout 
	- Note down any margins between the main dataframe in the mxd and the rest of the page. This should be in the format Top, Left, Bottom, Right.
b. Update the podconfig.js file on the web server to try your map on POD - in the code below update the mxd name, page size and margins
	
	StarterProductTable: [
        { attr: "type", value: "Area" },
        { attr: "productName", value: "Starter Product" },
        { attr: "description", value: "Try out a new product" },
        { attr: "thumbnail", value: "Area.png" },
		{ attr: "imageOverride", value: true },
        { attr: "basemapLayer", value: "Topographic" },
		{ attr: "extentLayer", displayName: "", value: "Boundaries" },
        { attr: "mapExtent", value: null }, 
        { attr: "makeMapScript", value: "POD_MapGenerator.pyt"},
		{ attr: "toolName", value: "PODMapGenerator" },
		{ attr: "gridXml", value: "POD_GridTemplate_UTM.xml" },
        { attr: "mxd", value: "<enter the name of your mxd here>" },
		{ attr: "pageSize", displayName: "", value: "<enter your page size here>", isEditable: true }, 
		{ attr: "pageMargin", value: "1 1 1 1 INCHES" },
        { attr: "exporter", displayName: "", value: "PDF" },
        { attr: "scale", displayName: "Scale", value: 100000 },
        { attr: "orientation", displayName: "Orientation", value: "Portrait", isEditable: true },
        { attr: "mapCommandDefault", value: "extent_point" },
        { attr: "mapCommandButtons", filter: ["extent_point", "extent_polyline", "extent_move", "-", "clear_selected"] },
        { attr: "mapCommandContextMenu", filter: ["zoomin", "zoomout", "pan", "-", "extent_point", "extent_polyline", "extent_move", "-", "layer_zoomto", "-", "clear_selected", "clear_all"] },
        { attr: "roundToNearest", value: false }
    ],
	
c. Add this StarterProductTable variable to the Customize Product Settings area

d. Update the ProductDefinion entry with the attrTable for SPTable:	{ attrTable: "SPTable"}
    
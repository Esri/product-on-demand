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

define({
    root: {
        podConfig: {
            applicationTitle: "Production Mapping for ArcGIS Server",
            applicationSubtitle: "Product on Demand (POD): vector page maps",
            splashTitle: "POD Sample Application",
            splashText: "This is a demonstration site for the Esri Product On Demand sample application. The functionality on this page may change without warning, and it is not intended for production usage.",
            splashEmailDesc: "Email For More Information",
            splashEmail: "pm_carto_external@esri.com",
            splashEmailAlias: "Esri Production Mapping Team",
            splashWebsiteDesc: "Visit Our Website",
            splashWebsite: "http://www.esri.com/software/arcgis/extensions/production-mapping",
            splashDoNotShow: "Do Not Show This Again",
            userGuideLink: "User Guide",
            mapServicesLink: "Change Layers",
            pageSizeList: {
                tooltip_A0: "A0 (33.1in x 46.8in)",
                tooltip_A1: "A1 (23.39in x 33.11in)",
                tooltip_A2: "A2 (16.54in x 23.39in)",
                tooltip_A3: "A3 (11.69in x 16.54in)",
                tooltip_A4: "A4 (8.27in x 11.69in)",
                tooltip_A5: "A5 (5.83in x8.27in)",
                tooltip_ANSI_C: "ANSI C (17in x 22in)",
                tooltip_ANSI_D: "ANSI D (22in x 34in)",
                tooltip_ANSI_E: "ANSI E (34in x 44in)",
                tooltip_LETTER: "Letter (8.5in x 11in)",
                tooltip_LEGAL: "Legal (8.5in x 14in)",
                tooltip_TABLOID: "Tabloid (11in x 17in)",
                tooltip_CUSTOM_32_44: "Custom Size 32*44 cm",
                tooltip_CUSTOM_63_88: "Custom Size 63*88 cm"
            },
            mapCommands: {
                displayName_zoomIn: "Zoom in",
                displayName_zoomOut: "Zoom out",
                displayName_pan: "Pan",
                displayName_selectPoint: "Select existing by point",
                displayName_extentPoint: "Create new by point",
                displayName_selectPolyline: "Select existing by polyline",
                displayName_extentPolyline: "Create new by line",
                displayName_selectPolygon: "Select existing by polygon",
                displayName_extentPolygon: "Create new by polygon",
                displayName_extentMove: "Move extent",
                displayName_zoomTo: "Zoom to extent layer",
                displayName_clearSelected: "Clear selected extents",
                displayName_clearAll: "Clear all extents",
                tooltip_zoomIn: "Zoom in",
                tooltip_zoomOut: "Zoom out",
                tooltip_pan: "Pan",
                tooltip_selectPoint: "Select an existing extent from the extent layer",
                tooltip_extentPoint: "Create a new extent",
                tooltip_selectPolyline: "Select an existing extent from the extent layer",
                tooltip_extentPolyline: "Create new extents with a polyline",
                tooltip_selectPolygon: "Select an existing extent from the extent layer",
                tooltip_extentPolygon: "Create new extents with a polygon",
                tooltip_extentMove: "Move a custom extent",
                tooltip_zoomTo: "Zoom to the current extent layer for the product",
                tooltip_clearSelected: "Clear selected extents",
                tooltip_clearAll: "Clear all extents"
            },
            attrsDisplayName: {
                product: "Product",
                description: "Product Description",
                extentLayer: "Extent Layer",
                exporter: "Export Format",
                mapSheetName: "Map Sheet Name",
                customName: "Custom Name",
                pageSize: "Page Size",
                scale: "Scale",
                orientation: "Orientation",
                width: "Width",
                height: "Height",
                units: "Units"
            }
        },
        configurationManager: {
            syntaxError: "The configuration file has some syntax errors.",
            propertyMessage: "property : ${propertyName}\nmessage :  ${propertyMsg}",
            domainNotDefinited: "ProductTypes[${propertyName}] refers to domain '${domainName}' which is not defined.",
            domainValueInvalid: "${domainName}.value is (${domainValue}) but it should be a special separator value (-)",
            basemapLayerInvalid: "AppLevelSettings.defaultBasemapLayer (${basemapLayer}) is not listed in 'BasemapLayers[].value'",
            tableNotDefined: "Attribute table (${tableName}) is not defined, referenced from: ${productname}.attrTable",
            headE: "A site configuration script error has been detected.\nPlease save this message if possible and contact the site administrator.\n\n",
            headW: "A problem with the site configuration is possible, or server is down.\nIf displayed often, please show this message to the site administrator.\n\n",
            stopped: "Stop execution after configuration error: ${errorMsg}\n\n",
            alreadyStopped: "Already stopped:\n\n",
            passToServerRedefined: "passToServer redefined",
            valueNotDefined: "'${message}' is not defined.",
            valueNotExpected: "'${message}' is of type '${variableType}', while '${expectedType}' was expected.",
            tooManyDefined: "${message} has too many values defined.",
            unknownUnits: "${message} specifies unknown measurement units.",
            invalidNumber: "${message} specifies incorrect numeric value: ${number}",
            tableDomainNotDefined: "${tableName}[${id}].domain refers to domain (${domainName}) which is not defined.",
            tableInvalidValue: "${tableName}['${id}'].value (${value}) is not listed in ${domainName}[].value",
            propertyNotFound: "Attribute ${attributeName} refers to a property ${propertyName}.${fieldName} which cannot be found.",
            settingNotDefined: "The requested setting (${settingName}) is not defined in the configuration file."
        },
        podExport: {
            invalidNames: "There are invalid product names in the export table:\n\n ${invalidNames}\n",
            duplicateNames: "There are duplicate product names in the export table:\n ${duplicateNames}\n",
            needFix: "Please fix these names before exporting.",
            exportNames: "Please review export stages of the following product(s):\n\n ${exportNames}",
            confirm: "\nDo you want to proceed with the new export job?",
            unassignedJob: "Assertion failed:\n\nExport job has been completed without a jobId assigned.",
            unknownJob: "Assertion failed:\n\nExport job has been completed with an unknown jobId.",
            unknownMessage: "Assertion failed:\n\nUnknown export completion message (${jobStatus}).",
            succeededMessage: " Export Succeeded",
            failedMessage: "Export Failed",
            fileNotExist: "File no longer exists. Please export the map again.",
            checkConnection: "Please check your Internet connection (status code ${linkStatus}).",
            openInNewWindow: "Popups are probably blocked in your browser. Right-click the link and select 'Open link in new window'.",
            exportError: "Assertion failed:\n\nExporter.setExportContentDiv() is not available after the export process started."
        },
        podLayerList: {
            defaultTitle: "Please select a product to enable this control.",
            restrictTitle: "View only.\nModifications disabled by administrator.",
            basemapUncheckTitle: "This layer (${layerName}) is the current basemap layer and it cannot be unchecked.",
            layerUnckeckTitle: "This layer (${layerName}) is the current extent layer and it cannot be unchecked.",
            visibilityChange: "Assertion failed:\n\nLayer visibility cannot be changed when no product is selected (product == null).",
            noValueChange: "Assertion failed:\n\nThe same value (${newValue}) is being applied for the layer's grid cell."
        },
        podMap: {
            layerLoading: "Assertion failed:\n\nLayer (${layerName}) being added is already in loading state.",
            layerNotInMap: "Assertion failed:\n\nLayer (${layerName}) being added is not on map but is in loading state.",
            layerNotVisible: "Assertion failed:\n\nThe dynamic layer synced (${layerName}) is not visible.",
            layerNonVisible: "Assertion failed:\n\nThe current extent layer (${layerName}) is marked non-visible in the layers list.",
            layerNotMatch: "Assertion failed:\n\nCurrent basemap layer (${basemapID}) does not match the layer (${layerID}) associated with the product."
        },
        productFactory: {
            title: "Choose a Product..."
        },
        productPanel: {
            productPanelTitle: "Export Queue",
            exportButtonLabel: "Export Products",
            deleteSelectedProduct: "Are you sure you wish to delete selected products?",
            deleteAllProduct: "Are you sure you wish to delete all the products?",
            nothingToExport: "Nothing to export.\n" +
                "Please add some products to the export list first:\n\n" +
                "- Click \"Choose a Product...\" icon and select a product in the dialog;\n" +
                "- Click \"Choose a Tool...\" icon and select a tool in the dialog;\n" +
                "- Click or draw on the map to select extent(s).",
            selectToExport: "Please select up to ${maxProducts} products for export.\n\nHold Ctrl when clicking to select more than one product.",
            confirmAllExport: "All products in the list will be exported.",
            confirmSelectedExport: "Only first ${maxProducts} selected products will be exported."
        },
        search: {
            searchHint: "Search for location...",
            unexpectedResponse: "Unexpected response from server:\n\n Result name = ${paramName} (expected \"out_extent\")",
            noItemFound: "No item found"
        },
        selectionTool: {
            noFeaturePresented: "No features are present in the specified area.\n\rPlease click in an area where a feature exists and then use the \"Move extent\" tool to adjust the location",
            invalidOperation: "Assertion failed:\n\nThis selection operation is only valid for custom AOIs of a Fixed extent product.",
            invalidOperationForNonFixed: "This selection operation is only valid for Fixed extent products.",
            selectionTooLarge: "Selection is too large to be processed by server. Number of features selected: ${featureCount}.",
            areaNoSpecified: "Area not specified",
            unexpectedResponse: "Unexpected response from server:\n\n Result name = ${paramName} (expected \"out_extent\")",
            needTwoPoints: "At least two different points are needed to create a path.",
            selectExtentTooltip: "Select an extent for moving",
            invalidOperationForFixed: "The move operation is only applicable to non-Fixed extent products.",
            moveExtentTooltip: "Select an extent for moving",
            selectProduct: "Assertion failed:\n\nA product should be selected by clicking the \"Choose a Product...\" icon first."
        },
        toolbox: {
            title: "Choose a Tool..."
        }

    },
    zh: true
});
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
    baseSchema : {
        //!!    "$schema": "http://json-schema.org/schema#",
    
    "type": "object",
    "properties": {
        "AppLevelSettings": {
            "type": "object",
            "properties": {
                "logoImage": { "type": "string" },
                "applicationTitle": { "type": "string" },
                "applicationSubtitle": { "type": "string", "required": false },
                "SplashScreen": {
                    "type": "object",
                    "properties": {
                        "enable": { "type": "boolean" },
                        "enableContact": { "type": "boolean" },
                        "title": { "type": "string" },
                        "text": { "type": "string" },
                        "email": { "type": "string" },
                        "emailAlias": { "type": "string" },
                        "website": { "type": "string" }
                    },
                    "optional": true
                },
                "isSplash": { "type": "boolean" },
                "isSplashContactInfo": { "type": "boolean" },
                "splashTitle": { "type": "string" },
                "splashText": { "type": "string" },
                //email regexp = ^([a-z0-9_-]+\.)*[a-z0-9_-]+@[a-z0-9_-]+(\.[a-z0-9_-]+)*\.[a-z]{2,6}$
                "splashEmailDesc": { "type": "string" },
                "splashEmail": { "type": "string", "pattern": "^([a-z0-9_-]+\.)*[a-z0-9_-]+@[a-z0-9_-]+(\.[a-z0-9_-]+)*\.[a-z]{2,6}$" },
                "splashEmailAlias": { "type": "string" },
                "splashWebsiteDesc": { "type": "string" },
                "splashWebsite": { "type": "string" },
                "splashDoNotShow": { "type": "string" },
                "isExportedFilesAliveCheck": { "type": "boolean" },
                "maxProductsInExportGrid": { "type": "number" },
                "maxProductsToExport": { "type": "number" },
                "isDataFieldChecks": { "type": "boolean" },
                "defaultBasemapLayer": { "type": "string" },
                "geocodeServiceUrl": { "type": "string" },
                "geometryServiceUrl": { "type": "string" },
                "gpCalculateExtentUrl": { "type": "string" },
                "gpCalculateStripMapUrl": { "type": "string" },
                "gpCalculatePageSizeUrl": { "type": "string" },
                "gpCalculateScaleUrl": { "type": "string" },
                "gpExportGatewayUrl": { "type": "string" }
            },
            "required": ["logoImage", "applicationTitle", "isSplash", "isSplashContactInfo", "splashTitle", "splashText", "splashEmail", "splashEmailAlias", "splashWebsite",
                         "isExportedFilesAliveCheck", "maxProductsInExportGrid", "maxProductsToExport", "productPanelTitle", "isDataFieldChecks", "defaultBasemapLayer",
                          "geocodeServiceUrl", "geometryServiceUrl", "gpCalculateExtentUrl", "gpCalculateStripMapUrl", "gpCalculateScaleUrl", "gpExportGatewayUrl"],
            "additionalProperties": false
        },

        "ProductTypes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "value": { "enum": ["Fixed", "Area", "Scale", "PageSize"] },
                    "source": { "type": ["string", "null"] }
                },
                "required": ["value", "source"],
                "additionalProperties": false
            }
        },
        "ExtentLayers": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "value": { "type": "string" },
                    "url": { "type": "string", "format": "uri" },
                    "sublayer": { "type": "number" },
                    "data0": { "type": "string" },
                    "data1": { "type": "string", "optional": true },
                    "oidField": { "type": "string", "optional": true }
                },
                "required": ["value", "url", "sublayer", "data0"],
                "additionalProperties": false
            }
        },
        "BasemapLayers": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "value": { "type": "string" },
                    "url": { "type": "string", "format": "uri" },
                    "oidField": { "type": "string", "optional": true }
                },
                "required": ["value", "url"],
                "additionalProperties": false
            }
        },
        "Exporters": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "value": { "type": "string" },
                    "extensions": { "type": "string" }
                },
                "required": ["value", "extensions"],
                "additionalProperties": false
            }
        },
        "ScaleList": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "value": { "type": "number" },
                    "displayName": { "type": "string" }
                },
                "required": ["value", "displayName"],
                "additionalProperties": false
            }
        },
        "PageSizeList": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "value": { "type": "string" },
                    "displayName": { "type": "string" },
                    "tooltip": { "type": "string" },
                    "width": { "type": "number", "optional": true },
                    "height": { "type": "number", "optional": true },
                    "units": { "enum": ["INCHES", "POINTS", "MILLIMETERS", "CENTIMETERS"], "optional": true }
                },
                "required": ["value", "displayName", "tooltip"],
                "additionalProperties": false
            }
        },
        "MapCommands": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "value": { "type": "string" },
                    "displayName": { "type": "string" },
                    "image": { "type": "string" },
                        "tooltip": { "type": "string" }
                },
                "required": ["value", "displayName", "image", "tooltip"],
                "additionalProperties": false
            },
            "minItems": 2
        },
        "BaseProductTable": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "attr": { "type": "string", "required": true },
                    "domain": { "type": "string", "optional": true },
                    "displayName": { "type": "string", "optional": true },
                    "passToServer": { "type": "boolean", "optional": true },
                    "value": { "type": "any", "optional": true },
                    "isEditable": { "type": "boolean", "optional": true },
                    "filter": { "type": "array", "items": { "type": "string" }, "optional": true }
                }
            }
        },

        "BaseProductInstanceTable": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "attr": { "type": "string", "required": true },
                    "displayName": { "type": "string", "optional": true },
                    "source": { "type": "string", "optional": true },
                    "passToServer": { "type": "boolean", "optional": true },
                    "isEditable": { "type": "boolean", "optional": true }
                }
            }
        },

        "ProductDefinitions":
        {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "attrTable": { "type": "string", "required": true },
                    "instanceTable": { "type": "string", "optional": true }
                },
                "additionalProperties": false
            }
        }
    }
    },

    productTableDefinition : {
        id: "productTable",
        type: "array",
        items: {
        "type": "object",
        "properties": {
            "attr": { "type": "string", "required": true },
            "displayName": { "type": "string", "optional": true },
            "domain": { "type": "string", "optional": true },
            "value": { "type": "any", "optional": true },
            "isEditable": { "type": "boolean", "optional": true },
            "filter": { "type": "array", "items": { "type": "string" }, "optional": true },
            "source": { "type": "string", "optional": true },
            "passToServer": { "type": "boolean", "optional": true }
        },
        "additionalProperties": false
    }
    },

    instanceTableDefinition : {
    "id": "instanceTable",
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "attr": { "type": "string", "required": true },
            "displayName": { "type": "string", "optional": true },
            "isEditable": { "type": "boolean", "optional": true },
            "source": { "type": "string", "optional": true }
        },
        "additionalProperties": false
    }
    }
})
    
    
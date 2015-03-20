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
    "dojo/string",
    "dojo/i18n!./nls/podi18n",
    "dojo/domReady!",
    "dojox/json/schema",
    "dojox/json/ref",
    "esri/request",
    "./podconfig",
    "./ConfigurationSchema",
    "./podUtilities"
], function (declare, lang, string, i18n, domReady, schema, ref, esriRequest, podconfig, ConfigurationSchema) {

    var errorsCount = [];
    var errors = [];
    var isStopped = false;

    var ConfigurationManager = declare("ConfigurationManager", [], {
        configuration: null,

        constructor: function() {
        	
           if (this.configuration !== null)
                return;

           this.configuration = podconfig.podConfig;
        },

        validate: function() {
            errors = [];
            
            if (podconfig.isSyntaxError == null)
                this.writeError(i18n.configurationManager.syntaxError);

            this.validateConfiguration(this.configuration, ConfigurationSchema.baseSchema);

            for (i = 0; i < this.configuration.ProductDefinitions.length; i++) {
                var attributeTable = this.configuration.ProductDefinitions[i].attrTable;
                if (attributeTable)
                	this.validateConfiguration(this.configuration[attributeTable], ConfigurationSchema.productTableDefinition);

                var instanceTable = this.configuration.ProductDefinitions[i].instanceTable;
                if (instanceTable)
                	this.validateConfiguration(this.configuration[instanceTable], ConfigurationSchema.instanceTableDefinition);
            }

            //check ProductTypes attributes.
            for (i = 0; i < this.configuration.ProductTypes.length; i++) {
                //check source
                var source = this.configuration.ProductTypes[i].source;
                if (source && !this.configuration[source]) {
                    this.writeError(string.substitute(i18n.configurationManager.domainNotDefinited, {
                        propertyName: i,
                        domainName: source
                    }));
                }
            }

            //check MapCommands domain
            if (this.configuration.MapCommands[0].value != "-")
                this.writeError(string.substitute(i18n.configurationManager.domainValueInvalid, {
                    domainName: source,
                    domainValue: this.configuration.MapCommands[0].value
                }));

            //check BasemapLayers domain
            var defaultBasemapLayer = this.getApplicationSetting("defaultBasemapLayer");
            var isDefaultBasemapLayerValid = false;
            for (i = 0; i < this.configuration.BasemapLayers.length; i++) {
                if (this.configuration.BasemapLayers[i].value.toLowerCase() === defaultBasemapLayer.toLowerCase())
                    isDefaultBasemapLayerValid = true;
            }
            if (!isDefaultBasemapLayerValid)
                this.writeError(string.substitute(i18n.configurationManager.basemapLayerInvalid, {
                    basemapLayer: defaultBasemapLayer
                }));

            //check product tables
            var instanceProducts = [];

            var booleanAttributeNames = ["layersOverride", "imageOverride"];
            var stringAttributeNames = ["basemapLayer", "description", "exporter", "extentLayer", "gridXml", "makeMapScript", "mapCommandDefault",
                "mxd", "orientation", "pageMargin", "pageSize", "productName", "thumbnail", "type", "layoutrulesXML", "units"
            ];
            var nonredifinedAttributeName = "passToServer";

            //check BaseProductTable
            this.checkAttributes("BaseProductTable", booleanAttributeNames, [], []);
            this.checkDomain("BaseProductTable");

            instanceProducts.push(this.configuration.BaseProductTable);

            //check BaseProductInstanceTablee
            this.checkAttributes("BaseProductInstanceTable", booleanAttributeNames, [], []);
            this.checkDomain("BaseProductInstanceTable", [this.configuration.BaseProductTable]);
            this.checkRedifinedAttribute("BaseProductInstanceTable", nonredifinedAttributeName, [this.configuration.BaseProductTable]);

            //check ProductDefinitions tables
            for (i = 0; i < this.configuration.ProductDefinitions.length; i++) {
                var productTableName = this.configuration.ProductDefinitions[i].attrTable;
                //check product table
                this.checkAttributes(productTableName,
                    booleanAttributeNames,
                    stringAttributeNames, ["scale"]);
                this.checkDomain(productTableName, [this.configuration.BaseProductTable]);
                instanceProducts.push(this.configuration[productTableName]);

                //check BaseProductInstanceTable using base tables
                this.checkDomain("BaseProductInstanceTable", [this.configuration.BaseProductTable, this.configuration[productTableName]]);
                this.checkRedifinedAttribute("BaseProductInstanceTable", nonredifinedAttributeName, [this.configuration[productTableName]]);

                //check product instance table
                var instanceTableName = this.configuration.ProductDefinitions[i].instanceTable;
                if (instanceTableName) {
                    if (!this.configuration[instanceTableName])
                        this.writeError(string.substitute(i18n.configurationManager.tableNotDefined, {
                            tableName: instanceTableName,
                            productName: this.configuration.ProductDefinitions[i]
                        }));
                    this.checkAttributes(instanceTableName, booleanAttributeNames, [], []);
                    this.checkDomain(instanceTableName, [this.configuration.BaseProductTable, this.configuration[productTableName], this.configuration.BaseProductInstanceTable]);
                    this.checkRedifinedAttribute(instanceTableName, nonredifinedAttributeName, [this.configuration.BaseProductInstanceTable, this.configuration[productTableName]]);
                }
            }

            //check Fields
            if (this.configuration.AppLevelSettings.isDataFieldChecks) {
                var checkList = [];
                for (i = 0; i < instanceProducts.length; i++) {
                    var instanceProduct = instanceProducts[i];
                    for (var propertyName in instanceProduct)
                        if (instanceProduct[propertyName].source !== undefined)
                            this.fieldsCheck(instanceProduct, instanceProduct[propertyName].attr, checkList);
                }

                for (i = 0; i < checkList.length; i++)
                    esriRequest(lang.mixin(checkList[i], {
                        content: {
                            f: "json"
                        },
                        callbackParamName: "callback",
                        error: this.fieldsCheckCancel,
                        load: this.fieldsCheckOK,
                        writeError: this.writeError
                    }));
            }
            return errors.length === 0;
        },

        validateConfiguration: function (configuration, configurationSchema) {
            var resolvedConfigurationSchema = ref.resolveJson(configurationSchema);
            var result = schema.validate(configuration, resolvedConfigurationSchema);

            var i;
            if (!result.valid) {
                for (i = 0; i < result.errors.length; i++)
                    this.writeError(string.substitute(i18n.configurationManager.propertyMessage, {
                        propertyName: result.errors[i].property,
                        propertyMsg: result.errors[i].message
                    }));
            }
        },

        writeError: function(message, isContinue) {
            if (isStopped)
                throw i18n.configurationManager.alreadyStopped + message;

            // Prevent displaying the same message multiple times
            if (isContinue) {
                var index = errors.length;
                while (index--) {
                    if (message == errors[index])
                        break;
                }

                if (index >= 0) {
                    errorsCount[index]++;
                } else {
                    errorsCount.push(4); // push 1, 2, 4, 8, 16, or more to tune frequency of messages
                    errors.push(message);
                }
                // show message when count reaches 1, 2, 4, 8, 16, ...
                if ((errorsCount[index] & (errorsCount[index] - 1)) !== 0) // Ignore JSLint's "Unexpected use of '&'" in this line
                    return;
            }

            var headE = i18n.configurationManager.headE;
            alert(((isContinue) ? i18n.configurationManager.headW : headE) + message);

            // Note: All remaining asynchronous functions like setTimeout or XMLHttpRequest will still execute.
            // Currently there is no standard way to completely terminate JavaScript.
            if (!isContinue) {
                isStopped = true;
                throw string.substitute(i18n.configurationManager.stopped, {
                    errorMsg: message
                });
            }
        },

        checkType: function(variable, type, message) {
            if (variable == null)
                this.writeError(string.substitute(i18n.configurationManager.valueNotDefined, {
                    message: message
                }));
            if (type !== undefined && typeof variable != type)
                this.writeError(string.substitute(i18n.configurationManager.valueNotExpected, {
                    message: message,
                    variableType: typeof variable,
                    expectedType: type
                }));
        },

        checkAttributes: function(tableName, booleanAttributeNames, stringAttributeNames, numberAttributeNames, baseTables) {
            for (var j = 0; j < this.configuration[tableName].length; j++) {
                var attributes = this.configuration[tableName][j];
                var attributeName = attributes.attr;

                //check boolean properties
                if (booleanAttributeNames.indexOf(attributeName) != -1) {
                    this.checkType(attributes.value, "boolean", "Property {0}['{1}'].value".format(tableName, attributeName));
                }

                //check string properties
                if (stringAttributeNames.indexOf(attributeName) != -1) {
                    this.checkType(attributes.value, "string", "Property {0}['{1}'].value".format(tableName, attributeName));
                }

                //check number properties
                if (numberAttributeNames.indexOf(attributeName) != -1) {
                    this.checkType(attributes.value, "number", "Property {0}['{1}'].value".format(tableName, attributeName));
                }

                //check mapExtent. It is allowed to be null
                if (attributeName === "mapExtent" && attributes.value) {
                    this.checkType(attributes.value, "object", "Property {0}['{1}'].value".format(tableName, attributeName));
                    this.checkMapExtentValue(attributes.value, "{0}['{1}'].value".format(tableName, attributeName));
                }

                //check pageMargin
                if (attributeName === "pageMargin" && attributes.value) {
                    this.checkType(attributes.value, "string", "Property {0}['{1}'].value".format(tableName, attributeName));
                    this.checkPageMarginValue(attributes.value, "{0}['{1}'].value".format(tableName, attributeName));
                }
            }
        },

        checkRedifinedAttribute: function(tableName, checkedAttributeName, baseTables) {
            for (var j = 0; j < this.configuration[tableName].length; j++) {
                var attributes = this.configuration[tableName][j];
                if (attributes[checkedAttributeName] != null && baseTables)
                    for (var k = 0; k < baseTables.length; k++) {
                        var baseTableAttribute = this.getTableAttributeByName(baseTables[k], attributes.attr);
                        if ((baseTableAttribute && baseTableAttribute[checkedAttributeName] != null))
                            this.writeError(i18n.configurationManager.passToServerRedefined);
                    }
            }
        },

        checkMapExtentValue: function(mapExtent, message) {
            this.checkType(mapExtent.xmin, "number", "{0}.xmin".format(message));
            this.checkType(mapExtent.ymin, "number", "{0}.ymin".format(message));
            this.checkType(mapExtent.xmax, "number", "{0}.xmax".format(message));
            this.checkType(mapExtent.ymax, "number", "{0}.ymax".format(message));
            this.checkType(mapExtent.spatialReference.wkid, "number", "{0}.spatialReference.wkid".format(message));
        },

        checkPageMarginValue: function(pageMargin, message) {

            pageMargin = PodUtilities.trim(pageMargin);
            var marginValues = pageMargin.split(" ");
            if (marginValues.length > 5)
                this.writeError(string.substitute(i18n.configurationManager.tooManyDefined, {
                    message: message
                }));

            var lastValue = marginValues[marginValues.length - 1].toUpperCase();
            if (isNaN(parseFloat(lastValue))) {
                marginValues.length--;
                if (lastValue !== "INCHES" && lastValue !== "MILLIMETERS" && lastValue !== "CENTIMETERS" && lastValue !== "POINTS") {
                    this.writeError(string.substitute(i18n.configurationManager.unknownUnits, {
                        message: message
                    }));
                }
            }

            for (var i = 0; i < marginValues.length; ++i) {
                if (isNaN(parseFloat(marginValues[i]))) {
                    this.writeError(string.substitute(i18n.configurationManager.inValidNumber, {
                        message: message,
                        number: marginValues[i]
                    }));
                }
            }
        },

        checkValueFromDomain: function(domain, requestedValue) {
            for (var k = 0; k < domain.length; k++) {
                if (!requestedValue || domain[k].value === requestedValue || (typeof requestedValue === "string" && typeof domain[k].value === "string" && domain[k].value.toLowerCase() == requestedValue.toLowerCase())) {
                    return true;
                }
            }
            return false;
        },

        checkDomain: function(tableName, baseTables) {
            for (var j = 0; j < this.configuration[tableName].length; j++) {
                var attributes = this.configuration[tableName][j];
                var domainName = attributes.domain;
                if (attributes.domain) {
                    if (!this.configuration[domainName]) {
                        this.writeError(string.substitute(i18n.configurationManager.tableDomainNotDefinited, {
                            tableName: tableName,
                            id: j,
                            domainName: domainName
                        }));
                        domainName = null;
                    }
                }

                if (!domainName && baseTables) {
                    for (var k = 0; k < baseTables.length; k++) {
                        var baseTable = baseTables[k];
                        for (var i = 0; i < baseTable.length; i++) {
                            if (baseTable[i].attr === attributes.attr && baseTable[i].domain && this.configuration[baseTable[i].domain]) {
                                domainName = baseTable[i].domain;
                                break;
                            }
                        }
                    }
                }

                if (domainName) {
                    var domain = this.configuration[domainName];
                    if (attributes.value && !this.checkValueFromDomain(domain, attributes.value)) {
                        this.writeError(string.substitute(i18n.configurationManager.tableInvalidValue, {
                            tableName: tableName,
                            id: j,
                            value: attributes.value,
                            domainName: domainName
                        }));
                    }

                    if (attributes.filter) {
                        for (var f = 0; f < attributes.filter.length; f++) {
                            if (!this.checkValueFromDomain(domain, attributes.filter[f])) {
                                this.writeError(string.substitute(i18n.configurationManager.tableInvalidValue, {
                                    tableName: tableName,
                                    id: j,
                                    value: attributes.filter[f],
                                    domainName: domainName
                                }));
                            }
                        }
                    }
                } else if (attributes.value && attributes.filter) {
                    if (attributes.filter.indexOf(attributes.value) == -1) {
                        this.writeError(string.substitute(i18n.configurationManager.tableInvalidValue, {
                            tableName: tableName,
                            id: j,
                            value: attributes.value,
                            domainName: domainName
                        }));
                    }
                }
            }
        },

        getTableAttributeByName: function(table, attributeName) {
            for (var i = 0; i < table.length; i++) {
                if (table[i].attr === attributeName)
                    return table[i];
            }
            return null;
        },

        fieldsCheck: function(product, propertyName, checkList) {
            var i, j;
            var productTypeAttribute = this.getTableAttributeByName(product, "type");
            var baseTypeAttribute = this.getTableAttributeByName(this.configuration.BaseProductTable, "type");

            var domainName = productTypeAttribute.domain ? productTypeAttribute.domain : baseTypeAttribute ? baseTypeAttribute.domain : null;
            if (!domainName)
                return;

            var productTypes = this.configuration[domainName];
            for (i = 0; i < productTypes.length; i++)
                if (productTypeAttribute.value == productTypes[i].value)
                    break;

            var productAttribute = this.getTableAttributeByName(product, propertyName);
            var sourceFieldName = productAttribute.source;
            var extentLayersName = productTypes[i].source;
            if (extentLayersName === null)
                return;

            var extentLayers = this.configuration[extentLayersName];
            for (i = 0; i < extentLayers.length; i++) {
                var context = {};
                var extentLayer = extentLayers[i];
                var extentLayerProductAttribute = this.getTableAttributeByName(product, "extentLayer");
                if (extentLayer.value != extentLayerProductAttribute.value)
                    continue;

                var fieldName = extentLayer[sourceFieldName];
                var extentLayersI = extentLayersName + "[" + i + "]";
                context.url = extentLayer.url + "/" + extentLayer.sublayer;
                var msg = productAttribute.value + "['" + propertyName + "'].source";
                // jshint eqnull:true
                if (fieldName == null)
                    this.writeError(string.substitute(i18n.configurationManager.propertyNotFound, {
                        attributeName: msg,
                        propertyName: extentLayersI,
                        fieldName: sourceFieldName
                    }));

                for (j = 0; j < checkList.length; j++)
                    if (checkList[j].url == context.url)
                        break;

                if (j != checkList.length)
                    context = checkList[j];
                else {

                    context.fieldNames = [];
                    context.msgNoField = [];
                    context.msgFieldOK = [];
                    context.msgNoFields = [];
                    checkList.push(context);
                }

                var msgCheck = ("Checking fields referred to in {0} ({1})...\n\n").format(msg, sourceFieldName);
                context.msgNoFields.push("{0}Cannot obtain the fields list for layer {1} at\n{2}".format(msgCheck, extentLayersI, context.url));
                context.msgNoField.push("{0}The field ({1}) cannot be found in layer {2} at\n{3}".format(msgCheck, fieldName, extentLayersI, context.url));
                console.log("Field {0}.{1} ({2}) has been prepared for availability check".format(extentLayersI, sourceFieldName, fieldName));
                context.msgFieldOK.push("Field {0}.{1} ({2}) check OK".format(extentLayersI, sourceFieldName, fieldName));
                context.fieldNames.push(fieldName.toLowerCase());
            }
        },

        fieldsCheckCancel: function(error) {
            this.writeError(error.name + ": " + error.message + "\n" + error.description + "\n\n" + this.msgNoFields[0], true);
        },

        fieldsCheckOK: function(response) { // , io)
            var fields = response.fields;
            if (fields === null) {
                this.writeError(this.msgNoFields[0], true);
                return;
            }
            for (var i = 0; i < this.fieldNames.length; i++) {
                var isFound = false;
                for (var j = 0; j < fields.length && !isFound; j++) {
                    if (fields[j].name.toLowerCase() == this.fieldNames[i])
                        isFound = true;
                }
                if (isFound) {
                    console.log(this.msgFieldOK[i]);
                } else {
                    this.writeError(this.msgNoField[i], true);
                }
            }
        },

        getApplicationSetting: function(name, isOptional) {
            if (!isOptional && this.configuration.AppLevelSettings[name] === undefined)
                this.writeError(string.substitute(i18n.configurationManager.settingNotDefined, {
                    settingName: name
                }));
            return this.configuration.AppLevelSettings[name];
        },

        getTable: function(name, isOptional) {
            if (!isOptional && this.configuration[name] === undefined)
                this.writeError(string.substitute(i18n.configurationManager.settingNotDefined, {
                    tableName: name
                }));
            return this.configuration[name];
        },

        getBaseTableProperties: function(attributeName, propertyName) {
            var attribute = this.getTableAttributeByName(this.configuration.BaseProductTable, attributeName);
            return attribute !== undefined ? attribute[propertyName] : undefined;
        },

        getTableProperties: function(attributeName, propertyName) {
            var properties = [];
            this.addPropertyFromTable(this.configuration.BaseProductTable, attributeName, propertyName, properties);
            this.addPropertyFromTable(this.configuration.BaseProductInstanceTable, attributeName, propertyName, properties);

            for (var i = 0; i < this.configuration.ProductDefinitions.length; i++) {
                var productTable = this.configuration[this.configuration.ProductDefinitions[i].attrTable];
                this.addPropertyFromTable(productTable, attributeName, propertyName, properties);

                var instanceTableName = this.configuration.ProductDefinitions[i].instanceTable;
                if (instanceTableName)
                    this.addPropertyFromTable(instanceTableName, attributeName, propertyName, properties);
            }
            return properties;
        },

        addPropertyFromTable: function(table, attributeName, propertyName, destination) {
            var attribute = this.getTableAttributeByName(table, attributeName);
            if (attribute && attribute[propertyName] && destination.indexOf(attribute[propertyName]) == -1)
                destination.push(attribute[propertyName]);
        }
    });

    return new ConfigurationManager();
});
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
    "dojo/_base/array",
    "esri/toolbars/edit",
    "../ConfigurationManager",
    "../podUtilities"
], function(declare, lang, array, toolbarEdit, cfgManager) {

    declare("ProductDescriptor", null, {
        table: null,
        productDescriptor: null,
        constructor: function(productDescriptorName) {

            if (productDescriptorName == null)
                return;

            this.table = lang.clone(cfgManager.getTable("BaseProductTable"));

            if (!ProductDescriptor.isEmpty(productDescriptorName)) {
                this.productDescriptor = lang.clone(cfgManager.getTable(productDescriptorName, true));
            }
            // Add attributes missing in the BaseProductTable
            if (this.productDescriptor != null) {

                for (var iAttr in this.productDescriptor) {
                    this.setTableAttribute(this.productDescriptor[iAttr]);
                }
            }
        },

        setTableAttribute: function(attrDesc) {
            if (this.table == null) {
                return;
            }
            if (attrDesc == null) {
                return;
            }

            var attrFound = false,
                attrKeys, val;
            array.forEach(this.table.filter(
                    function(attribute) {
                        return attribute.attr === attrDesc.attr;
                    }),
                function(tableAttribute) {
                    attrFound = true;
                    attrKeys = Object.keys(attrDesc);

                    array.forEach(attrKeys.filter(function(value) {
                            return (value !== "attr");
                        }),
                        function(attrElem) {
                            val = attrDesc[attrElem];
                            if (val !== undefined) {
                                tableAttribute[attrElem] = val;
                            }
                        });
                });

            if (!attrFound) {
                // Append missing attribute
                this.table.push(attrDesc);
            }
        },

        setTableAttributeValue: function(attrName, value) {

            var attr = this.getAttribute(attrName);
            if (attr == null) {
                return;
            }
            attr.value = value;
        },

        getAttribute: function(attr) {

            if (this.table == null) {
                return null;
            }

            for (var iAttr in this.table) {
                if (this.table[iAttr].attr == attr) {
                    return this.table[iAttr];
                }
            }

            return null;
        },

        getDisplayedAttributes: function() {
            var dispAttrs = [];
            for (var iAttr in this.table) {
                var dispName = this.table[iAttr].displayName;
                if (!ProductDescriptor.isEmpty(dispName)) {
                    dispAttrs.push(this.table[iAttr]);
                }
            }
            return dispAttrs;

        }


    });

    ProductDescriptor.isEmpty = function(str) {

        return (str === undefined || str === null || PodUtilities.trim(str) === "");
    };

    ProductDescriptor.getDomain = function(name) {

        return cfgManager.getTable(name);
    };

    // Product class declaration
    return declare("Product", ProductDescriptor, {

        constructor: function(productDef) {
            ProductDescriptor.call(this, productDef.attrTable);
            var productNameAttr = this.getAttribute("productName");
            if (productNameAttr == null)
                return null;

            this.productName = productNameAttr.value;

            var typeAttr = this.getAttribute("type");
            if (typeAttr == null)
                return null;

            this.type = typeAttr.value;
            this.instanceTableName = productDef.instanceTable;
        },

        getCopy: function() {
            var productInstance = {}.toString.apply(this) === "[object Array]" ? [] : {};
            for (var i in this) {
                productInstance[i] = typeof this[i] === "object" ? lang.clone(this[i]) : this[i];
            }
            return productInstance;

        },

        getAttributeValue: function(attrName) {
            var attr = this.getAttribute(attrName);
            if (attr == null) {
                return "";
            }

            if (!ProductDescriptor.isEmpty(attr.value)) {
                return attr.value;
            }

            return "";
        },

        setAttributeValue: function(attr, value) {
            if (attr === "productName" || attr === "type") {
                return;
            }
            this.setTableAttributeValue(attr, value);
        },

        prepareInstance: function(isCustom) {
            this.uuid = PodUtilities.generateUUID();
            this.isCustom = isCustom == null ? true : isCustom;

            this.pageExtent = new ProductPageExtent(this);

            // Merge BaseProductInstanceTable first
            var pit = lang.clone(cfgManager.getTable("BaseProductInstanceTable"));
            for (var iAttrPIT in pit) {
                this.setTableAttribute(pit[iAttrPIT]);
            }
            if (ProductDescriptor.isEmpty(this.instanceTableName)) {
                return;
            }
            var instanceTable = lang.clone(cfgManager.getTable(this.instanceTableName, true));
            if (instanceTable == null) {
                return;
            }
            for (var iAttr in instanceTable) {
                this.setTableAttribute(instanceTable[iAttr]);
            }
        },

        getAttributeCount: function() {

            if (this.table == null) {
                return null;
            }
            return this.table.length;
        },

        getAttributeByIndex: function(idx) {
            if (this.table == null) {
                return null;
            }
            if (idx < 0 || idx >= this.table.length) {
                return null;
            }
            return this.table[idx];
        },

        getAttributesByKey: function(key) {

            var product = this.getCopy();
            product.prepareInstance();
            var cnt = product.getAttributeCount();
            var attrArray = [];
            for (var iAttr = 0; iAttr < cnt; ++iAttr) {
                var attr = product.getAttributeByIndex(iAttr);
                if (attr != null) {
                    var keyValue = attr[key];
                    if (!ProductDescriptor.isEmpty(keyValue)) {
                        attrArray.push(attr);
                    }
                }
            }

            return attrArray;
        },

        getPassToServerAttributes: function() {
            var passedAttrs = [];
            for (var iAttr in this.table) {
                if (this.table[iAttr].passToServer === true) {
                    passedAttrs.push(this.table[iAttr]);
                }
            }
            return passedAttrs;
        },

        getPageSizeValue: function(attr, domainAttrName) {
            var retval = "";
            if (attr == null || attr.attr !== "pageSize") {
                return retval;
            }
            var psDomain = cfgManager.getTable(attr.domain);
            for (var iPS in psDomain) {
                var ps = psDomain[iPS];
                if (ps.value !== domainAttrName) {
                    continue;
                }
                if (ProductDescriptor.isEmpty(ps.width)) {
                    return ps.value;
                }
                retval += ps.width.toString() + " ";
                if (ProductDescriptor.isEmpty(ps.height)) {
                    ps.height = ps.width;
                }
                retval += ps.height.toString();

                if (!ProductDescriptor.isEmpty(ps.units)) {
                    retval += " " + ps.units.toUpperCase();
                }

                break;
            }

            return retval;
        },

        formatPageSizeValue: function() {

            var pageSize = this.getAttribute("pageSize");
            var orient = this.getAttributeValue("orientation");

            if (pageSize == null)
                return "A4 PORTRAIT";

            var ps = pageSize.value;
            if (ps == null)
                ps = "";

            var value = "CUSTOM";
            ps = ps.toUpperCase();
            var isCustom = (ps.split(" ").length != 1) ? true : false;
            if (!isCustom)
                value = ps;

            var orientation = ProductDescriptor.isEmpty(orient) ? "PORTRAIT" : orient.toUpperCase();
            value += " " + orientation;

            if (isCustom) {
                var size = ps.split(" ");
                var width = parseFloat(size[0]);
                var height = parseFloat(size[1]);
                var units = size[2];
                if ((orientation === "PORTRAIT" && width > height) ||
                    (orientation === "LANDSCAPE" && width < height))
                    value += " " + height + " " + width + " " + units;
                else
                    value += " " + ps;
            }

            return value;
        },

        setGeometry: function(podMap, geometry) {
            if (!this.pageExtent.podMap) {
                this.pageExtent.podMap = podMap;
            }
            this.pageExtent.setGeometry(geometry);
        },

        draw: function() {
            this.pageExtent.addToMap();
        },

        hide: function() {
            this.pageExtent.removeFromMap();
        },

        getDataframe: function() {
            return this.pageExtent.getDataframe();
        },

        getMoveGraphic: function() {
            return this.pageExtent.getMoveGraphic();
        },

        setHighlighted: function(highlight) {
            this.pageExtent.setHighlighted(highlight);
        },

        putOnTop: function() {
            this.pageExtent.putOnTop();
        },

        updateGraphics: function() {
            this.pageExtent.updateGraphics();
        },

        setMoved: function(toMove) {
            this.pageExtent.move(toMove);
        },

        replace: function(geometry) {
            this.pageExtent.replace(geometry);

            //reactivate the edit toolbar
            if (this.editToolbar) {
                this.editToolbar.deactivate();
                this.editToolbar.activate(toolbarEdit.MOVE, this.getMoveGraphic());
            }
        },

        activateEditor: function(podMap, onEditStart, onEditEnd) {
            if (!this.isCustom) {
                return;
            }

            if (this.editToolbar != null && podMap === false) {
                this.editToolbar.deactivate();
                this.editToolbar = null;

                this.pageExtent.move(false);

                return;
            }
            if (!podMap) {
                return;
            }

            this.editToolbar = podMap.createEditToolbar();
            this.editToolbar.activate(toolbarEdit.MOVE, this.getMoveGraphic());

            this.editToolbar.on("graphic-move-start", onEditStart);
            this.editToolbar.on("graphic-move-stop", onEditEnd);
        }
    });
});
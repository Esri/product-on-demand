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
    "dojo/dom",
    "dojo/dom-construct",
    "../ConfigurationManager",
    "../Product/ProductList",
    "../Product/ProductDescriptor",
    "../podUtilities"
], function(declare, lang, array, dom, domConstruct, cfgManager) {

    return declare("ProductFactoryList", ProductList, {
        classes: {
            optionsContainer: "productTypeOptionsContainer",
            emptyItem: "empty",
            productList: "",
            selectedOpenItem: "productTypeItemSelectedOptions",
            selectedItem: "productTypeItemSelected",
            notSelectedItem: "productTypeItem"
        },

        constructor: function(lid, parentNode) {

            if (dom.byId(lid) != null || parentNode == null) {
                return null;
            }
			
            //ProductList.call(this, lid, parentNode);

            this.alwaysSelection = true;
            this.allowDeleting = false;
            this.listContainer = document.createElement("div");
            this.listContainer.id = this.theID;
            this.listContainer.className = "ProductListContainer";

            var productList = document.createElement("ul");
            productList.id = "listAllProductTypes_" + this.theID;
            productList.className = "ProductList";
            this.listContainer.appendChild(productList);
            parentNode.appendChild(this.listContainer);

            this.productList = productList;
        },

        CreateOptionGrid: function(container, productId) {

            var table = document.createElement("table");
            table.id = "typeOptionGrid";
            table.className = "productTypeOptionTable";
            var product = dom.byId(productId).productDef;

            var dispAttr = product.getDisplayedAttributes();
            var tabindex = 10;

            function optionChanged(e) {
                var optNode = e.target[e.target.selectedIndex];
                var datatypeAttr = optNode.attributes.datatype;
                var datatype = (datatypeAttr == null) ? "string" : datatypeAttr.value;
                var data = (datatype === "number") ? parseFloat(optNode.value) : optNode.value;
                product.setAttributeValue(e.target.productAttr, data);
            }

            function valueChanged(e) {
                product.setAttributeValue(e.target.productAttr, e.target.value);
            }

            for (var iAttr in dispAttr) {
                var attr = dispAttr[iAttr];

                var pvalue = attr.value;
                var isEditable = attr.isEditable === true;

                // Attribute name
                var tr = document.createElement("tr");
                var td_name = document.createElement("td");
                td_name.className = "productOptionName";
                td_name.innerHTML = attr.displayName;
                tr.appendChild(td_name);

                var td_value = document.createElement("td");
                td_value.className = "productOptionValue";
                td_value.id = productId + attr.attr;

                if (isEditable !== true) {
                    td_value.innerHTML = pvalue;
                } else if (ProductDescriptor.isEmpty(attr.domain) && ProductDescriptor.isEmpty(attr.filter)) {
                    if (pvalue == null) {
                        pvalue = "";
                    }

                    var ined = document.createElement("input");
                    ined.type = "text";
                    ined.title = "Click to start editing";
                    ined.value = pvalue;
                    ined.productAttr = attr.attr;
                    ined.className = "productOptionEditable";
                    if (attr.validate === "number") {
                        ined.onkeypress = PodUtilities.validateNumber;
                    }
                    ined.tabIndex = ++tabindex;
                    ined.onchange = valueChanged;

                    td_value.appendChild(ined);
                } else {
                    if (!ProductDescriptor.isEmpty(attr.value)) {
                        pvalue = attr.value;
                    }
                    var attrSel = document.createElement("select");
                    attrSel.className = "productItemSelectedOptionsSelect";
                    attrSel.id = productId + attr.attr + " selector";
                    attrSel.productAttr = attr.attr;

                    // Attribute value
                    if (attr.filter != null) {
                        for (var ifv in attr.filter) {
                            var attrOpt = document.createElement("option");
                            var fvalue = attr.filter[ifv];
                            attrOpt.innerHTML = fvalue;
                            attrOpt.value = fvalue;
                            attrOpt.style.backgroundColor = "window";

                            if (fvalue === pvalue) {
                                attrOpt.selected = true;
                            }
                            attrSel.appendChild(attrOpt);
                        }

                        attrSel.onchange = optionChanged;
                    } else if (attr.domain != null) {
                        var domain = cfgManager.getTable(attr.domain);

                        array.forEach(domain, function(def) {
                            var addOption = true;
                            if (attr.filter != null) {
                                addOption = false;
                                for (var ifv in attr.filter) {
                                    if (def.value === attr.filter[ifv]) {
                                        addOption = true;
                                        break;
                                    }
                                }
                            }

                            if (addOption) {
                                var attrOpt = document.createElement("option");
                                attrOpt.style.backgroundColor = "window";
                                attrOpt.innerHTML = def.value;
                                if (attr.attr === "pageSize") {
                                    def.value = product.getPageSizeValue(attr, def.value);
                                }
                                attrOpt.value = def.value;
                                attrOpt.setAttribute("datatype", typeof(def.value));

                                if (attrOpt.value == pvalue ||
                                    (typeof pvalue === "string" && typeof attrOpt.value === "string" &&
                                        pvalue.toUpperCase() === attrOpt.value.toUpperCase())) {
                                    attrOpt.selected = true;
                                }
                                if (def.tooltip != null) {
                                    attrOpt.title = def.tooltip;
                                }

                                attrSel.appendChild(attrOpt);
                            }
                        });
                        attrSel.onchange = optionChanged;
                    }
                    attrSel.tabIndex = ++tabindex;
                    td_value.appendChild(attrSel);

                }

                tr.appendChild(td_value);
                table.appendChild(tr);
            }
            container.appendChild(table);

        },

        appendProducts: function(productDefs) {
            var productsAdded = 0;
            var li_onclick = lang.hitch(this, function(e) {
                var currentProductId = this.getSelectedProduct();
                if (currentProductId) {
                    var currentProduct = this.productList[currentProductId];

                    if (currentProduct && currentProduct.blocked) {
                        return;
                    }
                }

                this.selectItem(e.currentTarget, this);
            });

            for (var iProduct in productDefs) {

                var product = new Product(productDefs[iProduct]);
                if (product == null) {
                    continue;
                }
                var li = document.createElement("li");
                li.className = this.classes.notSelectedItem;
                li.id = product.productName;

                li.onclick = li_onclick;
                var productItem = "<div id='div_" + li.id + "' >";
                var imgSource = product.getAttributeValue("thumbnail");
                if (imgSource !== "") {
                    imgSource = "images/ProductTypes/" + imgSource;
                }
                var label = li.id;
                var imgTitle = product.getAttributeValue("description");

                productItem += "<img class='productTypeIcon' src='" + imgSource + "' onerror='this.src = &quot;images/ProductTypes/DefaultProduct.png&quot;' />";
                productItem += "<div class='productTypeLabel' id='label_" + label + "' >" + label + " </div>";
                productItem += "</div>";

                li.innerHTML = productItem;
                if (!ProductDescriptor.isEmpty(imgTitle)) {
                    li.title = "Product:\t" + li.id + "\r";
                    li.title += "\r" + imgTitle;
                }
                li.productDef = product;

                this.productList.appendChild(li);

                if (this.OnProductAdded != null) {
                    this.OnProductAdded(product);
                }
                productsAdded++;
            }

            var empty = dom.byId("emptyli" + this.theID);
            if (empty == null) {
                empty = document.createElement("li");
                empty.className = this.classes.emptyItem;
                empty.id = "emptyli" + this.theID;
                this.productList.appendChild(empty);
            } else {
                domConstruct.place(empty, this.productList, "last");
            }

            return productsAdded;
        },

        getSelectedProduct: function() {

            var productId = Object.keys(this.selectedItems)[0];
            var li = dom.byId(productId);

            return (li == null) ? null : li.productDef;
        }

    });

});
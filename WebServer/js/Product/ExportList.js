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
    "../Product/ImagePreview",
    "../SelectionTool",
    "./ProductList",
    "./ProductDescriptor"
], function(declare, lang, array, dom, domConstruct, cfgManager, ImagePreview) {

    return declare("ExportList", ProductList, {
        classes: {
            optionsContainer: "productOptionsContainer",
            emptyItem: "empty",
            productList: "",
            selectedOpenItem: "productItemSelectedOptions",
            selectedItem: "productItemSelected",
            notSelectedItem: "productItem"
        },
        maxProducts: 50,
        constructor: function(listId, parentNode) {
            if (dom.byId(listId) != null || parentNode == null) {
                return;
            }
            //ProductList.call(this, listId, parentNode);

            this.maxProducts = cfgManager.getApplicationSetting("maxProductsInExportGrid");

            this.listContainer = document.createElement("div");
            this.listContainer.id = this.theID;
            this.listContainer.className = "ExportListContainer";

            var productList = document.createElement("ul");
            productList.id = "listAllProducts_" + this.theID;
            productList.className = "ExportList";
            this.listContainer.appendChild(productList);
            parentNode.appendChild(this.listContainer);

            this.productList = dom.byId("listAllProducts_" + this.theID);

            this.draggingItems = null;
        },

        CreateOptionGrid: function(container, productId) {
            if (!container)
                return;

            domConstruct.destroy("optionGrid");

            var table = document.createElement("table");
            table.id = "optionGrid";

            var product = SelectionTool.products[productId];
            var displayedAttributeArray = product.getDisplayedAttributes();
            array.forEach(displayedAttributeArray, function(attr, iAttr) {
                var tr = document.createElement("tr");
                var td_name = document.createElement("td");
                td_name.className = "productOptionName";
                td_name.innerHTML = attr.displayName;

                tr.appendChild(td_name);

                var pvalue = attr.value;
                if (pvalue == null) {
                    pvalue = "";
                }

                var td_value = document.createElement("td");
                td_value.className = "productOptionValue";
                td_value.id = attr.displayName + productId;
                if (attr.isEditable) {
                    if (ProductDescriptor.isEmpty(attr.domain) && ProductDescriptor.isEmpty(attr.filter)) {
                        var ined = document.createElement("input");
                        ined.type = "text";
                        ined.title = "Click to start editing";
                        ined.value = pvalue;
                        ined.className = "productOptionEditable";
                        ined.tabindex = 25 + iAttr;
                        ined.productAttr = attr.attr;
                        ined.onchange = function(e) {
                            product.setAttributeValue(e.target.productAttr, e.target.value);
                        };

                        td_value.appendChild(ined);
                    } else {

                        var attrSel = document.createElement("select");
                        attrSel.className = "productItemSelectedOptionsSelect";
                        attrSel.id = productId + attr.attr + " selector";
                        attrSel.productAttr = attr.attr;

                        if (attr.filter != null) {
                            for (var ifv in attr.filter) {
                                var attrOpt = document.createElement("option");
                                var fvalue = attr.filter[ifv];
                                attrOpt.style.backgroundColor = "window";
                                attrOpt.innerHTML = fvalue;
                                if (fvalue == pvalue) {
                                    attrOpt.selected = true;
                                }

                                attrSel.appendChild(attrOpt);
                            }

                            attrSel.onchange = function(e) {
                                product.setAttributeValue(e.target.productAttr, e.target[e.target.selectedIndex].innerHTML);
                            };

                        } else if (attr.domain != null) {
                            var domain = ProductDescriptor.getDomain(attr.domain);

                            array.forEach(domain, function(def) {
                                var addOption = true;
                                if (attr.filter != null) {
                                    addOption = false;
                                    for (var ifv in attr.filter) {
                                        if (def.value == attr.filter[ifv]) {
                                            addOption = true;
                                            break;
                                        }
                                    }
                                }

                                if (addOption) {
                                    var attrOpt = document.createElement("option");
                                    attrOpt.style.backgroundColor = "window";
                                    attrOpt.innerHTML = def.value;
                                    if (attr.attr == "pageSize") {
                                        def.value = product.getPageSizeValue(attr, def.value);
                                    }

                                    attrOpt.value = def.value;
                                    if (attrOpt.value == pvalue) {
                                        attrOpt.selected = true;
                                    }

                                    if (def.tooltip != null) {
                                        attrOpt.title = def.tooltip;
                                    }

                                    attrSel.appendChild(attrOpt);
                                }

                            });

                            attrSel.onchange = function(e) {
                                product.setAttributeValue(e.target.productAttr, e.target[e.target.selectedIndex].value);
                            };

                        }

                        if (attrSel.selectedIndex == null) {
                            attrSel.SelectedIndex = 0;
                        }

                        td_value.appendChild(attrSel);
                    }
                } else {
                    td_value.innerHTML = pvalue;
                }

                tr.appendChild(td_value);
                table.appendChild(tr);
            });

            container.appendChild(table);

        },

        getItem: function(id) {
            for (var iChild in this.productList.children) {
                var li = this.productList.children[iChild];
                if (li.id === id) {
                    return li;
                }
            }

            return null;
        },

        onDragStart: function(e) {

            if (this.optionGrid != null) {
                var gridParents = document.getElementsByClassName(this.classes.selectedOpenItem);
                if (gridParents.length !== 0 && gridParents[0] != null) {
                    gridParents[0].className = this.classes.notSelectedItem;
                    domConstruct.destroy(this.optionGrid.id);
                }
            }

            if (e.ctrlKey) {
                this.draggingItems = this.getSelected();
            } else {
                this.clearSelection();
                this.draggingItems = [e.currentTarget.id];
            }

            this.setSelected(e.currentTarget.id);

            this.draggingItems.initial = e.currentTarget;
            array.forEach(this.draggingItems, lang.hitch(this, function(liid) {
                var li = this.getItem(liid);

                li.classList.add("draggableNode");
            }));

            e.dataTransfer.effectAllowed = "move";
        },

        onDragEnd: function() {
            array.forEach(this.draggingItems, lang.hitch(this, function(liid) {
                var li = this.getItem(liid);
                li.classList.remove("draggableNode");
            }));

        },

        onDragOver: function(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = "move";

            return false;
        },

        onDragDrop: function(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (this.draggingItems.initial != e.currentTarget) {
                var liTo = e.currentTarget;
                var columnCount = Math.floor(liTo.parentElement.clientWidth / liTo.offsetWidth);
                var columnTo = Math.floor(liTo.offsetLeft / liTo.offsetWidth + 0.5);
                var rowTo = Math.floor((liTo.offsetTop - liTo.parentNode.offsetTop) / liTo.clientHeight + 0.5);
                var where = columnTo + columnCount * rowTo;
                var anchor = null;
                for (var i = 0; i < this.draggingItems.length; ++i) {
                    var liWhat = this.getItem(this.draggingItems[i]);
                    if (anchor === null) {
                        var columnFrom = Math.floor(liWhat.offsetLeft / liWhat.offsetWidth + 0.5);

                        var rowFrom = Math.floor((liWhat.offsetTop - liWhat.parentNode.offsetTop) / liWhat.clientHeight + 0.5);

                        var from = columnFrom + columnCount * rowFrom;
                        if (from < where) {
                            where = where + 1;
                        }

                        domConstruct.place(liWhat, this.productList, where);
                    } else {
                        domConstruct.place(liWhat, anchor, "after");
                    }

                    this.setSelected(liWhat.id);
                    anchor = liWhat;
                }

                this.draggingItems = null;
            }
            return false;
        },

        appendProducts: function(products) {
            var itemCount = this.getCount();
            var productsAdded = 0;

            var li_onclick = lang.hitch(this, function(e) {
                this.selectItem(e, !e.ctrlKey, this);
            });

            var imagePreview = new ImagePreview();
            for (var iProduct in products) {

                if (itemCount++ >= this.maxProducts) {

                    alert("Export list cannot contain more than " + this.maxProducts + " products.");
                    break;
                }

                var product = products[iProduct];
                var li = makeProductItem(product);
                li.className = this.classes.notSelectedItem;
                li.onclick = li_onclick;
                li.draggable = true;
                li.ondragstart = lang.hitch(this, this.onDragStart);
                li.ondragend = lang.hitch(this, this.onDragEnd);
                li.ondragover = this.onDragOver;
                li.ondrop = lang.hitch(this, this.onDragDrop);

                this.productList.appendChild(li);
                product.state = "prepared";

                if (this.OnProductAdded != null) {
                    this.OnProductAdded(product.uuid);
                }

                productsAdded++;
                imagePreview.resetImagePreview(product);
                imagePreview.prepareImagePreview(product);
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

        UpdateProductMetadata: function(productId) {

            var li = null;
            for (var iChild in this.productList.children) {
                var item = this.productList.children[iChild];
                if (item.id == productId) {
                    li = item;
                    break;
                }
            }

            if (li === null) {
                return;
            }

            this.CreateOptionGrid(dom.byId("ppt " + productId), productId);
        }
    });

    function makeProductItem(product) {

        var li = document.createElement("li");
        li.id = product.uuid;

        // 1. Product item div
        var divProduct = document.createElement("div");
        divProduct.id = "div_" + li.id;
        li.appendChild(divProduct);

        // 1.1. Product image and wait icon div
        var divProductIcon = document.createElement("div");
        divProductIcon.className = "productIconDiv";
        divProduct.appendChild(divProductIcon);

        // 1.1.1. Product image div
        var divImgProductIcon = document.createElement("div");
        divImgProductIcon.style.position = "absolute";
        divProductIcon.appendChild(divImgProductIcon);
        divImgProductIcon.style.textAlign = "center";
        divImgProductIcon.style.width = "100%";

        // 1.1.1.1. Product image
        var imgProductIcon = document.createElement("img");
        divImgProductIcon.appendChild(imgProductIcon);
        imgProductIcon.onerror = function() {
            this.src = "images/ProductTypes/DefaultProduct.png";
        };
        imgProductIcon.src = "images/ProductTypes/" + product.getAttributeValue("thumbnail");
        imgProductIcon.id = "productThumb_" + li.id;
        imgProductIcon.className = "productIcon";

        if (product.getAttributeValue("imageOverride")) {

            // 1.1.2. Product wait icon div
            var divImgWaitIcon = document.createElement("div");
            divImgWaitIcon.style.position = "absolute";
            divProductIcon.appendChild(divImgWaitIcon);
            divImgWaitIcon.style.textAlign = "center";
            divImgWaitIcon.style.width = "100%";

            // 1.1.2.1. Product wait icon
            var imgWaitIcon = document.createElement("img");
            imgWaitIcon.src = "images/ProductTypes/" + ((product.isCustom) ? "hourglass_overlay_custom.gif" : "hourglass_overlay_fixed.gif");
            imgWaitIcon.id = "productWaitOverlay_" + li.id;
            divImgWaitIcon.appendChild(imgWaitIcon);
            imgWaitIcon.className = "productIcon";
        }

        // 1.2. Product label div
        var mapSheetName = product.getAttributeValue("mapSheetName");
        var divLabelProduct = document.createElement("div");
        divLabelProduct.id = "label_" + mapSheetName;
        divLabelProduct.className = "productLabel";
        divProduct.appendChild(divLabelProduct);

        // 1.2.1. Product label
        var labelProduct = document.createElement("a");

        labelProduct.onclick = lang.hitch({
            product: product
        }, function(e) {
            var imagePreview = new ImagePreview();
            imagePreview.showProductPreview(this.product, e);
            return false;
        });
        labelProduct.innerHTML = mapSheetName;
        divLabelProduct.appendChild(labelProduct);
        labelProduct.setAttribute("href", "#");

        return li;
    }
});
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
    "dojo/_base/fx",
    "dojo/dom-style",
    "dojo/dom",
    "dojo/i18n!../nls/podi18n",
    "dijit/TooltipDialog",
    "dijit/popup",
    "dijit/focus",
    "../ConfigurationManager",
    "./ProductFactoryList",
    "./ProductDescriptor"
], function(declare, lang, fx, domStyle, dom, i18n, TooltipDialog, popup, focusUtil, cfgManager, ProductFactoryList) {

    var productTypeAttributes = [];
    var exists = false;
    var ProductFactory = declare("ProductFactory", null, {
        initialized: false,
        constructor: function() {

            if (exists)
                throw "ProductFactory object already created";

            exists = true;
            var sourceObject = this;
            var headerIconProduct = dom.byId("headerIconProduct");

            var hideProductDialog = lang.hitch(this, function() {

                if (ProductFactory.product === null) {

                    var img = dom.byId("headerIconImageProduct");
                    img.src = "images/ProductTypes/DefaultProductGrey.png";
                }

                domStyle.set("ProductFactoryDialog", "opacity", "1");
                domStyle.set("ProductFactoryDialog", "width", "402px");
                fx.animateProperty({
                    node: "ProductFactoryDialog",
                    duration: 350,
                    properties: {
                        opacity: 0,
                        width: {
                            start: 402,
                            end: 100
                        }
                    },
                    onEnd: function() {
                        popup.close(factoryDlg);
                    }
                }).play();
            });

            var content = document.createElement("div");
            content.className = "panel";
            content.id = "tdContent";

            var closeBtn = document.createElement("div");
            closeBtn.id = "closeProducts";
            closeBtn.className =
                "close-button-tooltip";
            closeBtn.title = "Close panel";
            closeBtn.onclick = hideProductDialog;
            content.appendChild(closeBtn);

            var header = document.createElement("h1");
            header.innerHTML = i18n.productFactory.title;
            header.style.marginLeft = "20px";
            content.appendChild(header);
            var closeBtnR = document.createElement("div");
            closeBtnR.id = "closeProducts";
            closeBtnR.className = "close-cross";
            closeBtnR.title = "Close panel";
            closeBtnR.onclick = hideProductDialog;

            content.appendChild(closeBtnR);

            var pflDiv = document.createElement("div");
            pflDiv.id = "productFactoryDiv";
            pflDiv.style.width = "380px";
            pflDiv.style.height = "auto";
            pflDiv.style.border = "none";
            content.appendChild(pflDiv);
            var factoryDlg = new TooltipDialog({
                id: "ProductFactoryDialog",
                //style: "color:red;width: " + 402 + "px;padding:0;height:auto;display:block",
                tabindex: 11,
                autofocus: true,
                onKeyDown: lang.hitch(this, function(event) {
                    sourceObject.factoryList.navigate(event, sourceObject.factoryList);
                }),
                onFocus: lang.hitch(this, function() {
                    focusUtil.focus(dom.byId("productFactoryDiv"));

                    this.factoryList.setParent(dom.byId("productFactoryDiv"));

                }),
                onMouseLeave: lang.hitch(this, function(e) {
                    if (this.factoryList.getSelectedProduct() != null &&
                        e.fromElement.constructor !== HTMLSelectElement &&
                        e.fromElement.constructor !== HTMLTableCellElement) {
                        hideProductDialog();
                    }
                })
            });

            popup.open({
                popup: factoryDlg,
                around: headerIconProduct
            });
            popup.close(factoryDlg);

            factoryDlg.attr("content", content);
            factoryDlg._firstFocusItem = pflDiv;

            var showProductDialog = lang.hitch(this, function() {
                if (factoryDlg._isShown()) {
                    hideProductDialog();
                    return;
                }
                popup.open({
                    popup: factoryDlg,
                    around: headerIconProduct
                });
                domStyle.set("ProductFactoryDialog", "opacity", "0");
                domStyle.set("ProductFactoryDialog", "width", "102px");
                fx.animateProperty({
                    node: "ProductFactoryDialog",
                    duration: 350,
                    properties: {
                        opacity: 1,
                        width: {
                            start: 102,
                            end: 402
                        }
                    },
                    onEnd: function() {
                        domStyle.set("ProductFactoryDialog", "opacity", "1");
                        domStyle.set("ProductFactoryDialog", "width", "402px");
                        sourceObject.factoryList.setParent(dom.byId("productFactoryDiv"));
                        factoryDlg.focus();
                    }
                }).play();
            });

            this.onProductChanged = null;
            headerIconProduct.onclick = showProductDialog;
            headerIconProduct.onkeydown = function(e) {

                var keyCode = e.keyCode;
                if (keyCode == 13) {
                    showProductDialog();
                } else if (keyCode == 27) {
                    hideProductDialog();
                }
            };

            headerIconProduct.onmouseover = function() {

                if (ProductFactory.product === null) {

                    var img = dom.byId("headerIconImageProduct");
                    img.src = "images/ProductTypes/DefaultProduct.png";
                }

                var imgDA = dom.byId("headerIconArrowProduct");
                imgDA.style.display = "block";
            };

            headerIconProduct.onmouseout = function() {

                if (ProductFactory.product === null) {

                    var img = dom.byId("headerIconImageProduct");
                    if (factoryDlg._isShown())
                        img.src = "images/ProductTypes/DefaultProduct.png";
                    else
                        img.src = "images/ProductTypes/DefaultProductGrey.png";
                }

                var imgDA = dom.byId("headerIconArrowProduct");
                imgDA.style.display = "none";
            };

            var productChanged = lang.hitch(this, function() {

                var product = sourceObject.factoryList.getSelectedProduct();
                var img = dom.byId("headerIconImageProduct");
                var lbl = dom.byId("headerIconLabelProduct");
                if (product == null) {

                    img.src = "images/ProductTypes/DefaultProductGrey.png";
                    lbl.innerHTML = " ";
                } else {

                    img.src = "images/ProductTypes/" + product.getAttributeValue("thumbnail");
                    img.alt = "images/ProductTypes/DefaultProduct.png";
                    lbl.innerHTML = product.productName;
                }

                if (sourceObject.onProductChanged !== null)
                    sourceObject.onProductChanged(product);
            });

            this.factoryList = new ProductFactoryList("productList", pflDiv);
            this.factoryList.setEvent("selectionChanged", productChanged);
            this.initialize = function(source) {
                if (this.initialized === true)
                    return;

                this.initialized = true;
                this.factoryList.appendProducts(source);
                productChanged();
            };
        }
    });
    ProductFactory.product = null;
    ProductFactory.createProductInstance = function(productTemplate, isCustom, feature) {

        var product = productTemplate.getCopy();
        product.prepareInstance(isCustom);
        setFeature(product, feature);
        if (product.isCustom) {
            var mapSheetName = product.getAttribute("mapSheetName");
            if (mapSheetName != null) {

                var productTypeAttr = ProductFactory.getProductTypeAttr(product);
                mapSheetName.value = product.productName + "_" + productTypeAttr.number;
                productTypeAttr.number++;
            }
        }
        product.state = "created";

        return product;
    };

    ProductFactory.getProductTypeAttr = function(product) {
        var productTypeAttr = productTypeAttributes[product.type];
        if (productTypeAttr == null) {
            var productTypes = cfgManager.getTable(product.getAttribute("type").domain);
            for (var ipt in productTypes) {
                var prodTypeAttr = productTypes[ipt];
                if (prodTypeAttr.value == product.type) {
                    productTypeAttr = lang.clone(prodTypeAttr);
                    productTypeAttr.number = 0;
                    productTypeAttributes[product.type] = productTypeAttr;
                    break;
                }
            }
        }

        return productTypeAttr;
    };

    return ProductFactory;

    function setFeature(product, feature) {
        if (feature == null)
            return;

        product.feature = feature;
        var extentLayerName = product.getAttributeValue("extentLayer");
        if (!ProductDescriptor.isEmpty(extentLayerName)) {
            var extLayerItem;
            var extentLayers = null;
            var typeAttr = ProductFactory.getProductTypeAttr(product);
            if (typeAttr != null)
                extentLayers = cfgManager.getTable(typeAttr.source);

            for (var iLayer in extentLayers) {
                var layer = extentLayers[iLayer];
                if (layer.value == extentLayerName) {
                    extLayerItem = layer;
                    break;
                }
            }
            if (extLayerItem != null) {
                var attrCount = product.getAttributeCount();
                for (var iAttr = 0; iAttr < attrCount; ++iAttr) {
                    var attr = product.getAttributeByIndex(iAttr);
                    if (attr == null || ProductDescriptor.isEmpty(attr.source))
                        continue;

                    var sourceField = extLayerItem[attr.source];
                    if (ProductDescriptor.isEmpty(sourceField))
                        continue;

                    if (sourceField != null && feature != null && feature.attributes != null) {

                        var dataValue = feature.attributes[sourceField];
                        if (dataValue == null)
                            dataValue = "";

                        product.setAttributeValue(attr.attr, dataValue);
                    }
                }
            }
        }
    }
});
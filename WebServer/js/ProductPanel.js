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
    "dojo/dom",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/i18n!./nls/podi18n",
    "esri/geometry",
    "./ConfigurationManager",
    "./Product/ExportList",
    "./Product/ProductFactory",
    "./Export",
    "./SelectionTool"
], function(declare, lang, string, dom, domConstruct, on, i18n, Geometry, cfgManager, ExportList, ProductFactory, Exporter) {

    return declare("ProductPanel", null, {

        selectionTool: null,
        productFactory: null,
        exportList: null,
        exporter: null,
        podMap: null,

        constructor: function(podMap, selectionTool) {
            this.selectionTool = selectionTool;

            this.productFactory = new ProductFactory();
            this.productFactory.initialize(cfgManager.getTable("ProductDefinitions"));

            // initialize dom structure
            var rootNode = dom.byId("product-content");

            domConstruct.create("div", {
                "innerHTML": "<h1 id='h_product' >Export Queue</h1>" +
                    "<div id='productStack' data-dojo-type='dijit/layout/StackContainer' >" +
                    "<div id='productContent' class='productSectionsPanel' >" +
                    "<div id='export-content' class='panel' >" +
                    "<div id='exportContent' class='exportSectionsPanel' >" +
                    "<div id='exportTop' class='section top' >" +
                    "<div  id='ExportListDiv' tabindex='80' ></div>" +
                    "<div class='space'></div>" +
                    "<div>" +
                    "<label id='selectedProductsLabel'></label>" +
                    "</div>" +
                    "</div>" +
                    "<div class='section'>" +
                    "<span tabindex='120' id='exportButton' class='buttonBlue'></span>" +
                    "<br class='clear' />" +
                    "</div>" +
                    "</div>" +
                    "</div>" +
                    "</div>" +
                    "</div>"
            }, rootNode);
                              

            // Initialize tab header
            dom.byId("h_product").innerHTML = i18n.productPanel.productPanelTitle;
            dom.byId("exportButton").innerHTML = i18n.productPanel.exportButtonLabel;
            this.exportList = new ExportList("exportList", dom.byId("ExportListDiv"));
            this.podMap = podMap;
            this.podMap.setEvent("update-end", this.onMapUpdated);
            this.productFactory.onProductChanged = lang.hitch(this, function(selectedProduct) {
                this.selectionTool.switchProduct(this.podMap, selectedProduct);
                console.log("Product Change Sequence Completed");

            });

            var showQueue = function(count) {
                var displayQueue = count === 0 ? "none" : "block";
                dom.byId("inQueue").style.display = displayQueue;
                dom.byId("inQueueCount").innerHTML = count.toString();
            };

            this.selectionTool.onProductsSelected = lang.hitch(this, function() {
                //add product to export list
                //var products = new Array;

                var productCollection = this.selectionTool.getProductIdsCollection();

                var products = [];
                for (var iProduct = 0; iProduct < productCollection.length; ++iProduct) {

                    var product = SelectionTool.products[productCollection[iProduct]];
                    if (product.state != "selected" && product.state != "created")
                        continue;

                    products.push(product);
                }

                if (this.exportList == null)
                    return;

                var productsAdded = this.exportList.appendProducts(products);

                if (productsAdded > 0) {

                    var message = " " + productsAdded.toString() + " product" + ((productsAdded == 1) ? "" : "s") + " added to the Export List";
                    this.selectionTool.productsAddedInfo(message);
                }

                showQueue(this.exportList.getItems().length);
            });

            this.selectionTool.onProductMoved = lang.hitch(this, function(productId) {

                this.exportList.UpdateProductMetadata(productId);
            });

            this.selectionTool.onDeleteProducts = lang.hitch(this, function(selectedOnly) {

                var productCollection;
                var confText;
                if (selectedOnly === true) {
                    productCollection = this.exportList.getSelected();
                    confText = i18n.productPanel.deleteSelectedProduct;
                } else {
                    productCollection = this.selectionTool.getProductIdsCollection();
                    confText = i18n.productPanel.deleteAllProduct;
                }


                if (productCollection.length === 0)
                    return;

                var conf = confirm(confText);
                if (conf === true) {
                    this.exportList.deleteItems(productCollection);
                }

                showQueue(this.exportList.getItems().length);
            });

            // Event handlers
            var exportListSelectionChanged = lang.hitch(this, function() {

                var lab = dom.byId("selectedProductsLabel");
                var selectedIds = this.exportList.getSelected();
                if (selectedIds == null || selectedIds.length === 0) {

                    lab.innerHTML = "";
                    return;
                }

                lab.innerHTML = selectedIds.length.toString() + " product" + (selectedIds.length == 1 ? "" : "s") + " of " + this.exportList.getCount().toString() + " selected";

                var selectedPolygon = null;

                for (var i in SelectionTool.products) {
                    SelectionTool.products[i].pageExtent.hidePage();
                }

                // Find new selected rows
                for (var it = 0; it < selectedIds.length; it++) {

                    var productId = selectedIds[it];
                    var product = SelectionTool.products[productId];
                    if (product == null) {
                        continue;
                    }

                    if (product.state == "prepared" && product.flashed !== true) {
                        product.putOnTop();
                        product.setHighlighted(true);
                        product.flashed = true;
                    }
                    else {
                        product.pageExtent.hidePage();
                    }

                    if (selectedPolygon === null)
                        selectedPolygon = new Geometry.Polygon(product.getDataframe().spatialReference);

                    var rings = product.getDataframe().rings;
                    for (var i = 0; i < rings.length; i++)
                        selectedPolygon.addRing(rings[i]);
                }

                if (selectedIds.length !== 0) {

                    var ext = selectedPolygon.getExtent().expand(5);
                    var dw = this.podMap.getExtent().getWidth() / ext.getWidth();
                    dw = dw >= 1 ? dw : (1 / dw);
                    var dh = this.podMap.getExtent().getHeight() / ext.getHeight();
                    dh = dh >= 1 ? dh : (1 / dh);
                    if (dw > 5 || dh > 5)
                        this.podMap.setExtent(ext, false);

                    var cp = ext.getCenter();
                    this.podMap.centerAt(cp);

                    this.selectionTool.StartFlash();
                }
            });

            var productAddedToList = function(productId) {

                if (productId == null)
                    return;

                var product = SelectionTool.products[productId];
                if (product == null)
                    return;

                if (product.graphic == null)
                    return;

                product.setHighlighted(false);
            };

            var productDeletedFromList = lang.hitch(this, function(productId) {

                var product = SelectionTool.products[productId];
                if (product !== undefined) {

                    product.hide();

                    delete SelectionTool.products[productId];
                }

                showQueue(this.exportList.getItems().length);
            });

            this.exportList.setEvent("selectionChanged", exportListSelectionChanged);
            this.exportList.setEvent("productAdded", productAddedToList);
            this.exportList.setEvent("productDeleted", productDeletedFromList);

            on(dom.byId("exportButton"), "click", lang.hitch(this, onExportButtonClick));

            this.exporter = new Exporter();
            this.exporter.setExportContentDiv(dom.byId("exportContent"), true);
            this.exporter.setExportCompletionCallback(lang.hitch(this, onExportComplete));
        },

        showProduct: function(mapPoint, keepSelection) {
            if (this.exportList != null && this.exportList.isVisible()) {
                //find underlyng product
                var products = this.exportList.getItems();
                for (var i = 0; i < products.length; ++i) {
                    var product = SelectionTool.products[products[i]];
                    if (product == null)
                        continue;

                    if (product.getDataframe().contains(mapPoint)) {
                        this.exportList.showProperties(product.uuid, !keepSelection);
                    }
                    else {
                        product.pageExtent.hidePage();
                    }
                }
            }
        },

        onMapUpdated: function() {
            var productCollection = Object.keys(SelectionTool.products);
            if (productCollection.length === 0) {
                return;
            }
            for (var i in productCollection) {
                var product = SelectionTool.products[productCollection[i]];

                product.updateGraphics();
            }
        }
    });

    function onExportButtonClick() {

        if (this.exportList.getCount() === 0) {

            alert(i18n.productPanel.nothingToExport);
            return;
        }

        var items = this.exportList.getSelected();
        var maxProducts = cfgManager.getApplicationSetting("maxProductsToExport");
        if (items === null || items.length === 0) {

            items = this.exportList.getItems();
            if (items.length > maxProducts) {

                alert(string.substitute(i18n.productPanel.selectToExport, {
                    maxProducts: maxProducts
                }));
                return;
            } else if (items.length > 1 && !confirm(i18n.productPanel.confirmAllExport))
                return;
        }

        if (items.length > maxProducts && !confirm(string.substitute(i18n.productPanel.confirmSelectedExport, {
            maxProducts: maxProducts
        })))
            return;

        var productIds = [];
        for (var i = 0; i < items.length && i < maxProducts; i++)
            productIds.push(items[i]);

        this.exporter.exportMaps(SelectionTool.products, productIds);
    }

    function onExportComplete(exportedProducts) {

        var productsCollection = [];
        for (var i = 0; i < exportedProducts.length; i++) {
            if (exportedProducts[i].productId === null)
                console.log("File exported (not associated with a product): " + exportedProducts[i].fileLink);
            else
                productsCollection.push(exportedProducts[i].productId);
        }

        for (var j in productsCollection) {
            var product = SelectionTool.products[productsCollection[j]];
            product.hide();
        }
        //this.exportList.deleteItems(productsCollection);
        console.log(exportedProducts.length + " file(s) exported.");
    }

});
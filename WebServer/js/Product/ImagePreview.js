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
    "dojo/dom",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "../Export"
], function(dom, declare, lang, Exporter) {

    var timeout = 15000; // server timeout in ms, changes the "in progress" mouse cursor to "wait";

    var imagePreviewClass = {

        exporter: null,

        constructor: imagePreviewConstructor,
        prepareImagePreview: prepareImagePreview, // generate preview; if is being generated, call resetImagePreview first
        resetImagePreview: resetImagePreview, // cancel preview generation, call anytime
        showProductPreview: showProductPreview, // open new browser window if preview is available

        imageTimeout: imageTimeout,
        prepareImagePreviewCancel: prepareImagePreviewCancel,
        prepareImagePreviewProgress: prepareImagePreviewProgress,
        prepareImagePreviewOK: prepareImagePreviewOK,
        resetImagePreviewCancel: resetImagePreviewCancel,
        resetImagePreviewOK: resetImagePreviewOK,
        setImageCursor: setImageCursor,
        setImagePreview: setImagePreview,
        setImagePreviewSize: setImagePreviewSize,
        setImageThumbnail: setImageThumbnail,
        setThumbnail: setThumbnail
    };

    return declare("ImagePreview", null, imagePreviewClass);

    function imagePreviewConstructor() {

        this.exporter = new Exporter();
    }

    function imageTimeout() {
        this.previewer.setImageCursor(this.product, "wait");
    }

    function prepareImagePreview(product) {

        if (!product.getAttributeValue("imageOverride"))
            return;

        var params = {
            "products_as_json": "[" + this.exporter.getExportString(product, "Preview") + "]"
        };
        var bindedObject = {
            previewer: this,
            product: product,
            exporter: this.exporter
        };
        this.exporter.getExportGateway().submitJob(params, lang.hitch(bindedObject, this.prepareImagePreviewOK), lang.hitch(bindedObject, this.prepareImagePreviewProgress), lang.hitch(bindedObject, this.prepareImagePreviewCancel));
    }

    function prepareImagePreviewCancel(results) {
        console.log(PodUtilities.makeErrorMessage(results));
        this.previewer.setImageCursor(this.product, "auto");
    }

    function prepareImagePreviewProgress(jobInfo) {
        this.previewer.setImageCursor(this.product, "progress");
        if (this.product.imagePreviewJobId == null)
            this.product.imagePreviewJobId = jobInfo.jobId;
    }

    function prepareImagePreviewOK(jobInfo) {
        if (jobInfo.jobStatus != "esriJobSucceeded") {

            console.log("Image preview task for the product (" + this.product.getAttributeValue("mapSheetName") + ") has terminated with (" + jobInfo.jobStatus + ")");
            this.previewer.setImageCursor(this.product, "auto");
            return;
        }

        this.product.imageThumb = null;
        this.product.imagePreview = null;
        this.previewer.setImageCursor(this.product, "not-allowed");
        this.exporter.getExportGateway().getResultData(jobInfo.jobId, "output_files", lang.hitch({
            previewer: this.previewer,
            product: this.product
        }, this.previewer.setImagePreview));
    }

    function resetImagePreview(product) {

        if (!product.getAttributeValue("imageOverride"))
            return;

        this.setThumbnail(product, "productIcon");
        if (product.imagePreviewJobId == null)
            return;

        this.setImageCursor(product, "not-allowed");
        this.exporter.getExportGateway().cancelJob(product.imagePreviewJobId, lang.hitch({
            previewer: this,
            product: product
        }, this.resetImagePreviewOK), this.resetImagePreviewCancel);
    }

    function resetImagePreviewCancel() {

        console.log("Error cancelling product image preview.");
    }

    function resetImagePreviewOK(jobInfo) {

        if (this.product.imagePreviewJobId != null && jobInfo.jobId != this.product.imagePreviewJobId)
            console.log("Assertion failed:\n\nExpected imagePreview job cancelling for product (" + this.product.getAttributeValue("mapSheetName") + ") but received a cancel with different jobId (" + jobInfo.jobId + ").");

        this.previewer.setImageCursor(this.product, "auto");
    }

    function setImageCursor(product, cursor) {

        var imgOverlay = dom.byId("productWaitOverlay_" + product.uuid);
        if (imgOverlay == null)
            return;

        if (product.imageTimeout != null) {

            clearTimeout(product.imageTimeout);
            product.imageTimeout = null;
        }

        if (cursor != "auto") {

            product.imageTimeout = setTimeout(lang.hitch({
                previewer: this,
                product: product
            }, this.imageTimeout), timeout);
            imgOverlay.style.cursor = cursor;
            imgOverlay.style.display = "block";
        } else {

            product.imagePreviewJobId = null;
            imgOverlay.style.display = "none";
        }
    }

    function setImagePreview(result, messages) {
        var img = new Image();
        this.previewer.setImageThumbnail(this.product, result, messages);
        img.src = result.value[0];
        img.onload = lang.hitch({
            previewer: this.previewer,
            img: img,
            product: this.product
        }, this.previewer.setImagePreviewSize);
    }

    function setImagePreviewSize() {
        this.product.imagePreviewHeight = this.img.height;
        this.product.imagePreviewWidth = this.img.width;
        this.product.imagePreview = this.img.src;
        if (this.product.imageThumb !== null)
            this.previewer.setImageCursor(this.product, "auto");
    }

    function setImageThumbnail(product, result) {

        product.imageThumb = result.value[0];
        this.setThumbnail(product, "productThumbnail");
        if (product.imagePreview !== null)
            this.setImageCursor(product, "auto");
    }

    function showProductPreview(product, e) {

        if (product.imagePreview == null)
            return;

        var height = product.imagePreviewHeight;
        var width = product.imagePreviewWidth;
        var windowScreen = window.screen;
        var ratioW = 1;
        var ratioH = 1;

        if (width > windowScreen.availWidth - 20 - 32)
            ratioW = (windowScreen.availWidth - 20 - 32) / width;

        if (height > windowScreen.availHeight - 42 - 32)
            ratioH = (windowScreen.availHeight - 42 - 32) / height;

        if (ratioW > ratioH)
            ratioW = ratioH;
        else
            ratioH = ratioW;

        width *= ratioW;
        height *= ratioH;
        var top = e.screenY - height / 3;
        var windowHeight = height + 32;
        var windowWidth = width + 32;
        var left = e.screenX + 10;

        if (left > windowScreen.availWidth - windowWidth - 20)
            left = windowScreen.availWidth - windowWidth - 20;

        if (left < 0)
            left = 0;

        if (top > windowScreen.availHeight - windowHeight - 42)
            top = windowScreen.availHeight - windowHeight - 42;

        if (top < 0)
            top = 0;

        var imageWindow = window.open(
            '',
            'productPreview_' + product.uuid.substring(0, 8),
            'left=' + left +
            ',top=' + top +
            ',width=' + windowWidth +
            ',height=' + windowHeight +
            ',toolbar=no,directories=no,status=no,menubar=no,scrollbars=no,resizable=yes'
        );

        if (imageWindow.document.images.length === 0) {

            var customName = product.getAttributeValue("customName");
            var mapSheetName = product.getAttributeValue("mapSheetName");
            var name = (customName !== "") ? customName : mapSheetName;
            var s =
                '<head>' +
                '<title>' + mapSheetName + '</title>' +
                '</head>' +
                '<body style="overflow:hidden" bgcolor="#ffffff" ondblclick="self.close()">' +
                '<img src="' + product.imagePreview + '" width="' + width + '" height="' + height + '" border="0" alt="' + name + '" />' +
                '</body>';

            imageWindow.document.write(s);
        }

        imageWindow.focus();
    }

    function setThumbnail(product, imageClass) {

        var imgThumb = dom.byId("productThumb_" + product.uuid);
        if (imgThumb == null)
            return;

        if (product.imageTimeout != null) {

            clearTimeout(product.imageTimeout);
            product.imageTimeout = null;
        }

        imgThumb.className = imageClass;
        if (imageClass == "productIcon")
            imgThumb.src = "images/ProductTypes/" + product.getAttributeValue("thumbnail");
        else
            imgThumb.src = product.imageThumb;
    }
});
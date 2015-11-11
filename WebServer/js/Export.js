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
    "esri/tasks/Geoprocessor",
    "./ConfigurationManager",
    "./podUtilities"
], function(declare, lang, string, i18n, Geoprocessor, cfgManager) {

    var updateProgressTimeout = 15000; // server timeout in ms, changes the "in progress" mouse cursor to "wait"
    var gpExportGateway = null;

    var exporterClass = {

        exportCompletionCallback: null,
        isResultsReversed: false,
        insertionPointDiv: null,
        exportContentDiv: null,
        exportResults: [],

        constructor: exporterConstructor,
        exportMaps: exportMaps, // export selected products from the export list
        getExportGateway: getExportGateway, // return the export service
        getExportString: getExportString, // prepare parameters for the export service
        setExportCompletionCallback: setExportCompletionCallback, // set the function called when export is completed
        setExportContentDiv: setExportContentDiv, // set the container for progressor and results, and optionally the flag for reverse content order

        exportMapsCancel: exportMapsCancel,
        exportMapsOK: exportMapsOK,
        exportMapsOKWorker: exportMapsOKWorker,
        exportMapsProgress: exportMapsProgress,
        getTimeElapsedString: getTimeElapsedString,
        makeProgressor: makeProgressor,
        moveProgressor: moveProgressor,
        onLinkReadyStateChange: onLinkReadyStateChange,
        openLink: openLink,
        openResult: openResult,
        processExportResults: processExportResults,
        exportedFileExtensionCheck: exportedFileExtensionCheck
    };

    return declare("Exporter", null, exporterClass);

    function exporterConstructor() {
        this.checkExportedFiles = cfgManager.getApplicationSetting("isExportedFilesAliveCheck");

    }

    function exportMaps(products, productIds) {

        var i, j;
        var par = "";
        var uniqueNames = [];
        var exportItems = [];
        var exportStage = "";
        for (i = 0; i < productIds.length; i++) {

            var product = products[productIds[i]];
            var productName = product.productName;
            var exporter = product.getAttributeValue("exporter");
            var mapSheetName = product.getAttributeValue("mapSheetName");
            var customName = PodUtilities.trim(product.getAttributeValue("customName"));

            // Obtaining previous export stages for this product
            exportStage = "";
            for (j = 0; j < this.exportResults.length; j++) {

                var exportedItems = this.exportResults[j].exportItems;
                for (var k = 0; k < exportedItems.length; k++) {

                    var exportedItem = exportedItems[k];
                    if (mapSheetName != exportedItem.mapSheetName ||
                        productName != exportedItem.productName ||
                        exporter != exportedItem.exporter ||
                        customName != exportedItem.customName)
                        continue;

                    if (exportedItem.exportStage != "failed") {

                        if (exportStage !== "")
                            exportStage += "; ";

                        exportStage += exportedItem.exportStage;
                    }

                    break;
                }
            }

            // Find duplicate and invalid names
            var fixedName = PodUtilities.trim(customName.replace(/[!?@#$%^&*()+={}[\]|\\;\'\"<>,.\/]/gi, ""));
            var isValid = (fixedName == customName && mapSheetName !== "" && customName.length <= 64);

            var isDuplicate = false;
            for (j = 0; j < uniqueNames.length; j++) {

                if (mapSheetName == uniqueNames[j].mapSheetName)
                    isDuplicate = true;
                else if (customName == uniqueNames[j].mapSheetName || mapSheetName == uniqueNames[j].customName)
                    isDuplicate = true;
                else if (customName !== "" && customName == uniqueNames[j].customName)
                    isDuplicate = true;
                else
                    continue;

                uniqueNames[j].isDuplicate = true;
            }

            par += ((i === 0) ? "" : ",") + this.getExportString(product, "Export");
            uniqueNames.push({
                productName: productName,
                mapSheetName: mapSheetName,
                customName: customName,
                isDuplicate: isDuplicate,
                isValid: isValid
            });
            exportItems.push({
                productName: productName,
                mapSheetName: mapSheetName,
                customName: customName,
                exporter: exporter,
                linkId: "",
                exportStage: exportStage
            });
        }

        var dupNames = "";
        var invalidNames = "";
        var dupNamesLimit = 7; // set -1 to not report duplicate names
        var invalidNamesLimit = 7; // set -1 to not report invalid names
        var name = "";
        for (i = 0; i < uniqueNames.length; i++) {

            if (invalidNamesLimit >= 0 && !uniqueNames[i].isValid) {

                if (invalidNamesLimit-- === 0)
                    invalidNames += "...and more...\n";
                else {
                    name = uniqueNames[i].customName;
                    invalidNames += uniqueNames[i].productName + " (" + uniqueNames[i].mapSheetName + ")" + ((name === "") ? "" : ": " + name) + "\n";
                }
            }

            if (dupNamesLimit < 0 || !uniqueNames[i].isDuplicate)
                continue;

            dupNames += "\n";
            for (j = i; j < uniqueNames.length; j++) {

                if (!uniqueNames[j].isDuplicate)
                    continue;

                if (dupNamesLimit-- === 0) {

                    dupNames += "...and more...\n";
                    break;
                }

                name = uniqueNames[j].customName;
                dupNames += uniqueNames[j].productName + " (" + uniqueNames[j].mapSheetName + ")" + ((name === "") ? "" : ": " + name) + "\n";
                uniqueNames[j].isDuplicate = false;
            }
        }

        if (invalidNames !== "" || dupNames !== "") {

            if (invalidNames !== "")
                invalidNames = string.substitute(i18n.podExport.invalidNames, {
                    invalidNames: invalidNames
                });

            if (dupNames !== "")
                dupNames = string.substitute(i18n.podExport.duplicateNames, {
                    duplicateNames: dupNames
                });


            alert(invalidNames + dupNames + i18n.podExport.needFix);
            return;
        }

        var expNames = "";
        var expNamesLimit = 7;
        for (i = 0; i < exportItems.length; i++) {

            var exportItem = exportItems[i];
            exportStage = exportItem.exportStage;
            exportItem.exportStage = "submit";
            if (exportStage === "" || expNamesLimit < 0)
                continue;

            if (expNamesLimit-- === 0)
                expNames += "...and more...\n";
            else
                expNames += exportItem.productName + " (" + exportItem.mapSheetName + "): " + exportItem.customName + "\n> " + exportStage + "\n";
        }

        if (expNames !== "") {

            expNames = string.substitute(i18n.podExport.exportNames, {
                exportNames: expNames
            });
            if (!confirm(expNames + i18n.podExport.confirm))
                return;
        }

        var exportResult = {
            jobId: null,
            products: products,
            productIds: productIds,
            exportItems: exportItems,
            timestampStart: new Date(),
            jobStatus: "localJobSubmitted"
        };

        this.exportResults.push(exportResult);

        console.log(par);
        var params = {
            "products_as_json": "[" + par + "]"
        };
        var binding = {
            exporter: this,
            exportResult: exportResult
        };
        this.getExportGateway().submitJob(params, lang.hitch(binding, this.exportMapsOK), lang.hitch(binding, this.exportMapsProgress), this.exportMapsCancel);
    }

    function exportMapsCancel(results) {

        alert(PodUtilities.makeErrorMessage(results));
    }

    function exportMapsOK(jobInfo) {
        if (this.exportResult.jobId != jobInfo.jobId) {

            if (this.exportResult.jobId === null)
                alert(i18n.podExport.unassignedJob);
            else
                alert(i18n.podExport.nUnknownJob);

            return;
        }

        if (this.exportResult.jobStatus == "esriJobSucceeded" || this.exportResult.jobStatus == "esriJobFailed" || this.exportResult.jobStatus == "localJobCompleted")
            return;

        this.exportResult.jobStatus = jobInfo.jobStatus;
        if (this.exportResult.jobStatus == "esriJobSucceeded" || this.exportResult.jobStatus == "esriJobFailed") {

            this.exporter.exportMapsOKWorker(this.exportResult, jobInfo);
            return;
        }

        alert(string.substitute(i18n.podExport.unknownMessage, {
            jobStatus: this.exportResult.jobStatus
        }));
    }

    function exportMapsOKWorker(exportResult, jobInfo) {

        clearInterval(exportResult.moveProgressorHandle);
        exportResult.divFrame.removeChild(exportResult.divDone);
        exportResult.divFrame.removeChild(exportResult.divToDo);

        // Preparing messages
        var msg = "Export result:" + "\n";
        for (var i = 0; i < jobInfo.messages.length; i++) {

            if (4 <= i && i < jobInfo.messages.length - 10)
                msg += ((i % 10 === 0) ? "\n" : "") + " [...]";
            else if (jobInfo.messages[i].description.length < 256)
                msg += "\n" + jobInfo.messages[i].description;
            else
                msg += "\n" + jobInfo.messages[i].description.slice(0, 255) + " ...";
        }

        var time = this.getTimeElapsedString(exportResult.timestampStart);
        var exportItems = exportResult.exportItems;

        if (exportResult.jobStatus == "esriJobFailed") {

            exportResult.labelSummary.innerHTML = time + i18n.podExport.failedMessage;
            for (i = 0; i < exportItems.length; i++)
                exportItems[i].exportStage = "failed";

            alert(msg);
            return;
        }

        for (i = 0; i < exportItems.length; i++)
            exportItems[i].exportStage = "undetermined";

        //alert(msg); // Uncomment this line to see messages
        exportResult.labelSummary.innerHTML = time + i18n.podExport.succeededMessage;
        this.getExportGateway().getResultData(exportResult.jobId, "output_files", lang.hitch({
            exporter: this,
            exportResult: exportResult,
            exportedFileExtensionCheck: this.exportedFileExtensionCheck
        }, this.processExportResults));
    }

    function exportMapsProgress(jobInfo) {
        if (this.exportResult.jobStatus == "esriJobSucceeded" || this.exportResult.jobStatus == "esriJobFailed" || this.exportResult.jobStatus == "localJobCompleted") {

            console.log("Assertion failed:\n\nUpdate progress message occurred after export completion (" + this.exportResult.jobStatus + ").");
            return;
        }

        this.exportResult.jobStatus = jobInfo.jobStatus;
        if (this.exportResult.jobId === null) {

            this.exportResult.jobId = jobInfo.jobId;
            this.exportResult.timestampUpdate = new Date();
            if (this.exportResult.jobStatus != "esriJobSubmitted")
                console.log("Assertion failed:\n\nesriJobSubmitted message had been lost.\nReceived (" + this.exportResult.jobStatus + ").");

            this.exportResult.moveProgressorHandle = setInterval(lang.hitch({
                exporter: this.exporter,
                exportResult: this.exportResult
            }, this.exporter.moveProgressor), 333);
            this.exporter.makeProgressor(this.exportResult);
            return;
        }

        if (this.exportResult.jobId != jobInfo.jobId) {

            console.log("Assertion failed:\n\nUnexpected jobId in export progress message.");
            return;
        }

        if (this.exportResult.jobStatus == "esriJobSubmitted" || this.exportResult.jobStatus == "esriJobExecuting") {

            this.exportResult.timestampUpdate = new Date();
            return;
        }

        if (this.exportResult.jobStatus == "esriJobSucceeded" || this.exportResult.jobStatus == "esriJobFailed") {

            this.exporter.exportMapsOKWorker(this.exportResult, jobInfo);
            return;
        }

        console.log("Assertion failed:\n\nUnknown export progress message (" + this.exportResult.jobStatus + ").");
    }

    function getExportGateway() {

        if (gpExportGateway === null)
            gpExportGateway = new Geoprocessor(cfgManager.getApplicationSetting("gpExportGatewayUrl"));

        return gpExportGateway;
    }

    function getExportString(product, exportOption) {

        var exportParams = {};
        var passToServerAttributes = product.getPassToServerAttributes();
        var value = "";
        for (var i = 0; i < passToServerAttributes.length; i++) {
            var productAttr = passToServerAttributes[i];
            var attr = productAttr.attr;
            switch (attr) {
                case "geometry":
                    value = product.getDataframe().toJson();
                    break;
                case "exportOption":
                    value = exportOption;
                    break;
                case "pageSize":
                    value = product.formatPageSizeValue();
                    break;
                default:
                    value = (productAttr.value === undefined) ? "" : productAttr.value;
                    break;
            }

            if (value === null)
                value = "";

            exportParams[attr] = value;
        }

        return JSON.stringify(exportParams);
    }

    function getTimeElapsedString(baseTime) {

        var tm = Math.floor((new Date() - baseTime) / 1000);
        var sec = tm % 60;
        var min = Math.floor(tm / 60) % 60;
        var hrs = Math.floor(tm / 3600);
        return hrs + ":" + ((min < 10) ? "0" : "") + min + ":" + ((sec < 10) ? "0" : "") + sec;
    }

    function makeProgressor(exportResult) {

        // Create frame div
        exportResult.divFrame = document.createElement("div");
        exportResult.divFrame.style.display = "block";
        exportResult.divFrame.className = "section";

        // Create percent label
        exportResult.labelSummary = document.createElement("label");
        exportResult.labelSummary.innerHTML = "Submitted";
        exportResult.labelSummary.style.display = "block";
        exportResult.divFrame.appendChild(exportResult.labelSummary);

        // Add labels for products
        var isStripMapDetected = false;
        var exportItems = exportResult.exportItems;
        for (var i = 0; i < exportItems.length; i++) {

            var exportItem = exportItems[i];
            var exporter = exportItem.exporter;
            var productName = exportItem.productName;
            var mapSheetName = exportItem.mapSheetName;
            var customName = PodUtilities.trim(exportItem.customName);
            exportItem.productLabel = document.createElement("label");
            exportItem.productLabel.innerHTML = productName + ", " + mapSheetName + ", " + exporter;
            exportItem.productLabel.style.display = "block";
            exportItem.exportStage = "in progress";
            if (customName !== "")
                exportItem.productLabel.innerHTML += ", " + customName;

            if (exporter == "Multi-page PDF")
                if (isStripMapDetected)
                    continue;
                else
                    isStripMapDetected = true;

            exportResult.divFrame.appendChild(exportItem.productLabel);
        }

        // Add progress bar
        exportResult.divDone = document.createElement("div");
        exportResult.divDone.className = "progressbarComplete";
        exportResult.divFrame.appendChild(exportResult.divDone);

        exportResult.divToDo = document.createElement("div");
        exportResult.divToDo.className = "progressbarIncomplete";
        exportResult.divFrame.appendChild(exportResult.divToDo);

        exportResult.brGap = document.createElement("br");
        exportResult.brGap.className = "clear";
        exportResult.divFrame.appendChild(exportResult.brGap);

        // Add export section to HTML
        if (this.exportContentDiv === null)
            this.exportContentDiv = document.createElement("div");

        if (!this.isResultsReversed || this.insertionPointDiv === null)
            this.exportContentDiv.appendChild(exportResult.divFrame);
        else
            this.exportContentDiv.insertBefore(exportResult.divFrame, this.insertionPointDiv);

        this.insertionPointDiv = exportResult.divFrame;
    }

    function moveProgressor() {

        this.exportResult.timestampCurrent = new Date();
        if (this.exportResult.timestampCurrent - this.exportResult.timestampUpdate > updateProgressTimeout) {

            this.exportResult.timestampCurrent.setTime(this.exportResult.timestampUpdate.getTime() + updateProgressTimeout);
            this.exportResult.divToDo.style.cursor = "wait";
            this.exportResult.divDone.style.cursor = "wait";
        } else {

            this.exportResult.divToDo.style.cursor = "progress";
            this.exportResult.divDone.style.cursor = "progress";
        }

        var elapsedSec = (this.exportResult.timestampCurrent - this.exportResult.timestampStart) / 1000;
        var percent = 100 * (1 - Math.pow(1 - 1 / 130.789 / this.exportResult.exportItems.length, elapsedSec));

        var roundedPercent = Math.round(percent * 10) / 10;
        if (percent > 90)
            roundedPercent = (percent > 99) ? Math.round(percent * 1000) / 1000 : Math.round(percent * 100) / 100;

        // Updating UI
        var msg = ((this.exportResult.jobStatus == "esriJobSubmitted") ? " Submitted " : " Export ") + roundedPercent + "%";
        this.exportResult.labelSummary.innerHTML = this.exporter.getTimeElapsedString(this.exportResult.timestampStart) + msg;
        this.exportResult.divToDo.style.width = (100 - percent) + "%";
        this.exportResult.divDone.style.width = percent + "%";
    }

    function onLinkReadyStateChange() {
        if (this.linkStateRequest.readyState != 4)
            return;

        this.hRef.innerHTML = this.hRef.innerHTML.substr(0, this.hRef.innerHTML.length - 2);
        var isCurrent = (this.hRef.linkStatusCode !== 0);
        this.hRef.linkStatusCode = this.linkStateRequest.status;

        if (this.linkStateRequest.status == 404 || this.linkStateRequest.status == 400) {

            this.hRef.exportItems[this.hRef.exportItemNo].productLabel.style.display = "block";
            this.hRef.style.display = "none";
        }

        if (isCurrent)
            this.exporter.openLink(this.hRef);
    }

    function openLink(hRef) {

        var exportItem = hRef.exportItems[hRef.exportItemNo];
        if (hRef.linkStatusCode == 404 || hRef.linkStatusCode == 400)
            alert(i18n.podExport.fileNotExist);
        else if (hRef.linkStatusCode != 200 && exportItem.exportStage != "shown to user") // 200 OK
            alert(string.substitute(i18n.podExport.linkStatus, {
            linkStatus: hRef.linkStatusCode
        }));
        else {

            exportItem.exportStage = "shown to user";
            var newWin = window.open(hRef.href);
            if (typeof newWin == "undefined")
                alert(i18n.podExport.openInNewWindow);
            else
                newWin.focus();
        }
    }

    function openResult(e) {
        if (this.exporter.checkExportedFiles)
            try {

                for (var i = 0; i < this.hRef.exportItems.length; i++) {

                    var exportItem = this.hRef.exportItems[i];
                    var linkStateRequest = new XMLHttpRequest();
                    linkStateRequest.onreadystatechange = lang.hitch({
                        exporter: this.exporter,
                        linkStateRequest: linkStateRequest,
                        hRef: exportItem.hRef
                    }, this.exporter.onLinkReadyStateChange);
                    exportItem.hRef.linkStatusCode = (i == this.hRef.exportItemNo) ? -1 : 0;
                    linkStateRequest.open("HEAD", exportItem.hRef.href, true);
                    linkStateRequest.send();

                    exportItem.hRef.innerHTML += " *";
                }

                e.preventDefault();
                return false;
            } catch (openResultException) {
                this.exporter.checkExportedFiles = false;
        }

        this.hRef.linkStatusCode = 200;
        this.exporter.openLink(this.hRef);
        e.preventDefault();
        return false;
    }

    function processExportResults(result) {
        this.exportResult.jobStatus = "localJobCompleted";
        var exportItems = this.exportResult.exportItems;
        var isStripMapDetected = false;
        var exportedProducts = [];
        var files = result.value;
        var i, j, k;

        // Replace product labels with links to results
        for (i = 0; i < files.length; i++) {

            var file = files[i];
            if (file.length < 4)
                continue;

            var exportItem;
            var exportItemNo = -1;
            var fileExtensions = file.toLowerCase().split(".");
            var noAGS = file.slice(5 + file.toLowerCase().search("_ags_"));
            var fileExtension = fileExtensions[fileExtensions.length - 1];
            var fileNameParts = noAGS.toUpperCase().split("_");

            // Look for "Strip Map" as a part of file name
            for (j = 0; j < exportItems.length && exportItemNo < 0; j++) {

                exportItem = exportItems[j];
                if (exportItem.exporter == "Multi-page PDF" && fileNameParts.length == 7 && this.exportedFileExtensionCheck(exportItem.exporter, fileExtension))
                    exportItemNo = j;

                for (k = 0; k < 1 && exportItemNo >= 0; k++)
                    if (fileNameParts[k] != "Strip Map")
                        exportItemNo = -1;
            }

            // Match map sheet name first
            var productNameParts;
            for (j = 0; j < exportItems.length && exportItemNo < 0; j++) {

                exportItem = exportItems[j];
                productNameParts = exportItem.mapSheetName.toUpperCase().split("_");
                if (productNameParts.length == fileNameParts.length - 2 && this.exportedFileExtensionCheck(exportItem.exporter, fileExtension))
                    exportItemNo = j;

                for (k = 0; k < productNameParts.length && exportItemNo >= 0; k++)
                    if (productNameParts[k] != fileNameParts[k])
                        exportItemNo = -1;
            }

            // Match custom name if map sheet name not found
            for (j = 0; j < exportItems.length && exportItemNo < 0; j++) {

                exportItem = exportItems[j];
                productNameParts = exportItem.customName.toUpperCase().split("_");
                if (productNameParts.length == fileNameParts.length - 2 && this.exportedFileExtensionCheck(exportItem.exporter, fileExtension))
                    exportItemNo = j;

                for (k = 0; k < productNameParts.length && exportItemNo >= 0; k++)
                    if (productNameParts[k] != fileNameParts[k])
                        exportItemNo = -1;
            }

            // If product label not found then just insert link to file
            if (exportItemNo < 0) {

                var productLabel = document.createElement("label");
                productLabel.style.display = "block";
                exportItemNo = exportItems.length;
                productLabel.innerHTML = file;
                exportItems.push({
                    productName: file,
                    mapSheetName: file,
                    customName: file,
                    exporter: fileExtension,
                    productLabel: productLabel,
                    exportStage: "succeeded"
                });

                this.exportResult.divFrame.insertBefore(productLabel, this.exportResult.brGap);
                exportedProducts.push({
                    productId: null,
                    fileLink: file
                });
                exportItem = exportItems[exportItemNo];
            } else {

                exportItem = exportItems[exportItemNo];
                for (j = 0; j < this.exportResult.productIds.length; j++) {

                    var product = this.exportResult.products[this.exportResult.productIds[j]];
                    if (product !== undefined)
                        if (exportItem.customName != PodUtilities.trim(product.getAttributeValue("customName")) ||
                            exportItem.mapSheetName != product.getAttributeValue("mapSheetName") ||
                            exportItem.exporter != product.getAttributeValue("exporter") ||
                            exportItem.productName != product.productName)
                            continue;

                    exportedProducts.push({
                        productId: this.exportResult.productIds[j],
                        fileLink: file
                    });
                    break;
                }
            }

            var hRef = document.createElement("a");
            exportItem.exportStage = "succeeded";
            hRef.setAttribute("href", file);
            hRef.style.display = "block";

            var isMultiPagePdf = (exportItem.exporter == "Multi-page PDF");
            if (!isMultiPagePdf || !isStripMapDetected) {

                hRef.innerHTML = exportItem.productLabel.innerHTML;
                exportItem.productLabel.style.display = "none";
                isStripMapDetected = isMultiPagePdf;
            }

            exportItem.hRef = hRef;
            hRef.exportItems = exportItems;
            hRef.exportItemNo = exportItemNo;
            hRef.onclick = lang.hitch({
                exporter: this.exporter,
                hRef: hRef
            }, this.exporter.openResult);
            this.exportResult.divFrame.insertBefore(hRef, exportItem.productLabel);
        }

        this.exportResult.divFrame.removeChild(this.exportResult.brGap);
        if (this.exporter.exportCompletionCallback !== null)
            this.exporter.exportCompletionCallback(exportedProducts);
    }

    function setExportCompletionCallback(callback) {

        if (callback !== undefined)
            this.exportCompletionCallback = callback;
    }

    function setExportContentDiv(div, isNewTopmost) {

        if (div === undefined)
            return;

        if (this.insertionPointDiv !== null)
            alert(i18n.podExport.exportError);

        this.isResultsReversed = (isNewTopmost) ? true : false;
        this.insertionPointDiv = null;
        this.exportContentDiv = div;

        while (this.exportResults.length > 0)
            this.exportResults.pop();
    }

    function exportedFileExtensionCheck(exporterName, fileExtension) {

        var exporterDomains = cfgManager.getTableProperties("exporter", "domain");
        for (var d = 0; d < exporterDomains.length; d++) {

            var exporterDomain = cfgManager.getTable(exporterDomains[d]);
            for (var i = 0; i < exporterDomain.length; i++) {

                var exporter = exporterDomain[i];
                if (exporter.value != exporterName)
                    continue;

                var extensions = exporter.extensions.split(",");
                for (var j = 0; j < extensions.length; j++)
                    if (extensions[j] == fileExtension)
                        return true;
            }
        }

        return false;
    }

});
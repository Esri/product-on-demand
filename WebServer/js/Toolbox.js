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
    "dojo/_base/fx",
    "dojo/dom",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/i18n!./nls/podi18n",
    "dijit/TooltipDialog",
    "dijit/popup",
    "dijit/focus",
    "./ConfigurationManager",
    "./Product/ProductDescriptor"
], function(declare, fx, dom, style, domClass, i18n, TooltipDialog, popup, focusUtil, cfgManager) {

    var Toolbox = {
        prepared: false,
        toolboxWidth: 220,
        minToolboxWidth: 220,
        tbxContainer: null,
        currentProduct: null,
        toolboxDlg: null,
        toolArray: [],
        activeMapCommand: null,
        onSelectTool: null,

        getButtonNode: function(mapCommand) {

            return dom.byId("button_" + mapCommand);
        },

        setTitleButton: function(isHighlight) {

            var img = dom.byId("headerIconImageTool");
            if (this.activeMapCommand === null) {

                img.src = (isHighlight) ? "images/toolboxgreen.png" : "images/toolboxgrey.png";
                img.className = "headerIconImageClass";
            } else {

                var btnImg = dom.byId("buttonImage_" + this.activeMapCommand);
                img.className = "headerIconImageClass2";
                if (btnImg != null)
                    img.src = btnImg.src;
            }
        },

        harmoniseToolbox: function() {
            var toolboxDiv = dom.byId("toolboxDiv");
            while (toolboxDiv.firstChild) {
                toolboxDiv.removeChild(toolboxDiv.firstChild);
            }

            if (this.currentProduct == null) {
                toolboxDiv.style.height = "10px";
                return;
            }

            var mapCommandButtonsAttr = this.currentProduct.getAttribute("mapCommandButtons");
            if (mapCommandButtonsAttr == null || mapCommandButtonsAttr.filter == null)
                return;

            var defaultCommandAttr = this.currentProduct.getAttribute("mapCommandDefault");
            var defaultCommand;
            if (!ProductDescriptor.isEmpty(defaultCommandAttr))
                defaultCommand = defaultCommandAttr.value;

            function createRow() {
                var toolDiv = document.createElement("div");
                toolDiv.className = "toolRow";
                var toolList = document.createElement("ul");
                toolList.className = "toolRowList";
                toolDiv.appendChild(toolList);
                return {
                    div: toolDiv,
                    ul: toolList
                };
            }

            var rows = [];
            var maxRowItemCount = 0;
            var row = createRow();
            var cnt;
            for (var iCB in mapCommandButtonsAttr.filter) {
                var cmd = mapCommandButtonsAttr.filter[iCB];
                if (cmd != "-") {
                    var li = this.toolArray[cmd];
                    if (li == null)
                        continue;
                    row.ul.appendChild(li);
                    var btn = li.children[0];
                    if (btn != null) {
                        if (cmd == defaultCommand)
                            domClass.add(btn, "buttonSelected");
                        else
                            domClass.remove(btn, "buttonSelected");
                    }

                } else {
                    cnt = row.ul.children.length;
                    if (cnt > maxRowItemCount)
                        maxRowItemCount = cnt;
                    rows.push(row);
                    toolboxDiv.appendChild(row.div);
                    row = createRow();
                }
            }

            if (row.ul.children.length !== 0) {
                cnt = row.ul.children.length;
                if (cnt > maxRowItemCount)
                    maxRowItemCount = cnt;
                rows.push(row);
                toolboxDiv.appendChild(row.div);
            }

            toolboxDiv.style.height = (rows.length * 105).toString() + "px";
            toolboxDiv.style.width = (maxRowItemCount * 110).toString() + "px";
            Toolbox.toolboxWidth = (maxRowItemCount * 110) + 24;
            if (Toolbox.toolboxWidth < Toolbox.minToolboxWidth)
                Toolbox.toolboxWidth = Toolbox.minToolboxWidth;
        }
    };

    var PodToolbox = declare("Toolbox", null, {

        create: function(container, clbck) {
            if (Toolbox.prepared)
                return this;

            Toolbox.prepared = true;
            Toolbox.onSelectTool = clbck;
            Toolbox.tbxContainer = dom.byId(container);
            if (Toolbox.tbxContainer == null)
                return null;

            Toolbox.tbxContainer.title = i18n.toolbox.title;

            Toolbox.tbxContainer.onmouseover = function() {

                Toolbox.setTitleButton(true);
                dom.byId("headerIconArrowTool").style.display = "block";
            };

            Toolbox.tbxContainer.onmouseout = function() {

                Toolbox.setTitleButton(Toolbox.toolboxDlg._isShown());
                dom.byId("headerIconArrowTool").style.display = "none";
            };

            hideToolbox = function () {

                style.set("ToolboxDialog", "opacity", "1");
                style.set("ToolboxDialog", "width", Toolbox.toolboxWidth + "px");

                fx.animateProperty({
                    node: "ToolboxDialog",
                    duration: 350,
                    properties: {
                        opacity: 0,
                        width: {
                            start: Toolbox.toolboxWidth,
                            end: 50
                        }
                    },
                    onEnd: function() {

                        popup.close(Toolbox.toolboxDlg);
                        Toolbox.setTitleButton(false);
                    }
                }).play();
            };

            var content = document.createElement("div");
            content.className = "panel";
            content.id = "tbContent";
            content.style.width = (Toolbox.toolboxWidth - 20).toString() + "px";

            var closeBtn = document.createElement("div");
            closeBtn.className = "close-arrow";
            closeBtn.onclick = hideToolbox;
            content.appendChild(closeBtn);

            var header = document.createElement("h1");
            header.innerHTML = i18n.toolbox.title;
            header.style.marginLeft = "10px";
            content.appendChild(header);
            var closeBtnR = document.createElement("div");
            closeBtnR.className = "close-cross";
            closeBtnR.onclick = hideToolbox;

            content.appendChild(closeBtnR);
            Toolbox.toolboxDlg = new TooltipDialog({
                id: "ToolboxDialog",
                style: "width: " + Toolbox.toolboxWidth + "px;padding:0;height:auto;display:block",
                tabindex: 11,
                autofocus: true,
                onFocus: function() {

                    focusUtil.focus(dom.byId("toolboxDiv"));
                }
            });

            Toolbox.toolboxDlg.attr("content", content);


            // Get all the map command domains
            var toolDiv = document.createElement("div");
            toolDiv.style.width = (Toolbox.toolboxWidth - 20).toString() + "px";
            toolDiv.style.height = "10px";
            toolDiv.id = "toolboxDiv";
            toolDiv.style.border = "none";

            var tabindex = 30;
            function li_onclick(e) {

                var mapCommand = e.currentTarget.id;
                if (Toolbox.activeMapCommand !== mapCommand)
                    Toolbox.onSelectTool(mapCommand);

                hideToolbox();
            }

            var mapCommandDomains = cfgManager.getBaseTableProperties("mapCommandButtons", "domain");
            var mapCommandDomain = cfgManager.getTable(mapCommandDomains);
            for (var iCommand in mapCommandDomain) {

                var mapCommand = mapCommandDomain[iCommand];
                if (ProductDescriptor.isEmpty(mapCommand.image))
                    continue;

                if (mapCommand.value == "-")
                    continue;

                var li = document.createElement("li");
                li.id = mapCommand.value;
                li.className = "toolRowItem";
                li.onclick = li_onclick;
                var button = document.createElement("span");
                button.title = mapCommand.tooltip;
                button.id = "button_" + mapCommand.value;
                button.className = "buttonSelect";
                button.mapCommand = mapCommand;
                li.appendChild(button);
                li.tabIndex = ++tabindex;
                var buttonImage = document.createElement("img");
                buttonImage.src = mapCommand.image;
                buttonImage.id = "buttonImage_" + mapCommand.value;
                button.appendChild(buttonImage);
                Toolbox.toolArray[mapCommand.value] = li;
            }

            content.appendChild(toolDiv);
            popup.open({
                popup: Toolbox.toolboxDlg,
                around: Toolbox.tbxContainer
            });
            popup.close(Toolbox.toolboxDlg);

            var openToolbox = function() {

                if (Toolbox.toolboxDlg._isShown()) {

                    hideToolbox();
                    return;
                }

                popup.open({
                    popup: Toolbox.toolboxDlg,
                    around: Toolbox.tbxContainer
                });

                style.set("ToolboxDialog", "opacity", "0");
                style.set("ToolboxDialog", "width", "50px");
                fx.animateProperty({
                    node: "ToolboxDialog",
                    duration: 350,
                    properties: {
                        opacity: 1,
                        width: {
                            start: 50,
                            end: Toolbox.toolboxWidth
                        }
                    },
                    onEnd: function() {

                        style.set("ToolboxDialog", "opacity", "1");
                        style.set("ToolboxDialog", "width", Toolbox.toolboxWidth + "px");
                        Toolbox.setTitleButton(true);
                        Toolbox.toolboxDlg.focus();
                    }
                }).play();
            };

            Toolbox.tbxContainer.onclick = openToolbox;
            Toolbox.tbxContainer.onkeydown = function(e) {

                if (e.keyCode == 13)
                    openToolbox();

                if (e.keyCode == 27)
                    hideToolbox();
            };

            return this;
        },


        productChanged: function(product) {
            Toolbox.currentProduct = product;
            Toolbox.harmoniseToolbox();
        },

        activate: function(mapCommand) {

            // 0 0 nothing to do
            // 0 x select
            // x 0 unselect
            // x x nothing to do
            // x y unselect then select
            if (mapCommand == Toolbox.activeMapCommand) // nothing to do
                return;

            var node;
            if (Toolbox.activeMapCommand !== null) { // unselect

                node = Toolbox.getButtonNode(Toolbox.activeMapCommand);
                if (node != null)
                    domClass.remove(node, "buttonSelected");

                Toolbox.activeMapCommand = null;
            }

            if (mapCommand != null) { // select

                node = Toolbox.getButtonNode(mapCommand);
                if (node != null)
                    domClass.add(node, "buttonSelected");

                Toolbox.activeMapCommand = mapCommand;
            }

            Toolbox.setTitleButton(Toolbox.toolboxDlg._isShown());
        },

        getContainer: function() {

            return Toolbox.tbxContainer;
        }
    });

    return new PodToolbox();
});
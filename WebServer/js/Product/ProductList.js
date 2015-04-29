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
    "dojo/on",
    "dojo/dom-construct",
    "../podUtilities"
], function(declare, lang, array, dom, on, domConstruct) {

    return declare("ProductList", null, {
        classes: {
            optionsContainer: "optionsContainer",
            emptyItem: "empty",
            productList: "",
            selectedOpenItem: "productItemSelectedOptions",
            selectedItem: "productItemSelected",
            notSelectedItem: "productItem"
        },

        CreateOptionGrid: null,

        constructor: function(id, parentNode) {
            this.parentElement = parentNode;
            this.theID = id;
            if (this.parentElement != null) {
                on(this.parentElement, "keydown", lang.hitch(this, function(e) {
                    this.navigate(e, this);
                }));
            }

            this.optionGrid = null;
            this.emptyItem = null;
            this.selectedItems = [];
            this.lastSelectedItem = null;
            this.startShiftSelectedItemId = null;
            this.listContainer = null;
            this.alwaysSelection = false;
            this.allowDeleting = true;

            // Events
            this.OnDblClick = null;
            this.OnClick = null;
            this.OnProductAdded = null;
            this.OnProductDeleted = null;
            this.OnSelectionChanged = null;
            this.hideOptions = function(e) {

                var li;
                if (e.currentTarget != null) {
                    li = e.currentTarget;
                } else {
                    li = this.findLi(e);
                }
                if (li == null) {
                    return;
                }
                if (li.className === this.classes.selectedOpenItem) {
                    li.className = this.classes.selectedItem;
                }

                if (this.optionGrid != null) {
                    domConstruct.destroy(this.optionGrid.id);
                    this.optionGrid = null;
                }
            };
        },

        findLi: function(id) {

            var list = this.productList.children;
            for (var i = 0; i < list.length; i++) {

                var li = list[i];
                if (li === undefined) {
                    alert("Assertion failed:\n\nProduct " + i + "/" + list.length + " is undefined in the products list.");
                } else if (li.id === id) {
                    return li;
                }

            }

            return null;
        },

        setParent: function(parent) {
            if (parent == null) {
                return;
            }
            on(parent, "keydown", lang.hitch(this, function(e) {
                this.navigate(e);
            }));
        },

        Delete: function(itemsToDelete) {

            if (this.optionGrid != null) {
                var optionId = this.optionGrid.id;
                domConstruct.destroy(optionId);
                this.optionGrid = null;
            }

            for (var idx = 0; idx < itemsToDelete.length; ++idx) {
                var itemId = itemsToDelete[idx];
                if (this.selectedItems[itemId] != null) {
                    delete this.selectedItems[itemId];
                }
                domConstruct.destroy(itemId);

                if (this.OnProductDeleted !== null) {
                    this.OnProductDeleted(itemId);
                }
                if (this.OnSelectionChanged !== null) {
                    this.OnSelectionChanged(false);
                }
            }

            this.lastSelectedItem = null;
            this.startShiftSelectedItemId = null;

        },

        getCount: function() {
            if (this.productList == null) {
                return 0;
            }
            var n = this.productList.children.length;
            if (this.optionGrid != null) {
                --n;
            }
            if (dom.byId("emptyli" + this.theID) != null) {
                --n;
            }

            return n;
        },

        setEvent: function(event, callback) {
            switch (event) {
                case "dblclick":
                    this.OnDblClick = callback;
                    break;
                case "click":
                    this.OnClick = callback;
                    break;
                case "productAdded":
                    this.OnProductAdded = callback;
                    break;
                case "selectionChanged":
                    this.OnSelectionChanged = callback;
                    break;
                case "productDeleted":
                    this.OnProductDeleted = callback;
                    break;
            }
        },

        selectItem: function (s) {
        	if (s == null) {
        		this.lastSelectedItem = null;
        		return null;
        	}

        	//get current selected item
        	var curTarget;
        	if ((typeof s) == "string") {
        	    curTarget = this.findLi(s, this);
        	} else if (s.currentTarget == null) {
        	    curTarget = s;
        	} else {
        	    curTarget = s.currentTarget;
        	}
            
        	if (curTarget == null) {
        	    return;
        	}

        	if (curTarget.className === "empty") {
        		return;
        	}

        	//clear selection
        	var selectedKeys = Object.keys(this.selectedItems);
        	if (!s.ctrlKey) {
        		for (var i = 0; i < selectedKeys.length; i++) {
        			if (curTarget.id != selectedKeys[i]) {
        				this.selectedItems[selectedKeys[i]].className = this.classes.notSelectedItem;
        				delete this.selectedItems[selectedKeys[i]];
        			}
        		}
        	}

        	//handle shift
        	if (s.shiftKey) {
        		var doSelect = false;
        		var stopSelect = false;
        		for (var i = 0; i < this.productList.children.length && !stopSelect; i++) {
        			var productListItem = this.productList.children[i];
        			if (productListItem === undefined || productListItem.className === "empty")
        				continue;

        			if (!doSelect && ((productListItem.id === this.startShiftSelectedItemId && this.startShiftSelectedItemId != null) || productListItem.id === curTarget.id)) {
        				doSelect = true;
        			}
        			else if (doSelect && ((productListItem.id === this.startShiftSelectedItemId && this.startShiftSelectedItemId != null) || productListItem.id === curTarget.id)) {
        				stopSelect = true;
        			}

        			if (doSelect) {
        				this.selectedItems[productListItem.id] = productListItem;
        				productListItem.className = this.classes.selectedItem;
        				if ((this.startShiftSelectedItemId == null) || (this.startShiftSelectedItemId != null && curTarget.id === this.startShiftSelectedItemId)) {
        					stopSelect = true;
        				}
        			}
        		}
        	}

        	//set current selected item
        	if ((!s.ctrlKey && curTarget.className !== this.classes.selectedOpenItem)
				|| (s.ctrlKey && curTarget.className !== this.classes.selectedItem)) {
        		this.selectedItems[curTarget.id] = curTarget;
        		curTarget.className = this.classes.selectedOpenItem;
        		this.showOptions(curTarget.id);
        	}
        	else if (s.ctrlKey && curTarget.className !== this.classes.selectedOpenItem) {
        		curTarget.className = (curTarget.className === this.classes.selectedItem ? this.classes.notSelectedItem : this.classes.selectedItem);
        	}

        	if (this.OnClick !== null) {
        		this.OnClick(curTarget.id);
        	}

        	if (this.OnSelectionChanged !== null) {
        		this.OnSelectionChanged();
        	}

        	this.lastSelectedItem = curTarget.id;

        	if (!s.shiftKey || this.startShiftSelectedItemId == null)
        		this.startShiftSelectedItemId = curTarget.id;
        },

        scrollToItem: function(itemId) {
            var li = this.findLi(itemId);
            if (li === null) {
                return;
            }
            var ul = li.parentNode;
            if (ul == null) {
                return;
            }
            if (ul.scrollTop + ul.offsetHeight < li.offsetTop + li.offsetHeight) {
                ul.scrollTop += li.offsetHeight;
            } else if (ul.scrollTop > li.offsetTop) {
                ul.scrollTop -= li.offsetHeight;
            }
        },

        showOptions: function(e) {

            if (e.preventDefault != null) {
                e.preventDefault();
            }

            var li;
            if (e.currentTarget != null) {
                li = e.currentTarget;
            } else {
                li = this.findLi(e);
            }

            if (li == null || li.parentElement == null) {
                return;
            }
            var oldprop;
            if (this.optionGrid != null) {
                if (this.optionGrid.id === li.id) {
                    return;
                }
                oldprop = this.optionGrid.product;
                this.hideOptions(this.optionGrid.product);
            }

            li.className = this.classes.selectedOpenItem;
            if (this.selectedItems[li.id] == null) {
                this.selectedItems[li.id] = li;
            }
            var columnCount = Math.floor(li.parentElement.clientWidth / li.offsetWidth);

            var row = Math.floor((li.offsetTop - li.parentNode.offsetTop) / li.clientHeight + 0.5);
            var where = columnCount * (row + 1);
            var productOptions = document.createElement("li");
            productOptions.className = this.classes.optionsContainer;
            productOptions.id = "productOption" + this.theID;
            productOptions.product = li.id;
            hideOptionsEvent = function(liId, ogId) {
                var li = dom.byId(liId);
                if (li == null) {
                    return;
                }
                li.className = li.className.replace("Options", "");

                domConstruct.destroy(ogId);

            };

            var productOptionContent = "<div id='poc " + li.id + "' class='arr' style='left:" + (li.offsetLeft + (li.parentElement.offsetLeft === 0 ? 11 : 0)).toString() + "px;' title='Hide product \rproperies' onclick='hideOptionsEvent(&#39;" + li.id + "&#39;, &#39;productOption" + this.theID + "&#39;)' ></div><div id = 'ppt " + li.id + "' class='productOptionTable' ></div>";
            productOptions.innerHTML = productOptionContent;

            if (where < this.getCount()) {
                domConstruct.place(productOptions, this.productList, where);
            } else {
                this.productList.appendChild(productOptions);
            }
            if (this.CreateOptionGrid === null) {
                return;
            }
            this.CreateOptionGrid(dom.byId("ppt " + li.id), li.id);

            if (this.OnDblClick !== null) {
                this.OnDblClick(li.id);
            }
            this.lastSelectedItem = li.id;
            this.productList.scrollTop = li.offsetTop - li.parentNode.offsetTop;
            this.optionGrid = dom.byId(productOptions.id);
        },

        navigate: function(event) {

        	var keyCode = event.keyCode || event.charOrCode;
            if (keyCode === 9) {
                this.parentElement.focus();
                return;
            }

            if (event.srcElement.className === "productOptionEditable") {
                return;
            }

            if (keyCode === 46 && this.allowDeleting) {
                this.Delete(Object.keys(this.selectedItems));
            } else if (keyCode === 13 || keyCode === 27) {
                if (this.optionGrid != null) {
                    this.hideOptions(this.optionGrid.product);
                }
                if (keyCode === 13) {
                    this.showOptions(this.lastSelectedItem);
                }
            } else if (keyCode > 36 && keyCode < 41) {

                var lastChild = this.productList.lastChild.previousSibling;
                if (lastChild == null) {
                    return;
                }
                if (lastChild.className === this.classes.optionsContainer) {
                    lastChild = lastChild.previousSibling;
                }
                var n, columnCount;
                switch (keyCode) {
                    case 37: // left
                        var li;
                        if (this.lastSelectedItem == null) {
                            this.selectItem(lastChild);
                            li = lastChild;
                        } else {
                            li = dom.byId(this.lastSelectedItem);
                            if (li != null) {
                                var prev = li.previousSibling;
                                if (prev == null) {
                                    break;
                                }
                                if (prev.className === this.classes.optionsContainer) {
                                    prev = prev.previousSibling;
                                }
                                prev.shiftKey = (event.shiftKey && this.theID == "exportList")
                                this.selectItem(prev);
                            }
                        }
                        break;
                    case 38: //up
                        if (this.lastSelectedItem == null) {
                            this.selectItem(lastChild);
                            li = lastChild;
                        } else {
                            li = dom.byId(this.lastSelectedItem);
                            if (li == null) {
                                break;
                            }
                            columnCount = Math.floor(this.productList.offsetWidth / li.offsetWidth + 0.5);
                            for (n = 0; n < columnCount && li != null;) {
                                li = li.previousSibling;
                                if (li != null && li.className !== this.classes.optionsContainer) {
                                    n++;
                                }
                            }
                            li.shiftKey = (event.shiftKey && this.theID == "exportList")
                            this.selectItem(li);
                        }

                        break;
                    case 39: //right
                        if (this.lastSelectedItem == null) {
                            this.selectItem(this.productList.firstChild);
                            li = this.productList.firstChild;
                        } else {
                            li = dom.byId(this.lastSelectedItem);
                            if (li != null) {
                                var next = li.nextSibling;
                                if (next == null) {
                                    return;
                                }
                                if (next.className === this.classes.optionsContainer) {
                                    next = next.nextSibling;
                                }
                                next.shiftKey = (event.shiftKey && this.theID == "exportList")
                            	this.selectItem(next);
                            }
                        }
                        break;
                    case 40: //down
                        if (this.lastSelectedItem == null) {
                            this.selectItem(this.productList.firstChild);
                            li = this.productList.firstChild;
                        } else {
                            li = dom.byId(this.lastSelectedItem);
                            if (li == null) {
                                break;
                            }

                            columnCount = Math.floor(this.productList.offsetWidth / li.offsetWidth + 0.5);
                            for (n = 0; n < columnCount;) {
                                li = li.nextSibling;
                                if (li == null || li.className === "empty") {
                                    li = lastChild;
                                    break;
                                }

                                if (li != null && li.className != this.classes.optionsContainer) {
                                    n++;
                                }
                            }
                            if (li != null) {
                            	li.shiftKey = (event.shiftKey && this.theID == "exportList")
                            	this.selectItem(li);
                            }
                        }
                        break;
                    default:
                        return;
                }

                this.scrollToItem(this.lastSelectedItem);
            }
        },

        getSelected: function() {
            return Object.keys(this.selectedItems);
        },
        setSelected: function(s, select /*true by default*/ ) {
            if (select === false && this.optionGrid != null) {
                domConstruct.destroy(this.optionGrid.id);
            }
            var li;
            if ((typeof s) == "string") {
                li = this.findLi(s, this);
            } else {
                li = s;
            }

            if (li == null) {
                return;
            }
            if (this.selectedItems[li.id] != null && select === false) {
                delete this.selectedItems[li.id];
            }
            li.className = this.classes.notSelectedItem;
            if (select !== false) {
                this.selectedItems[li.id] = li;
                li.className = this.classes.selectedItem;
            }

            if (this.OnSelectionChanged !== null) {
                this.OnSelectionChanged();
            }
        },
        clearSelection: function() {
            if (this.optionGrid != null) {
                domConstruct.destroy(this.optionGrid.id);
            }
            var selections = Object.keys(this.selectedItems);
            var clearer = {
                className: this.classes.notSelectedItem,
                collection: selections,
                items: this.selectedItems,
                clear: function() {
                    for (var idx = 0; idx < this.collection.length; ++idx) {
                        this.items[this.collection[idx]].className = this.className;
                    }
                }
            };
            clearer.clear();

            this.selectedItems = [];

            if (this.OnSelectionChanged !== null) {
                this.OnSelectionChanged();
            }
        },
        getItems: function() {
            var items = [];
            if (this.productList == null) {
                return items;
            }
            array.forEach(this.productList.children, lang.hitch(this, function(li) {
                if (li.className != this.classes.optionsContainer && li.className != this.classes.emptyItem) {
                    items.push(li.id);
                }
            }));

            return items;
        },
        deleteItems: function(itemsToDelete) {
            this.Delete(itemsToDelete, this);

        },
        isVisible: function() {
            return this.listContainer.clientHeight !== 0;
        },
        showProperties: function(product, mode) {
        	this.selectItem(product);
        }
    });
});
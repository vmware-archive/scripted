/*******************************************************************************
 * @license
 * Copyright (c) 2011 - 2012 IBM Corporation, VMware and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors:
 *  IBM Corporation - initial API and implementation
 *     Andy Clement - hacked to support our needs in scripted (needs more work)
 ******************************************************************************/

/*global define window */
/*jslint regexp:false browser:true forin:true*/

define('scripted/navigator/explorer',['require', 'dojo', 'scripted/navigator/treetable'], function(require, dojo, mTreeTable){

var exports = {};

exports.Explorer = (function() {
	/**
	 * Creates a new explorer.
	 *
	 * @name orion.explorer.Explorer
	 * @class A table-based explorer component.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The service registry to
	 * use for any services required by the explorer
	 * @param {orion.selection.Selection} selection The initial selection
	 * @param renderer
	 */
	function Explorer(serviceRegistry, selection, renderer) {
		this.registry = serviceRegistry;
		this.renderer = renderer;
		this.selection = selection;
		this.myTree = null;
	}
	Explorer.prototype = /** @lends orion.explorer.Explorer.prototype */ {
		
		// we have changed an item on the server at the specified parent node
		changedItem: function(parent, children) {
			dojo.hitch(this.myTree, this.myTree.refreshAndExpand)(parent, children);
		},
		updateCommands: function(item){
			// update the commands in the tree if the tree exists.
			if (this.myTree) {
				dojo.hitch(this.myTree._renderer, this.myTree._renderer.updateCommands(item));
			}
		},
		
		makeNewItemPlaceHolder: function(item, domId, column_no) {
			// we want to popup the name prompt underneath the parent item.
			var refNode = this.getRow(item);
			var tempNode;
			if(column_no){
				refNode = refNode.childNodes[column_no];
				// make a row and empty column so that the new name appears after checkmarks/expansions
				dojo.place("<br><span id='"+domId+"placeHolderRow'></span>", refNode, "last");
				tempNode = dojo.byId(domId+"placeHolderRow");
				if (tempNode) {
					return {tempNode: tempNode, refNode: tempNode};
				}
			}
			if (refNode) {
				// make a row and empty column so that the new name appears after checkmarks/expansions
				dojo.place("<tr id='"+domId+"placeHolderRow'><td id='"+domId+"placeHolderCol'></td>", refNode, "after");
				tempNode = dojo.byId(domId+"placeHolderRow");
				refNode = dojo.byId(domId+"placeHolderCol");
				if (tempNode && refNode) {
					return {tempNode: tempNode, refNode: refNode};
				}
			}
			return null;
		},
		
		getRow: function(item) {
			var rowId = this.model.getId(item);
			if (rowId) {
				return dojo.byId(rowId);
			}
		},
		
		/**
		 * Displays tree table containing filled with data provided by given model
		 * 
		 * @param parentId id of parent dom element
		 * @param model providing data to display
		 * @param options optional parameters of the tree(custom indent, onCollapse callback)
		 */
		createTree: function (parentId, model, options,postCreate){
			var treeId = parentId + "innerTree";
			var existing = dojo.byId(treeId);
			if (existing) {
				dojo.destroy(existing);
			}
			if (model){
				model.rootId = treeId;
			}
			this.model = model;
			this.myTree = new mTreeTable.TableTree({
				id: treeId,
				model: model,
				showRoot: true,
				parent: parentId,
				labelColumnIndex: this.renderer.getLabelColumnIndex(),
				renderer: this.renderer,
				indent: options ? options.indent: undefined,
				onCollapse: options ? options.onCollapse: undefined,
				tableStyle: "mainPadding"
			});
			this.renderer._initializeUIState();
			if (typeof postCreate === "function") {
				postCreate();
			}
		},
		
		getRootPath: function() {
			if (this.model && this.model.root) {
				return this.model.root.Location;
			}
			return null;
		},
	    
	    _lastHash: null,
	    checkbox: this.checkbox || true
	};
	return Explorer;
}());

exports.ExplorerModel = (function() {
	/**
	 * Creates a new explorer model instance.
	 * @name orion.explorer.ExplorerModel
	 * @class Simple tree model using Children and ChildrenLocation attributes to fetch children
	 * and calculating id based on Location attribute.
	 */
	function ExplorerModel(rootPath, /* function returning promise */fetchItems) {
		this.rootPath = rootPath;
		this.fetchItems = fetchItems;
	}
	ExplorerModel.prototype = /** @lends orion.explorer.ExplorerModel.prototype */{
		destroy: function(){
		},
		getRoot: function(onItem){
			this.fetchItems(this.rootPath).then(
					dojo.hitch(this, function(item){
						this.root = item;
						onItem(item);
					})
					);
		},
		getChildren: function(/* dojo.data.Item */ parentItem, /* function(items) */ onComplete){
			// the parent already has the children fetched
			if (parentItem.Children) {
				onComplete(parentItem.Children);
			} else if (parentItem.ChildrenLocation) {
				this.fetchItems(parentItem.ChildrenLocation).then( 
					dojo.hitch(this, function(Children) {
						parentItem.Children = Children;
						onComplete(Children);
					})
				);
			} else {
				onComplete([]);
			}
		},

		getIdFromString: function(string) {
//TODO refactor - dup of below
// first strip slashes so we aren't processing path separators.
            var stripSlashes = string.replace(/[\\\/]/g, "");
            // these id's are used in the DOM, so we can't use characters that aren't valid in DOM id's.
            // However we need a unique substitution string for these characters, so that we don't duplicate id's
            // So we are going to substitute ascii values for invalid characters.
            // See https://bugs.eclipse.org/bugs/show_bug.cgi?id=363062

            var id = "";
            for (var i=0; i<stripSlashes.length; i++) {
                if (stripSlashes[i].match(/[^\.\:\-\_0-9A-Za-z]/g)) {
                    id += stripSlashes.charCodeAt(i);
                } else {
                    id += stripSlashes[i];
                }
            }
            return id;
        },
		getId: function(/* item */ item){
                        if (item.Location === undefined) {
                           throw "no location set for item "+item;
                        }
			if (item.Location === this.root.Location) {
				return this.rootId;
			} 
			// first strip slashes so we aren't processing path separators.
			var stripSlashes = item.Location.replace(/[\\\/]/g, "");
			// these id's are used in the DOM, so we can't use characters that aren't valid in DOM id's.
			// However we need a unique substitution string for these characters, so that we don't duplicate id's
			// So we are going to substitute ascii values for invalid characters.
			// See https://bugs.eclipse.org/bugs/show_bug.cgi?id=363062
			
			var id = "";
			for (var i=0; i<stripSlashes.length; i++) {
				if (stripSlashes[i].match(/[^\.\:\-\_0-9A-Za-z]/g)) {
					id += stripSlashes.charCodeAt(i);
				} else {
					id += stripSlashes[i];
				}
			}
			return id;
		}
	};
	return ExplorerModel;
}());

exports.ExplorerFlatModel = (function() {
	/**
	 * Creates a new flat explorer model.
	 * @name orion.explorer.ExplorerFlatModel
	 * @class Tree model used by orion.explorer.Explorer for flat structures
	 * @param {String} rootPath path to load tree table root, response should contain a list of items
	 * @param {Function} fetchItems A function that returns a promise that resolves to the
	 * items at the provided location.
	 */
	function ExplorerFlatModel(rootPath, fetchItems, root) {
		this.rootPath = rootPath;
		this.fetchItems = fetchItems;
		this.root = root;
	}
	
	ExplorerFlatModel.prototype = new exports.ExplorerModel();
	
	ExplorerFlatModel.prototype.getRoot = function(onItem){
		if(this.root){
			onItem(this.root);
		} else {
			this.fetchItems(this.rootPath).then(
					dojo.hitch(this, function(item){
						this.root = item;
						onItem(item);
					})
					);
		}
	};
	
	ExplorerFlatModel.prototype.getChildren = function(/* dojo.data.Item */ parentItem, /* function(items) */ onComplete){
		if(parentItem === this.root){
			onComplete(this.root);
		}else{
			onComplete([]);
		}
	};
	
	return ExplorerFlatModel;
}());

/********* Rendering json items into columns in the tree **************/
exports.ExplorerRenderer = (function() {
	function ExplorerRenderer (options, explorer) {
		this.explorer = explorer;
		this._init(options);
		this._expandImageClass = "core-sprite-twistie_open";
		this._collapseImageClass = "core-sprite-twistie_closed";
		this._twistieSpriteClass = "modelDecorationSprite";
	}
	ExplorerRenderer.prototype = {
	
		getLabelColumnIndex: function() {
			return this.explorer.checkbox ? 1 : 0;  // 0 if no checkboxes
		}, 
		
		initTable: function (tableNode, tableTree) {
			this.tableTree = tableTree;
			dojo.empty(tableNode);
			dojo.addClass(tableNode, 'treetable');
			this.renderTableHeader(tableNode);

		},
		getActionsColumn: function(item, tableRow, renderType, columnClass){
			renderType = renderType || "tool";
			var commandService = this.explorer.registry.getService("orion.page.command");
			var actionsColumn = document.createElement('td');
			actionsColumn.id = tableRow.id + "actionswrapper";
			if (columnClass) {
				dojo.addClass(actionsColumn, columnClass);
			}
			// contact the command service to render appropriate commands here.
			if (this.actionScopeId) {
				commandService.renderCommands(this.actionScopeId, actionsColumn, item, this.explorer, renderType);
			} else {
				window.console.log("Warning, no action scope was specified.  No commands rendered.");
			}
			return actionsColumn;
		},
		initCheckboxColumn: function(tableNode){
			if (this._useCheckboxSelection) {
				var th = document.createElement('th');
				return th;
			}
		},
		getCheckboxColumn: function(item, tableRow){
			if (this._useCheckboxSelection) {
				var checkColumn = document.createElement('td');
				var check = document.createElement("span");
				check.id = this.getCheckBoxId(tableRow.id);
				dojo.addClass(check, "core-sprite-check selectionCheckmarkSprite");
				check.itemId = tableRow.id;
				if(this.getCheckedFunc){
					check.checked = this.getCheckedFunc(item);
					if(this._highlightSelection){
						dojo.toggleClass(tableRow, "checkedRow", check.checked);
					}
					dojo.toggleClass(check, "core-sprite-check_on", check.checked);
				}
				checkColumn.appendChild(check);
				dojo.connect(check, "onclick", dojo.hitch(this, function(evt) {
					var newValue = evt.target.checked ? false : true;
					this.onCheck(tableRow, evt.target, newValue, true);
				}));
				return checkColumn;
			}
		},
		
		getCheckBoxId: function(rowId){
			return rowId + "selectedState";
		},
			
		onCheck: function(tableRow, checkBox, checked, manually){
			checkBox.checked = checked;
			if(this._highlightSelection && tableRow){
				dojo.toggleClass(tableRow, "checkedRow", checked);
			}
			dojo.toggleClass(checkBox, "core-sprite-check_on", checked);
			if(this.onCheckedFunc){
				this.onCheckedFunc(checkBox.itemId, checked, manually);
			}
			this._storeSelections();
			if (this.explorer.selection) {
				this.explorer.selection.setSelections(this.getSelected());		
			}
		},
		
		_storeSelections: function() {
			var selectionIDs = this.getSelectedIds();
			var prefPath = this._getUIStatePreferencePath();
			if (prefPath && window.sessionStorage) {
				window.sessionStorage[prefPath+"selection"] = JSON.stringify(selectionIDs);
			}
		},
		
		_restoreSelections: function(prefPath) {
			var selections = window.sessionStorage[prefPath+"selection"];
			if (typeof selections === "string") {
				if (selections.length > 0) {
					selections = JSON.parse(selections);
				} else {
					selections = null;
				}
			}
			var i;
			if (selections) {
				for (i=0; i<selections.length; i++) {
					var tableRow = dojo.byId(selections[i]);
					if (tableRow) {
						if(this._highlightSelection){
							dojo.addClass(tableRow, "checkedRow");
						}
						var check = dojo.byId(this.getCheckBoxId(tableRow.id));
						if (check) {
							check.checked = true;
							dojo.addClass(check, "core-sprite-check_on");
						}
					}
				}
			}	
			// notify the selection service of our new selections
			var selectedItems = this.getSelected();
			if(this.explorer.selection) {
				this.explorer.selection.setSelections(selectedItems);
			}
		},
		
		_storeExpansions: function(prefPath) {
			window.sessionStorage[prefPath+"expanded"] = JSON.stringify(this._expanded);
		},
		
		// returns true if the selections also need to be restored.
		_restoreExpansions: function(prefPath) {
			var didRestoreSelections = false;
			var expanded = window.sessionStorage[prefPath+"expanded"];
			if (typeof expanded=== "string") {
				if (expanded.length > 0) {
					expanded= JSON.parse(expanded);
				} else {
					expanded = null;
				}
			}
			var i;
			if (expanded) {
				for (i=0; i<expanded.length; i++) {
					var row= dojo.byId(expanded[i]);
					if (row) {
						this._expanded.push(expanded[i]);
						// restore selections after expansion in case an expanded item was selected.
						this.tableTree.expand(expanded[i], dojo.hitch(this, function() {
							this._restoreSelections(prefPath);
						}));
						didRestoreSelections = true;
					}
				}
			}
			return !didRestoreSelections;
		},
		
		_getUIStatePreferencePath: function() {
			if (this.explorer) {
				var rootPath = this.explorer.getRootPath();
				if (this._cachePrefix && rootPath) {
					var rootSegmentId = rootPath.replace(/[^\.\:\-\_0-9A-Za-z]/g, "");
					return "/" + this._cachePrefix + "/" + rootSegmentId + "/uiState";
				}
			}
			return null;
						
		},
		
		expandCollapseImageId: function(rowId) {
			return rowId+"__expand";
		},
		
		updateExpandVisuals: function(tableRow, isExpanded) {
			var expandImage = dojo.byId(this.expandCollapseImageId(tableRow.id));
			if (expandImage) {
				dojo.addClass(expandImage, isExpanded ? this._expandImageClass : this._collapseImageClass);
				dojo.removeClass(expandImage, isExpanded ? this._collapseImageClass : this._expandImageClass);
			}
		},

		expand: function(id, postfunc) {
			this.tableTree.expand(id,postfunc);
        },
		
		getExpandImage: function(tableRow, placeHolder, /* optional extra decoration */ decorateImageClass, /* optional sprite class for extra decoration */ spriteClass){
			var expandImage = dojo.create("span", {id: this.expandCollapseImageId(tableRow.id)}, placeHolder, "last");
			dojo.addClass(expandImage, this._twistieSpriteClass);
			dojo.addClass(expandImage, this._collapseImageClass);
			if (decorateImageClass) {
				var decorateImage = dojo.create("span", null, placeHolder, "last");
				dojo.addClass(decorateImage, spriteClass || "imageSprite");
				dojo.addClass(decorateImage, decorateImageClass);
			}

			expandImage.onclick = dojo.hitch(this, function(evt) {
				if (evt.isTrigger === undefined) return false;
				this.tableTree.toggle(tableRow.id, this.expandCollapseImageId(tableRow.id), this._expandImageClass, this._collapseImageClass);
				var expanded = this.tableTree.isExpanded(tableRow.id);
				if (expanded) {
					this._expanded.push(tableRow.id);
				} else {
					for (var i in this._expanded) {
						if (this._expanded[i] === tableRow.id) {
							this._expanded.splice(i, 1);
							break;
						}
					}
				}
				var prefPath = this._getUIStatePreferencePath();
				if (prefPath && window.sessionStorage) {
					this._storeExpansions(prefPath);
				}
			});
			return expandImage;
		},
		render: function(item, tableRow){
			tableRow.cellSpacing = "8px";
			this.renderRow(item, tableRow);
		},
		
		getSelected: function() {
			var selected = [];
			dojo.query(".core-sprite-check_on").forEach(dojo.hitch(this, function(node) {
				var row = node.parentNode.parentNode;
				selected.push(this.tableTree.getItem(row));
			}));
			return selected;
		},
		
		getSelectedIds: function() {
			var selected = [];
			dojo.query(".core-sprite-check_on").forEach(dojo.hitch(this, function(node) {
				var row = node.parentNode.parentNode;
				selected.push(row.id);
			}));
			return selected;
		},
		
		rowsChanged: function() {
			if (this._decorateAlternatingLines) {
				var highlightingId = this.explorer._highlightingId;
				dojo.query(".treeTableRow").forEach(function(node, i) {
					if (node.id === highlightingId) {
			            $(node).addClass("highlightrow");
    					$(node).removeClass("lightTreeTableRow");
    					$(node).removeClass("darkTreeTableRow");
    					if (node.childNodes) {
//				$(node.childNodes[1]).removeClass("secondaryColumnDark");
							$(node.childNodes[1]).addClass("secondaryColumnDark");
						}
			        } else {
					if (!dojo.hasClass(node,"highlightrow")) {
						if (i % 2) {
							dojo.addClass(node, "darkTreeTableRow");
							dojo.removeClass(node, "lightTreeTableRow");
						} else {
							dojo.addClass(node, "lightTreeTableRow");
							dojo.removeClass(node, "darkTreeTableRow");
						}
					}
					}
				});
			}
			// notify the selection service of the change in state.
			if(this.explorer.selection) {
				this.explorer.selection.setSelections(this.getSelected());
			}
		},
		updateCommands: function(){
			var registry = this.explorer.registry;
			dojo.query(".treeTableRow").forEach(function(node, i) {
				
				var actionsWrapperId = node.id + "actionswrapper";
				var actionsWrapper = dojo.byId(actionsWrapperId);
				
				dojo.empty(actionsWrapper);
				// contact the command service to render appropriate commands here.
				registry.getService("orion.page.command").renderCommands(this.actionScopeId, actionsWrapper, node._item, this.explorer, "tool");
			});
		},
		
		_init: function(options) {
			if (options) {
				this._useCheckboxSelection = options.checkbox === undefined ? false : options.checkbox;
				this._colums = options.colums || [];
				this._cachePrefix = options.cachePrefix;
				this.getCheckedFunc = options.getCheckedFunc;
				this.onCheckedFunc = options.onCheckedFunc;
				this._highlightSelection = true;
				if (options.highlightSelection === false){
					this._highlightSelection = false;
				}
				this._decorateAlternatingLines = true;
				if (options.decorateAlternatingLines === false) {
					this._decorateAlternatingLines = false;
				}
				if (!this.actionScopeId) {
					this.actionScopeId = options.actionScopeId;
				}
			}
		},
		
		_initializeUIState: function() {
			this._expanded = [];
			var prefsPath = this._getUIStatePreferencePath();
			if (prefsPath && window.sessionStorage) {
				if (this._restoreExpansions(prefsPath)) {
					this._restoreSelections(prefsPath);
				}
			}
		}
	};
	return ExplorerRenderer;
}());

/**
 * @name orion.explorer.SelectionRenderer
 * @class Sample renderer that allows you to render a standard tree table.
 * Override {@link orion.explorer.SelectionRenderer#getCellHeaderElement}  and
 * {@link orion.explorer.SelectionRenderer#getCellElement} to generate table content.
 */
exports.SelectionRenderer = (function(){
	function SelectionRenderer(options, explorer) {
		this._init(options);
		this.explorer = explorer;
	}
	SelectionRenderer.prototype = new exports.ExplorerRenderer();
	
	SelectionRenderer.prototype.renderTableHeader = function(tableNode){
		var thead = document.createElement('thead');
		var row = document.createElement('tr');
		dojo.addClass(thead, "navTableHeading");
		var th, actions, size;
		if (this._useCheckboxSelection) {
			row.appendChild(this.initCheckboxColumn(tableNode));
		}
		
/*
		var i = 0;
		var cell = this.getCellHeaderElement(i);
		while(cell){
			if (cell.innerHTML.length > 0) {
				dojo.addClass(cell, "navColumn");
			}
			row.appendChild(cell);			
			cell = this.getCellHeaderElement(++i);
		}
*/
		thead.appendChild(row);
		tableNode.appendChild(thead);
	};
	
	SelectionRenderer.prototype.renderRow = function(item, tableRow) {
		dojo.style(tableRow, "verticalAlign", "baseline");
		dojo.addClass(tableRow, "treeTableRow");

		var checkColumn = this.getCheckboxColumn(item, tableRow);
		if(checkColumn) {
			dojo.addClass(checkColumn, 'checkColumn');
			tableRow.appendChild(checkColumn);
		}

		var i = 0;
		var cell = this.getCellElement(i, item, tableRow);
		while(cell){
			tableRow.appendChild(cell);
			if (i!==1) {
				dojo.addClass(cell, 'secondaryColumn');
			}
			cell = this.getCellElement(++i, item, tableRow);
		}
		
	};
	
	/**
	 * Override to return a dom element containing table header, preferably <code>th</code>
	 * @param col_no number of column
	 */
	SelectionRenderer.prototype.getCellHeaderElement = function(col_no){};

	/**
	 * Override to return a dom element containing table cell, preferable <code>td</td>
	 * @param col_no number of column
	 * @param item item to be rendered
	 * @param tableRow the current table row
	 */
	SelectionRenderer.prototype.getCellElement = function(col_no, item, tableRow){};
	
	return SelectionRenderer;
}());
return exports;
});

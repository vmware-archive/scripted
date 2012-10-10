/*******************************************************************************
 * @license
 * Copyright (c) 2010 - 2012 IBM Corporation, VMware and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *  IBM Corporation - initial API and implementation
 *     Andy Clement - hacked to support our needs in scripted (needs more work)
 ******************************************************************************/

/*jslint forin:true devel:true*/
/*global define dojo document*/

define(['dojo'], function(dojo) {

	/**
	 * Constructs a new TableTree with the given options.
	 * 
	 * @param options 
	 * @name orion.treetable.TableTree 
	 * @class Generates an HTML table where one of the columns is indented according to depth of children.
	 * <p>Clients must supply a model that generates children items, and a renderer can be supplied which
	 * generates the HTML table row for each child. Custom rendering allows clients to use checkboxes,
	 * images, links, etc. to describe each  element in the tree.  Renderers handle all clicks and other
	 * behavior via their supplied row content.</p>
	 * 
	 * <p>The table tree parent can be specified by id or DOM node.</p>
	 * 
	 * <p>The tree provides API for the client to programmatically expand and collapse
	 * nodes, based on the client renderer's definition of how that is done (click on icon, etc.).
	 * The tree will manage the hiding and showing of child DOM elements and proper indent</p>
	 * 
	 * The model must implement:
	 * <ul>
	 *   <li>getRoot(onItem)</li>
	 *   <li>getChildren(parentItem, onComplete)</li>
	 *   <li>getId(item)  // must be a valid DOM id</li>
	 * </ul>
	 * 
	 * Renderers must implement:
	 * <ul>
	 *   <li>initTable(tableNode) // set up table attributes and a header if desired</li>
	 *   <li>render(item, tr) // generate tds for the row</li>
	 *   <li>labelColumnIndex() // 0 based index of which td contains the primary label which will be indented</li>
	 *   <li>rowsChanged // optional, perform any work (such as styling) that should happen after the row content changes</li>
	 * </ul>
	 */
	function TableTree (options) {
		this._init(options);
	}
	TableTree.prototype = /** @lends orion.treetable.TableTree.prototype */ {
		_init: function(options) {
			var parent = options.parent;
			var tree = this;
			if (typeof(parent) === "string") {
				parent = dojo.byId(parent);
			}
			if (!parent) { throw "no parent"; }
			if (!options.model) { throw "no tree model"; }
			if (!options.renderer) { throw "no renderer"; }
			this._parent = parent;
			this._treeModel = options.model;
			this._renderer = options.renderer;
			this._showRoot = options.showRoot === undefined ? false : options.showRoot;
			this._indent = options.indent === undefined ? 16 : options.indent;
			this._onCollapse = options.onCollapse;
			this._labelColumnIndex = options.labelColumnIndex === undefined ? 0 : options.labelColumnIndex;
			this._id = options.id === undefined ? "treetable" : options.id;
			this._tableStyle = options.tableStyle;
			
			// Generate the table
			this._root = this._treeModel.getRoot(function (root) {
				if (this._showRoot) {
					root._depth = 0;
					this._generate([root], 0);
				}
				else {
					tree._treeModel.getChildren(root, function(children) {
						tree._generate(children, 0);
					});
				}
			});
		},
		
		_generate: function(children, indentLevel) {
			dojo.empty(this._parent);
			var table = document.createElement('table');
			table.id = this._id;
			if (this._tableStyle) {
				dojo.addClass(table, this._tableStyle);
			}
			this._renderer.initTable(table, this);
			var tbody = document.createElement('tbody');
			tbody.id = this._id+"tbody";
			this._generateChildren(children, indentLevel, tbody, "last");
			// add 50 random children to go off the bottom of the page
//			for (var c =0;c<50;c++) {
//				var row = document.createElement('tr');
//				row.id=0;
//				row._depth=0;
//				var child={name:"",parentDir:"",size:0,directory:false,Location:""};
//				row._item = child;
//				this._renderer.render(child,row);
//				dojo.style(row.childNodes[this._labelColumnIndex], "paddingLeft", "0px");
//				dojo.place(row, tbody, "last");
//			}
			table.appendChild(tbody);
			this._parent.appendChild(table);
			this._rowsChanged();
		},
		
		_generateChildren: function(children, indentLevel, referenceNode, position) {
			for (var i in children) {
				var row = document.createElement('tr');
				row.id = this._treeModel.getId(children[i]);
				row._depth = indentLevel;
				// This is a perf problem and potential leak because we're bashing a dom node with
				// a javascript object.  (Whereas above we are using simple numbers/strings). 
				// We should consider an item map.
				row._item = children[i];
				this._renderer.render(children[i], row);
				// generate an indent
				var indent = this._indent * indentLevel;
				dojo.style(row.childNodes[this._labelColumnIndex], "paddingLeft", indent +"px");
				dojo.place(row, referenceNode, position);
				if (position === "after") {
					referenceNode = row;
				}
			}
		},
		
		_rowsChanged: function() {
			// notify the renderer if it has implemented the function
			if (this._renderer.rowsChanged) {
				this._renderer.rowsChanged();
			}
		},
		
		getSelected: function() {
			return this._renderer.getSelected();
		},
		
		refresh: function(item, children, /* optional */ forceExpand, /* optional */ imageId, /*optional */ classToAdd, /*optional */ classToRemove) {
			var parentId = this._treeModel.getId(item);
			var tree;
			if (parentId === this._id) {  // root of tree
				this._removeChildRows(parentId);
				this._generateChildren(children, 0, dojo.byId(parentId+"tbody"), "last");
				this._rowsChanged();
			} else {  // node in the tree
				var row = dojo.byId(parentId);
				if (row) {
					// if it is showing children, refresh what is showing
					row._item = item;
					// If the row should be expanded
					if (row && (forceExpand || row._expanded)) {
						row._expanded = true;
						this._removeChildRows(parentId);
						this._renderer.updateExpandVisuals(row, true);
						if(children){
							this._generateChildren(children, row._depth+1, row, "after");
							this._rowsChanged();
							// TODO this should go away
							// see https://bugs.eclipse.org/bugs/show_bug.cgi?id=371543
							if (imageId && classToAdd) {
								var node = dojo.byId(imageId);
								dojo.addClass(node, classToAdd);
								if (classToRemove) {
									dojo.removeClass(node, classToRemove);
								}
							}
						} else {
							tree = this;
							children = this._treeModel.getChildren(row._item, function(children) {
								tree._generateChildren(children, row._depth+1, row, "after");
								tree._rowsChanged();
							});
						}
					} else {
						this._renderer.updateExpandVisuals(row, false);
					}
				} else {
					// the item wasn't found.  We could refresh the root here, but for now
					// let's log it to figure out why.
					console.log("could not find table row " + parentId);
				}
			}
		},
		
		refreshAndExpand: function(item, children, imageId, classToAdd, classToRemove) {
			this.refresh(item, children, true, imageId, classToAdd, classToRemove);
		},
		
		getItem: function(itemOrId) {  // a dom node, a dom id, or the item
			if (typeof(itemOrId) === "string") {  //dom id
				var node = dojo.byId(itemOrId);
				if (node) {
					return node._item;
				}
			}
			if (itemOrId._item) {  // is it a dom node that knows its item?
				return itemOrId._item;
			}
			return itemOrId;  // return what we were given
		},
		
		toggle: function(id, imageId, expandClass, collapseClass) {
			var row = dojo.byId(id);
			if (row) {
				var node;
				if (row._expanded) {
					this.collapse(id);
					if (imageId) {
						node = dojo.byId(imageId);
						dojo.addClass(node, collapseClass);
						dojo.removeClass(node, expandClass);
					}
				}
				else {
					this.expand(id);
					if (imageId) {
						node = dojo.byId(imageId);
						dojo.addClass(node, expandClass);
						dojo.removeClass(node, collapseClass);
					}
				}
			}
		},
		
		isExpanded: function(id) {
			var row = dojo.byId(id);
			if (row) {
				return row._expanded;
			}
			return false;
		},
		
		expand: function(itemOrId , postExpandFunc , args) {
			var id = typeof(itemOrId) === "string" ? itemOrId : this._treeModel.getId(itemOrId);
			var row = dojo.byId(id);
			if (row) {
				if (row._expanded) {
					// TODO this has the wrong name!  if it is being called if expansion isn't happening!
					if (postExpandFunc) {
						postExpandFunc.apply(this, args);
					}
					return;
				}
				row._expanded = true;
				var tree = this;
				this._renderer.updateExpandVisuals(row, true);
				var children = this._treeModel.getChildren(row._item, function(children) {
					tree._generateChildren(children, row._depth+1, row, "after");
					tree._rowsChanged();
					if (postExpandFunc) {
						postExpandFunc.apply(this, args);
					}
				});
			}
		}, 
		
		_removeChildRows: function(parentId) {
			var table = dojo.byId(this._id);
			// true if we are removing directly from table
			var foundParent = parentId === this._id;
			var stop = false;
			var parentDepth = -1;
			var toRemove = [];
			dojo.query(".treeTableRow").forEach(function(row, i) {
				if (stop) {
					return;
				}
				if (foundParent) {
					if (row._depth > parentDepth) {
						toRemove.push(row);
					}
					else {
						stop = true;  // we reached a sibling to our parent
					}
				} else {
					if (row.id === parentId) {
						foundParent = true;
						parentDepth = row._depth;
					}
				}
			});
			for (var i in toRemove) {
				//table.removeChild(toRemove[i]); // IE barfs on this
				var child = toRemove[i];
				child.parentNode.removeChild(child);
			}
		},
		
		collapse: function(itemOrId) {
			var id = typeof(itemOrId) === "string" ? itemOrId : this._treeModel.getId(itemOrId);
			var row = dojo.byId(id);
			if (row) {
				if (!row._expanded) {
					return;
				}
				row._expanded = false;
				this._renderer.updateExpandVisuals(row, false);
				this._removeChildRows(id);
				this._rowsChanged();
			}
			if(this._onCollapse){
				this._onCollapse(row._item);
			}
		}
	};  // end prototype
	TableTree.prototype.constructor = TableTree;
	//return module exports
	return {TableTree: TableTree};
});

define("dijit/tree/_dndSelector", ["dojo", "dijit", "dojo/dnd/common", "dijit/tree/_dndContainer"], function(dojo, dijit) {

dojo.declare("dijit.tree._dndSelector",
	dijit.tree._dndContainer,
	{
		// summary:
		//		This is a base class for `dijit.tree.dndSource` , and isn't meant to be used directly.
		//		It's based on `dojo.dnd.Selector`.
		// tags:
		//		protected

		/*=====
		// selection: Hash<String, DomNode>
		//		(id, DomNode) map for every TreeNode that's currently selected.
		//		The DOMNode is the TreeNode.rowNode.
		selection: {},
		=====*/

		constructor: function(tree, params){
			// summary:
			//		Initialization
			// tags:
			//		private

			this.selection={};
			this.anchor = null;

			dijit.setWaiState(this.tree.domNode, "multiselect", !this.singular);

			this.events.push(
				dojo.connect(this.tree.domNode, "onmousedown", this,"onMouseDown"),
				dojo.connect(this.tree.domNode, "onmouseup", this,"onMouseUp"),
				dojo.connect(this.tree.domNode, "onmousemove", this,"onMouseMove")
			);
		},

		//	singular: Boolean
		//		Allows selection of only one element, if true.
		//		Tree hasn't been tested in singular=true mode, unclear if it works.
		singular: false,

		// methods
		getSelectedTreeNodes: function(){
			// summary:
			//		Returns a list of selected node(s).
			//		Used by dndSource on the start of a drag.
			// tags:
			//		protected
			var nodes=[], sel = this.selection;
			for(var i in sel){
				nodes.push(sel[i]);
			}
			return nodes;
		},

		selectNone: function(){
			// summary:
			//		Unselects all items
			// tags:
			//		private

			this.setSelection([]);
			return this;	// self
		},

		destroy: function(){
			// summary:
			//		Prepares the object to be garbage-collected
			this.inherited(arguments);
			this.selection = this.anchor = null;
		},
		addTreeNode: function(/*dijit._TreeNode*/node, /*Boolean?*/isAnchor){
			// summary
			//		add node to current selection
			// node: Node
			//		node to add
			// isAnchor: Boolean
			//		Whether the node should become anchor.

			this.setSelection(this.getSelectedTreeNodes().concat( [node] ));
			if(isAnchor){ this.anchor = node; }
			return node;
		},
		removeTreeNode: function(/*dijit._TreeNode*/node){
			// summary
			//		remove node from current selection
			// node: Node
			//		node to remove
			this.setSelection(this._setDifference(this.getSelectedTreeNodes(), [node]))
			return node;
		},
		isTreeNodeSelected: function(/*dijit._TreeNode*/node){
			// summary
			//		return true if node is currently selected
			// node: Node
			//		the node to check whether it's in the current selection

			return node.id && !!this.selection[node.id];
		},
		setSelection: function(/*dijit._treeNode[]*/ newSelection){
			// summary
			//      set the list of selected nodes to be exactly newSelection. All changes to the
			//      selection should be passed through this function, which ensures that derived
			//      attributes are kept up to date. Anchor will be deleted if it has been removed
			//      from the selection, but no new anchor will be added by this function.
			// newSelection: Node[]
			//      list of tree nodes to make selected
			var oldSelection = this.getSelectedTreeNodes();
			dojo.forEach(this._setDifference(oldSelection, newSelection), dojo.hitch(this, function(node){
				node.setSelected(false);
				if(this.anchor == node){
					delete this.anchor;
				}
				delete this.selection[node.id];
			}));
			dojo.forEach(this._setDifference(newSelection, oldSelection), dojo.hitch(this, function(node){
				node.setSelected(true);
				this.selection[node.id] = node;
			}));
			this._updateSelectionProperties();
		},
		_setDifference: function(xs,ys){
			// summary
			//      Returns a copy of xs which lacks any objects
			//      occurring in ys. Checks for membership by
			//      modifying and then reading the object, so it will
			//      not properly handle sets of numbers or strings.
			
			dojo.forEach(ys, function(y){ y.__exclude__ = true; });
			var ret = dojo.filter(xs, function(x){ return !x.__exclude__; });

			// clean up after ourselves.
			dojo.forEach(ys, function(y){ delete y['__exclude__'] });
			return ret;
		},
		_updateSelectionProperties: function() {
			// summary
			//      Update the following tree properties from the current selection:
			//      path[s], selectedItem[s], selectedNode[s]
			
			var selected = this.getSelectedTreeNodes();
			var paths = [], nodes = [];
			dojo.forEach(selected, function(node) {
				nodes.push(node);
				paths.push(node.getTreePath());
			});
			var items = dojo.map(nodes,function(node) { return node.item; });
			this.tree._set("paths", paths);
			this.tree._set("path", paths[0] || []);
			this.tree._set("selectedNodes", nodes);
			this.tree._set("selectedNode", nodes[0] || null);
			this.tree._set("selectedItems", items);
			this.tree._set("selectedItem", items[0] || null);
		},
		// mouse events
		onMouseDown: function(e){
			// summary:
			//		Event processor for onmousedown
			// e: Event
			//		mouse event
			// tags:
			//		protected

			// ignore click on expando node
			if(!this.current || this.tree.isExpandoNode( e.target, this.current)){ return; }

			if(e.button == dojo.mouseButtons.RIGHT){ return; }	// ignore right-click

			dojo.stopEvent(e);

			var treeNode = this.current,
			  copy = dojo.isCopyKey(e), id = treeNode.id;

			// if shift key is not pressed, and the node is already in the selection,
			// delay deselection until onmouseup so in the case of DND, deselection
			// will be canceled by onmousemove.
			if(!this.singular && !e.shiftKey && this.selection[id]){
				this._doDeselect = true;
				return;
			}else{
				this._doDeselect = false;
			}
			this.userSelect(treeNode, copy, e.shiftKey);
		},

		onMouseUp: function(e){
			// summary:
			//		Event processor for onmouseup
			// e: Event
			//		mouse event
			// tags:
			//		protected

			// _doDeselect is the flag to indicate that the user wants to either ctrl+click on
			// a already selected item (to deselect the item), or click on a not-yet selected item
			// (which should remove all current selection, and add the clicked item). This can not
			// be done in onMouseDown, because the user may start a drag after mousedown. By moving
			// the deselection logic here, the user can drags an already selected item.
			if(!this._doDeselect){ return; }
			this._doDeselect = false;
			this.userSelect(this.current, dojo.isCopyKey( e ), e.shiftKey);
		},
		onMouseMove: function(e){
			// summary
			//		event processor for onmousemove
			// e: Event
			//		mouse event
			this._doDeselect = false;
		},

		userSelect: function(node, multi, range){
			// summary:
			//		Add or remove the given node from selection, responding
			//      to a user action such as a click or keypress.
			// multi: Boolean
			//		Indicates whether this is meant to be a multi-select action (e.g. ctrl-click)
			// range: Boolean
			//		Indicates whether this is meant to be a ranged action (e.g. shift-click)
			// tags:
			//		protected

			if(this.singular){
				if(this.anchor == node && multi){
					this.selectNone();
				}else{
					this.setSelection([node]);
					this.anchor = node;
				}
			}else{
				if(range && this.anchor){
					var cr = dijit.tree._compareNodes(this.anchor.rowNode, node.rowNode),
					begin, end, anchor = this.anchor;
					
					if(cr < 0){ //current is after anchor
						begin = anchor;
						end = node;
					}else{ //current is before anchor
						begin = node;
						end = anchor;
					}
					nodes = [];
					//add everything betweeen begin and end inclusively
					while(begin != end) {
						nodes.push(begin)
						begin = this.tree._getNextNode(begin);
					}
					nodes.push(end)

					this.setSelection(nodes);
				}else{
				    if( this.selection[ node.id ] && multi ) {
						this.removeTreeNode( node );
				    } else if(multi) {
						this.addTreeNode(node, true);
					} else {
						this.setSelection([node]);
						this.anchor = node;
				    }
				}
			}
		},

		forInSelectedItems: function(/*Function*/ f, /*Object?*/ o){
			// summary:
			//		Iterates over selected items;
			//		see `dojo.dnd.Container.forInItems()` for details
			o = o || dojo.global;
			for(var id in this.selection){
				// console.log("selected item id: " + id);
				f.call(o, this.getItem(id), id, this);
			}
		}
});


return dijit.tree._dndSelector;
});

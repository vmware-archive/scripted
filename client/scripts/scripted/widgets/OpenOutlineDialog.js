/*******************************************************************************
 * @license
 * Copyright (c) 2010 - 2012 VMware, IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * This outline dialog is based on the open resource dialog code
 * that came from originally from Orion.
 *
 * Contributors:
 *        Andy Clement - initial API and implementation
 *******************************************************************************/
/*jslint browser:true*/
/*global define orion window dojo dijit*/

define(['require', 'dojo', 'dijit', 'plugins/outline/esprimaOutlinerPlugin','dijit/Dialog', 'dijit/form/TextBox', 
		'scripted/widgets/_OrionDialogMixin', 'text!scripted/widgets/templates/OpenOutlineDialog.html'], 
		function(require, dojo, dijit, mOutliner) {

/**
 * Usage: <code>new widgets.OpenOutlineDialog(options).show();</code>
 * 
 * @name scripted.widgets.OpenOutlineDialog
 * @class A dialog that shows the outline (functions) of a file and the list of functions can be filtered using a simple textbox.
 */
var OpenOutlineDialog = dojo.declare("scripted.widgets.OpenOutlineDialog", [dijit.Dialog, scripted.widgets._OrionDialogMixin],
		/** @lends scripted.widgets.OpenOutlineDialog.prototype */ {
	widgetsInTemplate : true,
	templateString : dojo.cache('scripted', 'widgets/templates/OpenOutlineDialog.html'),
	
	options: null,
	
	/** @private */
	constructor : function() {
		this.inherited(arguments);
		this.options = arguments[0];
	},
	
	/** @private */
	postMixInProperties : function() {
		this.options.title = "Outline";
		this.searchPlaceHolder = "";
		this.inherited(arguments);
	},
	
	/** @private */
	postCreate: function() {
		this.inherited(arguments);
		
		/* When the text box changes we want to update the results list */
		dojo.connect(this.resourceName, "onChange", this, function(evt) {
			this.render();
		});
		
		/* If 'enter' is pressed, jump the editor to the line where that function is declared */
		dojo.connect(this.resourceName, "onKeyPress", this, (function(that) {
			return function(evt) {
				if (evt.keyCode === dojo.keys.ENTER && that.results) {
					var links = dojo.query("tr", that.results);
					var selected = that.selected;
				    var line = links[(selected===-1)?0:selected].gotoline;
				    if (line) {
						that.editor.onGotoLine(line-1,0);
					}
					that.hide();
					dojo.stopEvent(evt);
				}
			};
			}(this)));
		
		
		/* Allow up/down keyboard navigation */
		dojo.connect(this,"onKeyPress",this,function(evt) {
			var links, nextSelected;	
			if (!evt.shiftKey && (evt.keyCode === dojo.keys.DOWN_ARROW || evt.keyCode === dojo.keys.UP_ARROW)) {
				links = dojo.query("tr", this.results);
				if (evt.keyCode === dojo.keys.DOWN_ARROW) {
					if (this.selected>=0) {
						nextSelected = this.selected===(links.length-1)?0:this.selected+1;
						dojo.removeClass(links[this.selected],'outlineSelectedRow');
						dojo.addClass(links[nextSelected],'outlineSelectedRow');
						this.selected = nextSelected;
					} else if (links.length>0) {
						this.selected = 0;
						dojo.addClass(links[0],'outlineSelectedRow');
					}
				} else {
					if (this.selected>0) {
						nextSelected = this.selected-1;
						dojo.removeClass(links[this.selected],'outlineSelectedRow');
						dojo.addClass(links[nextSelected],'outlineSelectedRow');
						this.selected = nextSelected;
					} else if (this.selected===0) {
						nextSelected = links.length-1;
						dojo.removeClass(links[this.selected],'outlineSelectedRow');
						dojo.addClass(links[nextSelected],'outlineSelectedRow');
						this.selected = nextSelected;
					}
				}
				dojo.stopEvent(evt);
			}
		});
		
		dojo.connect(this, "onMouseUp", function(e) {
			// WebKit focuses <body> after link is clicked; override that
			e.target.focus();
		});
		this.outline = mOutliner.getOutline(this.editor.getText());
		this.renderOutline();
	},
	
	/**
	 * This helper function for rendering looks at the 'data' array and for elements whose
	 * label match the 'queryString' it will add a row to the 'table'.  The indent gives
	 * us an idea of nesting so the text labels can be prefixed with an appropriate
	 * number of spaces.
	 *
	 * @param {String} table The table dom element
	 * @param {[]} data an input array of data
	 * @param {String} queryString the filter text being used to select entries from data
	 * @param {Number} indent the nesting level
	 */
	renderOutlineHelper: function (table, data, queryString, indent) {
		for (var i=0;i<data.length;i++) {
			var entry = data[i];
			if (queryString.length===0 || this.matches(entry.label,queryString)) {
				var row = table.insertRow(-1);
				dojo.style(row,"width","100%");
				var col = row.insertCell(0);
				dojo.style(col,"width","100%");
				var prefix = "";
				for (var ii=0;ii<indent;ii++) {
					prefix = prefix+"\xa0\xa0";
				}
				var textnode = document.createTextNode(prefix+entry.label);
				col.appendChild(textnode);
				row.gotoline = entry.line;
				dojo.connect(row, 'onclick', (function(that) {
					return function(evt){
						var line = evt.currentTarget.gotoline;
						if (line) {
							that.editor.onGotoLine(line,0);
							that.hide();
						}
					};
				}(this)));
			}
			if (entry.children && entry.children.length!==0) {
				this.renderOutlineHelper(table, entry.children, queryString, indent+1);
			}
		}
	},
	
	/**
	 * Render this.outline (a set of function references) into the dom.
	 * The regex can be used to subset the entries from this.outline.
	 * this.outline is an array of objects with a label and a line
	 */
	renderOutline: function(regex) {
		var queryString = regex;
		if (!regex) {
			queryString = "";
		}
		queryString = queryString.toLowerCase();
		this.selected = -1;
		var resultsNode = this.results;
		dojo.empty(resultsNode);
		if (this.outline && this.outline.length>0) {
			var table = document.createElement('table');
			dojo.style(table,"width","100%");
			this.renderOutlineHelper(table,this.outline,queryString,0);
			dojo.place(table, resultsNode, "last");
			// Select the first row
			var links = dojo.query("tr", this.results);
			dojo.addClass(links[0],'outlineSelectedRow');
			this.selected = 0;
		}
	},
	
	/**
	 * Check if string 'label' contains all the characters (in the right order
	 * but not necessarily adjacent) from charseq.
	 * 
	 * @param {String} label the text to check
	 * @param {String} charseq the sequence of chars to check for
	 * @type {Boolean} true if matches
	 */
	matches: function(label, charseq) {
		label = label.toLowerCase();
		var cpos = 0;
		for (var i=0;i<label.length;i++) {
			if (label.charAt(i)===charseq[cpos]) {
				cpos++;
			}
			if (cpos===charseq.length) {
				return true;
			}
		}
		return false;
	},
	
	/** @private */
	render: function() {
		var text = this.resourceName && this.resourceName.get("value");
		if (text) {
			this.renderOutline(text);
		} else {
			this.renderOutline();
		}
	},
	
	/**
	 * Displays the dialog.
	 */
	show: function() {
		this.inherited(arguments);
		this.resourceName.focus();
	},
	
	/** @private */
	onHide: function() {
		this.inherited(arguments);
	}
	
});
return OpenOutlineDialog;
});

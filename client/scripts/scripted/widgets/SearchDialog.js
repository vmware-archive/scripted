/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Andy Clement (vmware) - bug 344614
 *******************************************************************************/
/*jslint browser:true*/
/*global define scripted orion window dojo dijit console*/

define(['require', 'dojo', 'dijit',
		'dijit/Dialog', 'dijit/form/TextBox', 
		'scripted/widgets/_OrionDialogMixin', 'text!scripted/widgets/templates/SearchDialog.html'], 
		function(require, dojo, dijit, mFileLoader) {

/**
 * Usage: <code>new widgets.SearchDialog(options).show();</code>
 * 
 * @name orion.widgets.SearchDialog
 */
var SearchDialog = dojo.declare("scripted.widgets.SearchDialog", [dijit.Dialog, scripted.widgets._OrionDialogMixin],
	/** @lends orion.widgets.SearchDialog.prototype */ {
	widgetsInTemplate : true,
	templateString : dojo.cache('scripted', 'widgets/templates/SearchDialog.html'),
	
	options: null,
	fileSearcher: null,
	fileSearchRenderer: null,
	
	/** @private */
	constructor : function() {
		this.inherited(arguments);
		this.options = arguments[0];
		this.fileSearcher = this.options && this.options.fileSearcher;
		this.fileSearchRenderer = this.options && this.options.fileSearchRenderer;
		this.searchPlaceHolder = "";
	},

	/** @private */
	navigateToResult: function (evt, result) {
		//TODO: modifier key awareness
		this.hide();
		this.openDeclaration("none", {
			path: result.path,
			range: [result.offset, result.offset+result.text.length]
		}, this.editor);
		dojo.stopEvent(evt); //if you don't do this, then the click event will propagate and
							//handling it will cause a page reload which is slow
							//and won't put the cursor/selection in the right place.
	},
	
	/** @private */
	decorateResult: function(resultDiv) {
		var widget = this;
		
		dojo.query("a", resultDiv).forEach(function(resourceLink) {
			dojo.connect(resourceLink, 'onclick', function(evt){
				widget.navigateToResult(evt, resultDiv.resultData);
			});
		});
	},
	
	/** @private */
	postMixInProperties : function() {
		this.options.title = "Search files";
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
					if (links && links.length > 0) {
						var selected = that.selected;
						var selectedRow = links[(selected===-1)?0:selected];
					    var target = selectedRow && selectedRow.resultData;
					    if (target) {
							that.navigateToResult(evt, target);
						}
					}
				}
			};
			}(this))
		);
		
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
//		this.outline = mOutliner.getOutline(this.editor.getText());
//		this.renderOutline();
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
	
	debug: function(msg) {
		//console.log(msg);
	},
	
	/** @private */
	render: function() {
		var text = this.resourceName && this.resourceName.get("value");

		//Searching for a single character is not very useful and it creates problems,
		//even with a 'suspendable' search, because the search cannot be suspended in the
		//midle of a file (yet). With a big file to search the single char search can
		//return a lot of results just in that one file... causing trouble.
		if (text && text.length>=2) {
			this.debug("SearchDialog: text changed '"+text+"'");
			var that = this;
			setTimeout(function() {
				var activeFileSearch = that.activeFileSearch;
				if (!activeFileSearch) {
					that.debug("SearchDialog: no active search, starting one");
					var renderer = that.fileSearchRenderer.makeIncrementalRenderer(that.results,false,
										null,dojo.hitch(that,that.decorateResult));
					that.activeFileSearch = that.fileSearcher.search(text,false,renderer);
				} else {
					that.debug("SearchDialog: search active, updating it");
					activeFileSearch.query(text);
				}
			},0);
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
		if (this.activeFileSearch) {
			this.activeFileSearch.close();
			delete this.activeFileSearch;
		}
		this.inherited(arguments);
	}
	
});
return SearchDialog;
});
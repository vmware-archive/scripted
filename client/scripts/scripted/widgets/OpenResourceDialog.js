/*******************************************************************************
 * @license
 * Copyright (c) 2010 - 2012 IBM Corporation, VMware and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *        Andy Clement - tailored for use in scripted
 *******************************************************************************/
/*jslint browser:true*/
/*global define orion window dojo dijit*/

define(['require', 'dojo', 'dijit', 'dijit/Dialog', 'dijit/form/TextBox', 
		'scripted/widgets/_OrionDialogMixin', 'text!scripted/widgets/templates/OpenResourceDialog.html'], 
		function(require, dojo, dijit) {
/**
 * Usage: <code>new widgets.OpenResourceDialog(options).show();</code>
 * 
 * @name scripted.widgets.OpenResourceDialog
 * @class A dialog that searches for files by name or wildcard.
 * @param {String} [options.title] Text to display in the dialog's titlebar.
 * @param {scripted.searchClient.Searcher} options.searcher The searcher to use for displaying results.
 */
var OpenResourceDialog = dojo.declare("scripted.widgets.OpenResourceDialog", [dijit.Dialog, scripted.widgets._OrionDialogMixin],
		/** @lends scripted.widgets.OpenResourceDialog.prototype */ {
	widgetsInTemplate : true,
	templateString : dojo.cache('scripted', 'widgets/templates/OpenResourceDialog.html'),
	
	SEARCH_DELAY: 500,
	timeoutId: null,
	time: null,
	options: null,
	searcher: null,
	searchRenderer: null,
	favService: null,
	
	/** @private */
	constructor : function() {
		this.inherited(arguments);
		this.timeoutId = null;
		this.time = 0;
		this.options = arguments[0];
		this.searcher = this.options && this.options.searcher;
		if (!this.searcher) {
			throw new Error("Missing required argument: searcher");
		}
		this.searchRenderer = this.options && this.options.searchRenderer;
		if (!this.searchRenderer || typeof(this.searchRenderer.makeRenderFunction) !== 'function') {
			throw new Error("Missing required argument: searchRenderer");
		}
	//	this.favService = this.options.favoriteService;
	//	if (!this.favService) {
	//		throw new Error("Missing required argument: favService");
	//	}
	},
	
	/** @private */
	postMixInProperties : function() {
		this.options.title = this.options.title || "Find File Named";
		this.selectFile = "Type the name of a file to open (? = any character, * = any string):";
		this.searchPlaceHolder = "Search";
		this.inherited(arguments);
	},
	
	/** @private */
	postCreate: function() {
		this.inherited(arguments);
		dojo.connect(this.resourceName, "onChange", this, function(evt) {
			this.time = +new Date();
			clearTimeout(this.timeoutId);
			this.timeoutId = setTimeout(dojo.hitch(this, this.checkSearch), 0);
		});
		dojo.connect(this.resourceName, "onKeyPress", this, function(evt) {
			if (evt.keyCode === dojo.keys.ENTER && this.results) {
				var links = dojo.query("a", this.results);
				if (links.length > 0) {
					evt.altTarget = links[0];
					if (this.editor && this.editor.type === 'sub'){
						evt.makeShift = true;
					}
					var ret = this.changeFile(evt);
					this.hide();
					dojo.stopEvent(evt);
				}
			}
		});
		dojo.connect(this,"onKeyPress",this,function(evt) {
			var favlinks, links, text, currentFocus, favCurrentSelectionIndex, currentSelectionIndex;
			var incrementFocus = function(currList, index, nextEntry) {
				if (index < currList.length - 1) {
					return currList[index+1];
				} else {
					return nextEntry;
				}
			};
			var decrementFocus = function(currList, index, prevEntry) {
				if (index > 0) {
					return currList[index-1];
				} else {
					return prevEntry;
				}
			};
			
			if (evt.keyCode === dojo.keys.DOWN_ARROW || evt.keyCode === dojo.keys.UP_ARROW) {
				links = dojo.query("a", this.results);
				favlinks = dojo.query("a", this.favresults);
				currentFocus = dijit.getFocus();
				currentSelectionIndex = links.indexOf(currentFocus.node);
				favCurrentSelectionIndex = favlinks.indexOf(currentFocus.node);
				if (evt.keyCode === dojo.keys.DOWN_ARROW) {
					if (favCurrentSelectionIndex >= 0) {
						dijit.focus(incrementFocus(favlinks, favCurrentSelectionIndex, links.length > 0 ? links[0] : favlinks[0]));
					} else if (currentSelectionIndex >= 0) {
						dijit.focus(incrementFocus(links, currentSelectionIndex, favlinks.length > 0 ? favlinks[0] : links[0]));
					} else if (links.length > 0 || favlinks.length > 0) {
						// coming from the text box
						dijit.focus(incrementFocus(favlinks, -1, links[0]));
					}   
				} else {
					if (favCurrentSelectionIndex >= 0) {
						// jump to text box if index === 0
						text = this.resourceName && this.resourceName.get("textbox");
						dijit.focus(decrementFocus(favlinks, favCurrentSelectionIndex, text));
					} else if (currentSelectionIndex >= 0) {
						// jump to text box if index === 0 and favlinks is empty
						text = this.resourceName && this.resourceName.get("textbox");
						dijit.focus(decrementFocus(links, currentSelectionIndex, favlinks.length > 0 ? favlinks[favlinks.length-1] : text));
					} else if (links.length > 0) {
						// coming from the text box go to end of list
						dijit.focus(links[links.length-1]);
					} else if (favlinks.length > 0) {
						// coming from the text box go to end of list
						dijit.focus(favlinks[favlinks.length-1]);
					}
				}
				dojo.stopEvent(evt);
			}
		});
		dojo.connect(this, "onMouseUp", function(e) {
			// WebKit focuses <body> after link is clicked; override that
			e.target.focus();
		});
		// this.populateFavorites();
	},
	
	/** @private kick off initial population of favorites */
	populateFavorites: function() {
		dojo.place("<div>Populating favorites&#x2026;</div>", this.favresults, "only");
		
		// initially, show all favorites
		this.favService.getFavorites().then(this.showFavorites());
		// need to add the listener since favorites may not 
		// have been initialized after first getting the favorites
		this.favService.addEventListener("favoritesChanged", this.showFavorites());
	},
	
	/** 
	 * @private 
	 * render the favorites that we have found, if any.
	 * this function wraps another function that does the actual work
	 * we need this so we can have access to the proper scope.
	 */
	showFavorites: function() {
		var that = this;
		return function(favs) {
			if (favs.navigator) {
				favs = favs.navigator;
			}
			var renderFunction = that.searchRenderer.makeRenderFunction(that.favresults, false, 
					dojo.hitch(that, that.decorateResult), that.showFavoritesImage);
			renderFunction(favs);
			if (favs && favs.length > 0) {
				dojo.place("<hr/>", that.favresults, "last");
			}
		};
	},

	/** @private */
	showFavoritesImage : function(col) {
		var image = new Image();
		dojo.addClass(image, "commandSprite");
		dojo.addClass(image, "core-sprite-makeFavorite");
		dojo.addClass(image, "commandImage");
		// without an image, chrome will draw a border  (?)
		image.src = require.toUrl("images/none.png");
		image.title = "Favorite";
		col.appendChild(image);
		dojo.style(image, "verticalAlign", "middle");
	},
	
	/** @private */
	checkSearch: function() {
		clearTimeout(this.timeoutId);
//		var now = new Date().getTime();
//		if ((now - this.time) > this.SEARCH_DELAY) {
//			this.time = now;
			this.doSearch();
//		} else {
//			this.timeoutId = setTimeout(dojo.hitch(this, "checkSearch"), 50);
//		}
	},
	
	/** @private */
	doSearch: function() {
		var text = this.resourceName && this.resourceName.get("value");

		var showFavs = this.showFavorites();
		// update favorites
		//this.favService.queryFavorites(text).then(function(favs) {
		//	showFavs(favs);
		//});

		// don't do a server-side query for an empty text box
		if (text) {
//			dojo.place("<div>Searching&#x2026;</div>", this.results, "only");
			// Gives Webkit a chance to show the "Searching" message
			var that = this;
			setTimeout(function() {
				var activeSearch = that.activeSearch;
				if (!activeSearch) {
					//var query = that.searcher.createSearchQuery(null, text, "Name");
					var renderer = that.searchRenderer.makeIncrementalRenderer(that.results, false, null, dojo.hitch(that, that.decorateResult));
					that.activeSearch = that.searcher.search(text/*was query*/, false, renderer);
				} else {
					activeSearch.query(text);
				}
			}, 0);
		}
	},

	/** @private */
	decorateResult: function(resultsDiv) {
		var widget = this;
		var editor = this.editor;
		var changeFile = this.changeFile;
		dojo.query("a", resultsDiv).forEach(function(resourceLink) {
			dojo.connect(resourceLink, 'onclick', function(evt){
				widget.hide();
				if (editor && editor.type === 'sub'){
					evt.makeShift = true;
				}
				var ret = changeFile(evt);
				if (!ret) { dojo.stopEvent(evt); }
			});
		});
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
		if (this.activeSearch) {
			this.activeSearch.close();
			delete this.activeSearch;
		}
		clearTimeout(this.timeoutId);
		this.inherited(arguments);
	}
	
});
return OpenResourceDialog;
});

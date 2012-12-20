/*******************************************************************************
 * @license
 * Copyright (c) 2012 - 2012 VMware and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Andy Clement
 *******************************************************************************/
/*global define window $*/
/*jslint browser:true*/

/**
 * The Open File dialog.
 */
define(["scripted/dialogs/dialogUtils", "scripted/utils/pageState", "servlets/incremental-search-client", "text!scripted/dialogs/openResourceDialog.html"],
	function(dialogUtils, pagestate, isearch, dialogText) {
	
	/**
	 * Convert from a path into an object containing the components of the path.
	 * parseFile('a/b/c/D') returns {name:D, path:a/b/c/D, folderName:a/b/c, directory:a/b/c}'
	 * @param {String} path fully qualified path
	 * @return {{name:String,path:String,folderName:String,directory:String}}
	 */
	function parseFile(path) {
		var segments = path.split('/');
		var name = segments[segments.length-1];
		segments.splice(-1,1);
		var parent = segments.join('/');
		return {
			'name':name,
			'path':path,
			'folderName':parent,
			'directory':parent
		};
	}
	
	/**
	 * Create a new search that will wire up results handling to the renderer and return it.
	 * @public
	 * @param {String} query URI of the query to run.
	 * @param {Function(JSONObject)} Callback function that receives the results of the query.
	 */
	function startSearch(query, renderer) {
		var searchRoot = window.fsroot;
		renderer.start(query);
		var activeSearch = isearch(searchRoot, query, {
			//	maxResults: 30, (if not specified then a default value is chosen by the server)
			start: function () {
				$('#dialog_indicator').addClass('inprogress_indicator');
			},
			pause: function () {
// Uncomment to 'freeze' spinner when paused. (Note: this will make it nearly impossible
//  to ever see the spinner actually spinning.
//				$('#dialog_indicator').removeClass('inprogress_indicator');
//				$('#dialog_indicator').addClass('paused_indicator');
			},
			add: function(path) {
				renderer.add(parseFile(path));
			},
			revoke: function (path) {
				renderer.revoke(path);
			},
			done: function() {
				$('#dialog_indicator').removeClass('inprogress_indicator');
				renderer.done();
			}
		});
		return activeSearch;
	}
	
	function makeIncrementalRenderer(resultsNode) {
		var foundValidHit = false;
		var queryName = null;
		var table = null;
		var that = this;
	
		//Helper function to append a path String to the end of a search result dom node
		var appendPath = (function() {
			//Map to track the names we have already seen. If the name is a key in the map, it means
			//we have seen it already. Optionally, the value associated to the key may be a function'
			//containing some deferred work we need to do if we see the same name again.
			var namesSeenMap = {};
			
			function doAppend(domElement, resource) {
				var path = resource.folderName ? resource.folderName : resource.path;
				// trim off the leading inferred fs root
				if (path.indexOf(window.fsroot)===0) {
					path = path.substring(window.fsroot.length);
				}
				domElement.appendChild(document.createTextNode(' - ' + path + ' '));
			}
			
			function appendPath(domElement, resource) {
				var name = resource.name;
				if (namesSeenMap.hasOwnProperty(name)) {
					//Seen the name before
					doAppend(domElement, resource);
					var deferred = namesSeenMap[name];
					if (typeof(deferred)==='function') {
						//We have seen the name before, but prior element left some deferred processing
						namesSeenMap[name] = null;
						deferred();
					}
				} else {
					//Not seen before, so, if we see it again in future we must append the path
					namesSeenMap[name] = function() { doAppend(domElement, resource); };
				}
			}
			return appendPath;
		}());

		var results = {
			//maps paths to dom elements showing them on screen. If a result is revoked this allows us to
			//easily find and destroy it.
		};

		return {
			start: function (qry) {
				queryName = qry;
			},
			revoke: function (path) {
				var links;
				var existing = results[path];
				if (existing) {
					// results are changing, let's deselect the current selection
					links = $(".dialog_results_row",$(that.dialog));
					if (that.selected !== -1) {
						$(links[0]).removeClass('dialog_outline_row');
					}
					delete results[path];
					that.selected = 0;
					$(existing).remove();
				}
				// select the first result
				links = $(".dialog_results_row",$(that.dialog));
				$(links[0]).addClass('dialog_outline_row');
				that.selected = 0;
			},
			add: function (resource) {
				var col;
				var firstresult = false;
				if (!foundValidHit) {
					// This must be the first one!
					foundValidHit = true;
					$(resultsNode).empty();
					
					table = document.createElement('div');
					table.id = 'dialog_results';
					$(resultsNode).append(table);
					firstresult=true;
				}
				
				// If previously displaying the message about no results, remove it
				var noresultsMessage = $(".dialog_noresults_row",$(that.dialog));
				if (noresultsMessage) {
					noresultsMessage.remove();
				}
			
				var row = document.createElement('div');
				$(row).addClass("dialog_results_row");
				$(table).append(row);
				if (resource.path) {
					results[resource.path] = row;
				}
				var resourceLink = document.createElement('a');
				$(resourceLink).append(document.createTextNode(resource.name));
				if (firstresult) {
					that.selected = 0;
					$(row).addClass("dialog_outline_row");
				}
				var loc;
				if (resource.isExternalResource) {
					// should open link in new tab, but for now, follow the behavior of navoutliner.js
					loc = resource.path;
				} else {
					loc = pagestate.generateUrl(resource.path);
				}

				resourceLink.setAttribute('href', loc);
				$(resourceLink).css("verticalAlign","middle");

				row.appendChild(resourceLink);
				appendPath(row, resource);
				
				// On clicking the link in this row, change the editor contents
				$("a",row).each(function(resourceLink) {
					$(this).off('click');
					$(this).on('click.dialogs',function(evt) {
						that.closeDialog();
						var ret = that.changeFile(evt,that.editor);
						return false;
					});
				} );
			    var linkSelected = $(".dialog_outline_row",$(that.dialog));
				if (!linkSelected || linkSelected.length===0) {
					var links = $(".dialog_results_row",$(that.dialog));
					$(links[0]).addClass('dialog_outline_row');
					that.selected = 0;
				}
			},
			done: function () {
				var links = $(".dialog_results_row",$(that.dialog));
				var nores = $(".dialog_noresults_row", $(that.dialog));
				if (links.length===0 && nores.length===0) {
					table = document.createElement('div');
					table.id = 'dialog_results';
					$(resultsNode).append(table);
					var row = document.createElement('div');
					$(row).addClass("dialog_noresults_row");
					$(table).append(row);
					$(row).append(document.createTextNode("No matches found"));
				}
			}
		};
	}

	function closeDialog() {
		$('#dialog_mask').hide();
		$("#dialogs").empty();
		if (this.activeSearch) {
			this.activeSearch.close();
			delete this.activeSearch;
		}
		$(this.activeElement).focus();
	}
	
	/**
	 * (re)size the mask - which should fill the screen whilst visible.
	 */
	var popupOrResizeMask = function(dialogId) {
	    $('#dialog_mask').css({height:$(document).height(), width:$(document).width()}).show();
	};
	
	/**
	 * Position the dialog
	 */
	var positionDialog = function(dialogId) {
		var maxHeight = $(document).height();
	    var maxWidth = $(document).width();
//	    console.log("offset="+JSON.stringify($(dialogId).offset()));
	    // calculate the values for center alignment
	    var dialogTop =  (maxHeight/3) - (($(dialogId).height()+500)/3);
	    var dialogLeft = (maxWidth/2) - ($(dialogId).width()/2);
	    if (dialogTop<16) {
			dialogTop = 16;
		}
	    $(dialogId).css({top:dialogTop, left:dialogLeft}).show();
	};
	
	var doSearch = function() {
		var text = $('#dialog_filename').val();
		if (this.currentQuery !== null && this.currentQuery === text) {
			return;
		}
		var that = this;
		var activeSearch = this.activeSearch;
		this.currentQuery = text;
		if (!activeSearch) {
			var renderer = this.rendererFactory($('#dialog_openfile_results'));
			this.activeSearch = this.startSearch(text,renderer);
			$('#dialog_openfile_results').scroll(function(evt) {
				that.addMoreResultsNearScrollBottom();
				$('#dialog_filename').focus(); // refocus after scrolling
			});
		} else {
			activeSearch.query(text);
		}
	};

	/**
	 * If scrolling near the bottom of the results list and more seem to be available, request them.
	 */
	function addMoreResultsNearScrollBottom() {
		var target = $("#dialog_openfile_results").get(0);
		var activeSearch = this.activeSearch;
		if (activeSearch && target) {
			var scrollBottom = target.scrollTop+target.clientHeight;
			var scrollHeight = target.scrollHeight;
			if (scrollHeight) {
				var leftOver = (scrollHeight-scrollBottom)/scrollHeight;
				if (leftOver<0.1) {
					// Less than 10% of the elements displated below bottom of the
					// visible scroll area.
					this.activeSearch.more(); // ask for more results
				}
			}
		}
	}
	
	var openDialog = function(editor, changeFile, onCancel) {
		this.startSearch = startSearch;
		this.rendererFactory = makeIncrementalRenderer;
		this.addMoreResultsNearScrollBottom = addMoreResultsNearScrollBottom;
		this.changeFile = changeFile;
		this.closeDialog = closeDialog;
		this.activeElement = document.activeElement;
		this.currentQuery = null;
		this.dialog="#dialog_openfile";
		this.selected = -1;
		this.editor = editor;
		
		var that = this;
		
		$("#dialogs").append('<div id="dialog_mask"></div>');
		$("#dialogs").append(dialogText);

		// Clicking the mask will hide it and the dialog
		$('#dialog_mask').off('click.dialogs');
		$('#dialog_mask').on('click.dialogs',function() {
			that.closeDialog();
			return false;
		});

		// Handle ENTER and ESCAPE keypresses on the dialog
		$(this.dialog).off('keydown.dialogs');
		$(this.dialog).on('keydown.dialogs',function( e ) {
			var links, nextSelected, loopedRound;
			if ((e.keyCode === $.ui.keyCode.UP || e.keyCode === $.ui.keyCode.DOWN)) {
				links = $(that.dialog).find(".dialog_results_row");
				var currentSelection = that.selected;
				loopedRound = false;
				if (e.keyCode === $.ui.keyCode.DOWN) {
					if (that.selected >= 0) {
						nextSelected = that.selected===(links.length-1)?0:that.selected+1;
						if (nextSelected===0) {
							loopedRound = true;
						}
						$(links[that.selected]).removeClass('dialog_outline_row');
						$(links[nextSelected]).addClass('dialog_outline_row');
						that.selected = nextSelected;
					} else if (links.length > 0) {
						that.selected = 0;
						$(links[0]).addClass('dialog_outline_row');
					}
				} else {
					if (that.selected>0) {
						nextSelected = that.selected-1;
						$(links[that.selected]).removeClass('dialog_outline_row');
						$(links[nextSelected]).addClass('dialog_outline_row');
						that.selected = nextSelected;
					} else if (that.selected===0) {
						nextSelected = links.length-1;
						$(links[that.selected]).removeClass('dialog_outline_row');
						$(links[nextSelected]).addClass('dialog_outline_row');
						that.selected = nextSelected;
						loopedRound=true;
					}
				}
				
				// This code adjust the scroll bars to try and ensure the selection
				// stays on screen
				var r = $("#dialog_openfile_results");
				var dialog_results =  $("#dialog_results",$(that.dialog));
				var scrollPositionOfResults = r.scrollTop();
				var linkHeight = $(links[0]).outerHeight();
				var scrollAreaHeight = dialog_results.height();
				var viewHeight = $(r).height();
				
				var viewWidth = dialog_results.width();
				var scrollWidth = dialog_results.get(0).scrollWidth;
				// if horizontal scrollbar is on, adjust our viewport
				if (scrollWidth>viewWidth) {
					viewHeight-=linkHeight;
				}
				
				var pos = ((that.selected+1)*linkHeight);
				var oldpos = ((currentSelection+1)*linkHeight);
				var wasOffScreen = (oldpos-scrollPositionOfResults)>viewHeight || oldpos<=scrollPositionOfResults;
				var isOffScreen = (pos-scrollPositionOfResults)>viewHeight || pos<=scrollPositionOfResults;
				var newPosition;
				if (isOffScreen) {
					if (!wasOffScreen) {
						// readjust scroll position
						if (e.keyCode === $.ui.keyCode.DOWN) {
							if (!loopedRound) {
								r.scrollTop(scrollPositionOfResults + linkHeight);
							} else {
								r.scrollTop(0);
							}
						} else {
							// UP
							if (!loopedRound) {
								newPosition = scrollPositionOfResults - linkHeight;
								if (newPosition < 0) {
									newPosition = 0;
								}
								r.scrollTop(newPosition);
							} else {
								newPosition = scrollAreaHeight - viewHeight;
								r.scrollTop(newPosition);
							}
						}
					} else {
						// it was previously off the screen and still is, but the user is doing key scrolling, so let's
						// try and reposition the scroll bar to sort that out
						var newScrollPos = pos - linkHeight;
						if (newScrollPos > (scrollAreaHeight - viewHeight)) {
							newScrollPos = scrollAreaHeight - viewHeight;
						}
						r.scrollTop(newScrollPos);
					}
				}
				return false;
			} else if (e.keyCode === $.ui.keyCode.ENTER) {
				// Pressing ENTER triggers the button click on the selection
				var results = $("a",$(that.dialog));
				if (results && results.length>0) {
					var result = results[(that.selected===-1)?0:that.selected];
					var click = new $.Event('click');
					//Take care to retain modifier keys on simulated clicks!
					click.shiftKey = e.shiftKey;
					click.ctrlKey = e.ctrlKey;
					click.altKey = e.altKey;
					click.metaKey = e.metaKey;
					$(result).trigger(click);
				}
				return false;
		    } else if (e.keyCode === $.ui.keyCode.ESCAPE) {
				// Pressing ESCAPE closes the dialog (and mask) and refocuses to the original element
				that.closeDialog();
				e.stopPropagation();
			}
		});

		// On keyup the text field contains the character
		$(this.dialog).off('keyup.dialogs');
		$(this.dialog).on('keyup.dialogs',function( e ) {
			doSearch.bind(that)();
		});
		
		$(this.dialog).off('click.dialogs');
		$(this.dialog).on('click.dialogs',function() {
			    $('#dialog_filename').focus();
		});

		// Handle resize events - adjust size of mask and dialog
		$(window).off('resize.dialogs');
		$(window).on('resize.dialogs',function() {
			if (!$('#dialog_mask').is(':hidden')) {
				popupOrResizeMask(that.dialog);
			}
		});
		
		popupOrResizeMask(this.dialog);
		
		positionDialog(this.dialog);
		
	    $('#dialog_filename').focus();
    };

	return {
		openDialog: openDialog
	};
});

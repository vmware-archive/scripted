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
 *     Kris De Volder
 *******************************************************************************/
/*global define window $*/
/*jslint browser:true*/

// TODO open file and search, skip dependencies in some way

/**
 * The Open File dialog.
 */
define(["scripted/dialogs/dialogUtils", "scripted/utils/pageState", "servlets/incremental-file-search-client",
		"text!scripted/dialogs/lookInFilesDialog.html","jquery"],
function(dialogUtils, pagestate, isearch, dialogText,$) {
	
	var MINIMUM_LENGTH = 3; //Search Strings smaller than this are considered problematic and not executed.

	/**
	 * Quick and dirty search history. It is not persisted and only retains a single search result.
	 */
	var searchHistory = (function () {

		var lastSearch = null;
		
		return {
			get: function () {
				return lastSearch;
			},
			put: function (search) {
				if (typeof(search)==='string' && search.length>=MINIMUM_LENGTH) {
					// Ignore trivial or empty searches. Probably more useful to keep the
					// previous search instead.
					lastSearch = search;
				}
			}
		};

	}());

	function parseFile(searchresult) {
		//TODO: can we get rid of this crappy 'transform the result into what we expect'
		// function and simply have the searcher itself return objects in the
		// expected format??
	
		var segments = searchresult.file.split('/');
		var name = segments[segments.length-1];
		segments.splice(-1,1);
		var parent = segments.join('/');
		var parseResult = {};
		for (var p in searchresult) {
			if (searchresult.hasOwnProperty(p)) {
				parseResult[p] = searchresult[p];
			}
		}
		parseResult.name = name;
		parseResult.folderName = parent;
		parseResult.directory = parent;
		parseResult.path = searchresult.file;
		return parseResult;
	}

	function startSearch(query, renderer) {
		var searchRoot = window.fsroot;
		renderer.start(query);
		var activeSearch = isearch(searchRoot, query, {
			start: function () {
				$('#dialog_indicator').addClass('inprogress_indicator');
			},
			pause: function () {
// Uncomment to 'freeze' spinner when paused. (Note: this will make it nearly impossible
//  to ever see the spinner actually spinning.
//				$('#dialog_indicator').removeClass('inprogress_indicator');
//				$('#dialog_indicator').addClass('paused_indicator');
			},
			add: function(searchresult) {
				// path will actually be an object:
				// { file: "A/B/C/D.txt", line: NN, col: NN, context: "xxxx" }
				renderer.add(parseFile(searchresult));
			},
			revoke: function (searchresult) {
				renderer.revoke(searchresult);
			},
			update: function (r) {
				renderer.update(parseFile(r));
			},
			done: function() {
				$('#dialog_indicator').removeClass('inprogress_indicator');
				renderer.done();
			}
		});
		return activeSearch;
	}
	
	function makeIncrementalRenderer (resultsNode, heading, onResultReady, decorator, changeFile, editor) {

		var foundValidHit = false;
		var queryName = null;
		var table = null;
		var that=this;
	
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
				return resource.name;
			}
			
			function toPath(resource) {
				var path = resource.folderName ? resource.folderName : resource.path;
				// trim off the leading inferred fs root
				if (path.indexOf(window.fsroot)===0) {
					path = path.substring(window.fsroot.length);
				}
				return path;
			}
			
			/*
			 * More complex than for 'open file' because we may have multiple matches within a single file.
			 * If we do that doesn't mean the path needs appending. The path only needs appending if two files
			 * from different places have matches.
			 */
			function appendPath(domElement, resource) {
				var name = resource.name;
				var thisPath = toPath(resource);
				var key = name + '::' + thisPath;
				var pathsNeeded = false;
				var potentialWork = [];
				
				if (namesSeenMap.hasOwnProperty(name)) {
					// namesSeenMap = Map<String::name,List<Map<String::Path,Function::appendfn>>>
					var matches = namesSeenMap[name];
					for (var m=0;m<matches.length;m++) {
						var candidate = matches[m];
						if (candidate.path!==thisPath) {
							pathsNeeded=true;
						}
						if (typeof(candidate.appendfn)==='function') {
							potentialWork.push(candidate);
						}
					}
					if (pathsNeeded) {
						doAppend(domElement,resource);
					}
					namesSeenMap[name].push({ "path": toPath(resource), "appendfn": null});
				} else {
					//Not seen before, so, if we see it again in future we must append the path
					namesSeenMap[name] = [];
					namesSeenMap[name].push({ "path": toPath(resource), "appendfn": function() { doAppend(domElement, resource); }});
				}
				if (pathsNeeded) {
					for (var i=0;i<potentialWork.length;i++) {
						var workitem = potentialWork[i];
						if (typeof(workitem.appendfn)==='function') {
							workitem.appendfn();
							workitem.appendfn = null;
						}
					}
				}
			}
			return appendPath;
		}());
				
		function populateRow(row, resource) {
			// Attach all the useful data to the row, useful for later navigation
			row.resultData = resource;
						
			$(row).addClass('dialog_results_row');

			// Column: context for the match
			var col = document.createElement('span');
			$(row).append(col);
			$(col).addClass('dialog_matchtextcontext');
			var textnode = document.createTextNode(resource.context);
			// lets try and create some sexy stuff
			var beforeText = resource.context.substring(0,resource.col);
			var afterText = resource.context.substring(resource.col+resource.text.length);
			var maxWidthForMatch = 64;
			if ((beforeText.length+resource.text.length+afterText.length) > maxWidthForMatch) {
			  // need to trim leading and trailing text
			  var trimLevel = (maxWidthForMatch - resource.text.length)/2;
			  // TODO what to do if search term is too long!
			  if (trimLevel>0) {
			    if (beforeText.length>trimLevel) {
					beforeText = beforeText.substring(beforeText.length-trimLevel);
			    }
			    if (afterText.length>trimLevel) {
					afterText = afterText.substring(0, trimLevel);
			    }
			  }
			  
			}
			textnode = document.createTextNode(beforeText);
			col.appendChild(textnode);
			textnode = document.createElement("span");
			textnode.innerHTML=resource.text;
			$(textnode).addClass('dialog_matchhighlight');
			col.appendChild(textnode);
			textnode = document.createTextNode(afterText);
			col.appendChild(textnode);
			
			// Building a row, input data is:
			//	'name':name,
			//	'path':searchresult.file,
			//	'folderName':parent,
			//	'directory':parent,
			//	'line':searchresult.pos,
			//	'col':searchresult.col,
			//	'context':searchresult.context
			

			// the filename and line number
			col = document.createElement('span');
			$(row).append(col);
			
			var resourceLink = document.createElement('span');
			$(resourceLink).append(document.createTextNode(resource.name));
			if (resource.line) {
				// add 1 as returned line is based on 0
				$(resourceLink).append(document.createTextNode('  (Line '+(resource.line+1)+')'));
			}
			var loc = resource.location;

			col.appendChild(resourceLink);
			
			// If not unique, add a path
			appendPath(col, resource);
			
			// On clicking the row, change the editor contents
			$(row).each(function(resourceLink) {
				$(this).off('click');
				$(this).on('click.dialogs',function(evt) {
					that.closeDialog();
					var result = row.resultData;
					that.openOnRange(evt, {
						path: result.path,
						range: [result.offset, result.offset+result.text.length]
					}, that.editor);
					return false;
				});
			} );
			
		}
		
		var results = {
			//maps paths to dom elements showing them on screen. If a result is revoked this allows us to
			//easily find and destroy it.
		};
		
		return {
			start: function (qry) {
				queryName = qry;
			},
			revoke: function (id) {
				var links;
				var existing = results[id];
				if (existing) {
					delete results[id];
					$(existing).remove();
				}
				// select the first result
				links = $(".dialog_results_row",$(that.dialog));
				$(links[0]).addClass('dialog_outline_row');
				that.selected = 0;
			},
			update: function (resource) {
//				console.log("renderer: request to update result "+resource);
				var existing = results[resource.id];
				if (existing) {
					$(existing).empty();
					populateRow(existing, resource);
				}
			},
			add: function (resource) {
//				console.log("renderer: adding result "+resource);
				if (!foundValidHit) {
					//This must be the first one!
					foundValidHit = true;
					$(resultsNode).empty();
					table = document.createElement('div');
					table.id='dialog_results';
					$(resultsNode).append(table);
				}
				var row = document.createElement('div');
				$(table).append(row);
				results[resource.id] = row;
				populateRow(row, resource);
				
			    var linkSelected = $(".dialog_outline_row",$(that.dialog));
				if (!linkSelected || linkSelected.length===0) {
					var links = $(".dialog_results_row",$(that.dialog));
					$(links[0]).addClass('dialog_outline_row');
					that.selected = 0;
				}
			},
		done: function () {
			if (!foundValidHit) {
				// only display no matches found if we have a proper name
				if (queryName) {
					table = document.createElement('div');
					table.id = 'dialog_results';
					$(resultsNode).append(table);
					var row = document.createElement('div');
					$(row).addClass("dialog_noresults_row");
					$(table).append(row);
					$(row).append(document.createTextNode("No matches found"));

//					var div = dojo.place("<div>No matches found for </div>", resultsNode, "only");
//					var b = dojo.create("b", null, div, "last");
//					dojo.place(document.createTextNode(queryName), b, "only");
//					if (typeof(onResultReady) === "function") {
//						onResultReady(resultsNode); // TODO whats this do?
//					}
				}
			}
		}
	};
	}

	function closeDialog() {
		$('#dialog_mask').hide();
		searchHistory.put($('#dialog_search_text').val());
		$("#dialogs").empty();
		if (this.activeFileSearch) {
			this.activeFileSearch.close();
			delete this.activeFileSearch;
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
		var text = $('#dialog_search_text').val();

		//Searching for a single character is not very useful and it creates problems,
		//even with a 'suspendable' search, because the search cannot be suspended in the
		//middle of a file (yet). With a big file to search the single char search can
		//return a lot of results just in that one file... causing trouble.
		if (text && text.length>=MINIMUM_LENGTH) {
//			console.log("search: text changed '"+text+"'");
			var that = this;
			var activeFileSearch = that.activeFileSearch;
			if (!activeFileSearch) {
//				console.log("search: no active search, starting one");
				var renderer = this.rendererFactory($('#dialog_lookinfiles_results'));
				$('#dialog_indicator').addClass('inprogress_indicator');
				this.activeFileSearch = this.startSearch(text,renderer);
				$('#dialog_lookinfiles_results').scroll(function (evt) {
					that.addMoreResultsNearScrollBottom();
					$('#dialog_search_text').focus(); // refocus after scrolling
				});
			} else {
//				console.log("search: search active, updating it");
				activeFileSearch.query(text);
			}
		}
	};

	/**
	 * If scrolling near the bottom of the results list and more seem to be available, request them.
	 */
	function addMoreResultsNearScrollBottom() {
		var target = $("#dialog_lookinfiles_results").get(0);
		var activeFileSearch = this.activeFileSearch;
		if (activeFileSearch && target) {
			var scrollBottom = target.scrollTop+target.clientHeight;
			var scrollHeight = target.scrollHeight;
			if (scrollHeight) {
				var leftOver = (scrollHeight-scrollBottom)/scrollHeight;
				if (leftOver<0.1) {
					// Less than 10% of the elements displated below bottom of the
					// visible scroll area.
//					console.log("asking for more results");
					this.activeFileSearch.more(); // ask for more results
				}
			}
		}
	}
	
	function getSelectedText(editor) {
		var range = editor && editor.getSelection();
		if (range && range.start && range.end && range.end > range.start) {
			return editor.getText(range.start, range.end);
		}
	}
	
	var openDialog = function(editor,openOnRange) {
		this.openOnRange = openOnRange;
		this.editor = editor;
		this.startSearch = startSearch;
		this.rendererFactory = makeIncrementalRenderer;
		this.addMoreResultsNearScrollBottom = addMoreResultsNearScrollBottom;
		this.selected = -1;
		
		this.closeDialog = closeDialog;

		this.dialog="#dialog_lookinfiles";
		this.activeElement = document.activeElement;
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
			if ((e.keyCode === 38/*UP*/ || e.keyCode === 40/*DOWN*/)) {
				links = $(that.dialog).find(".dialog_results_row");
				var currentSelection = that.selected;
				loopedRound = false;
				if (e.keyCode === 40/*DOWN*/) {
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
				var r = $("#dialog_lookinfiles_results");
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
						if (e.keyCode === 40/*DOWN*/) {
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
			} else if (e.keyCode === 13/*ENTER*/) {
				// Pressing ENTER triggers the button click on the selection
				links = $(that.dialog).find(".dialog_results_row");
				if (links && links.length>0) {
					var result = links[(that.selected===-1)?0:that.selected];
					$(result).trigger('click');
				}
				return false;
		    } else if (e.keyCode === 27/*ESCAPE*/) {
				// Pressing ESCAPE closes the dialog (and mask) and refocuses to the original element
				that.closeDialog();
				return false;
			}
		});

		// On keyup the text field contains the character
		$(this.dialog).off('keyup.dialogs');
		$(this.dialog).on('keyup.dialogs',function( e ) {
			doSearch.bind(that)();
		});
		
		$(this.dialog).off('click.dialogs');
		$(this.dialog).on('click.dialogs',function() {
			    $('#dialog_search_text').focus();
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
		
		var lastSearch = getSelectedText(this.editor) || searchHistory.get();
		if (lastSearch) {
			$('#dialog_search_text').val(lastSearch);
			$('#dialog_search_text').select();
		}
		
	    $('#dialog_search_text').focus();
    };

	return {
		openDialog: openDialog
	};
});

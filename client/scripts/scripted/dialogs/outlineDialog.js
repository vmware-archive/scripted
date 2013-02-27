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
 *	   Andrew Eisenberg
 *******************************************************************************/
/*global define window $*/
/*jslint browser:true*/

/**
 * The outline dialog.
 */
define(["scripted/dialogs/dialogUtils", "scripted/utils/navHistory", "scripted/utils/pageState", "plugins/outline/esprimaOutliner",
	"text!scripted/dialogs/outlineDialog.html","jquery"],
	function(dialogUtils, navHistory, pagestate, outliner, dialogText,$) {

	function closeDialog() {
		$('#dialog_mask').hide();
		$("#dialogs").empty();
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

	/**
	 * Check if string 'label' contains all the characters (in the right order
	 * but not necessarily adjacent) from charseq.
	 *
	 * @param {String} label the text to check
	 * @param {String} charseq the sequence of chars to check for
	 * @type {Boolean} true if matches
	 */
	function matches(label, charseq) {
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
	}

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
	function renderOutlineHelper(table, data, queryString, indent) {
		var that=this;
		var nav = function(evt) {
			var range = evt.currentTarget.range;
			if (range) {
				that.editor.setSelection(range[0], range[1], true);
				navHistory.scrollToSelection(that.editor);
				that.closeDialog();
			}
		};
		for (var i=0;i<data.length;i++) {
			var entry = data[i];
			if (queryString.length===0 || matches(entry.label,queryString)) {
				var row = document.createElement('div');
				$(row).addClass('dialog_results_row');
				$(row).addClass('dialog_outlinedialog_entry');
				$(table).append(row);
				var prefix = "";
				for (var ii=0;ii<indent;ii++) {
					prefix = prefix+"\xa0\xa0";
				}
				var textnode = document.createTextNode(prefix+entry.label);
				row.appendChild(textnode);
				row.range = entry.range;
				$(row).on('click', nav);
			}
			if (entry.children && entry.children.length!==0) {
				this.renderOutlineHelper(table, entry.children, queryString, indent+1);
			}
		}
	}

	/**
	 * Render this.outline (a set of function references) into the dom.
	 * The regex can be used to subset the entries from this.outline.
	 * this.outline is an array of objects with a label and a line
	 */
	function renderOutline(regex) {
		var queryString = regex;
		if (!regex) {
			queryString = "";
		}
		queryString = queryString.toLowerCase();
		this.selected = -1;
		var resultsNode = $('#dialog_outline_results');
		$(resultsNode).empty();
		if (this.outline && this.outline.length>0) {
			var table = document.createElement('div');
			table.id='dialog_results';
			this.renderOutlineHelper(table,this.outline,queryString,0);
			$(resultsNode).append(table);
			// Select the first row
			var links = $('.dialog_results_row',resultsNode);
			if (links && links.length!==0) {
				$(links[0]).addClass('dialog_outline_row');
				this.selected = 0;
			}
		}
	}


	var openDialog = function(editor) {
		this.editor = editor;
		this.dialog="#dialog_outline";
		this.closeDialog = closeDialog;
		this.activeElement = document.activeElement;
		this.renderOutline = renderOutline;
		this.renderOutlineHelper = renderOutlineHelper;
		this.selected = -1;

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
				// TODO refactor scrolling and repositioning into dialogUtils (across this and the other dialogs)
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
				var r = $("#dialog_outline_results"); // the on screen container for results
				var dialog_results =  $("#dialog_results",$(that.dialog)); // the larger view of results that must fit into that container
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
				var results = $(".dialog_results_row");
				if (results && results.length>0) {
					var result = results[(that.selected===-1)?0:that.selected];
					$(result).trigger('click');
				}
				that.closeDialog();
				return false;
		    } else if (e.keyCode === 27/*ESCAPE*/) {
				// Pressing ESCAPE closes the dialog (and mask) and refocuses to the original element
				that.closeDialog();
				return false;
			}
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

		this.outline = outliner.getOutline(this.editor.getText());
		this.renderOutline();

		$('#dialog_outline_filter_text').off('input.dialogs');
		$('#dialog_outline_filter_text').on('input.dialogs',function (evt) {
			var filter_text = $(evt.target).val();
			if (!filter_text) {
				filter_text="";
			}
			that.renderOutline(filter_text);
		});

		$('#dialog_outline_results').scroll(function(evt) {
			$('#dialog_outline_filter_text').focus(); // refocus after scrolling
		});

	    $('#dialog_outline_filter_text').focus();
    };

	return {
		openDialog: openDialog
	};
});

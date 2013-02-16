/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Andy Clement
 *******************************************************************************/

/**
 * The search dialog.
 */
define(["scripted/dialogs/dialogUtils", "scripted/utils/pageState", "text!scripted/inplacedialogs/infile-search.html","orion/textview/annotations"],
	function(dialogUtils, pagestate, dialogText, annotations) {


	function closeDialog() {
		$("#dialogs").empty();
		$(this._editor).focus();
//		$(this.activeElement).focus();
		$(this._bar).off('widthchange.dialog');
		this.removeCurrentAnnotation();
	}

	var removeCurrentAnnotation = function(evt) {
		var annotationModel = this._editor.getAnnotationModel();
		if (annotationModel) {
			annotationModel.removeAnnotations(annotations.AnnotationType.ANNOTATION_CURRENT_SEARCH);
			annotationModel.removeAnnotations(annotations.AnnotationType.ANNOTATION_MATCHING_SEARCH);
		}
	};

	/**
	 * Position the dialog
	 */
	var positionDialog = function(dialogId) {
		$("#dialogs").append(dialogText);
		var bar = $(this._bar);
		var editorDomNode = $(this._editor._domNode);
		var offsets = bar.offset();
		var dialog = $(dialogId);
		dialog.css({top:offsets.top,left:offsets.left});
		// TODO using editor width because 'bar' width is auto for side panel
		// so this clips at width of filename
		dialog.width(editorDomNode.width());
		dialog.height(bar.height());

		$("#replace_button").focus();
		dialog.show();
	};

	var resize = function(dialogId) {
		var bar = $(this._bar);
		var offsets = bar.offset();
		var dialog = $(dialogId);
		dialog.css({top:offsets.top,left:offsets.left});
		dialog.width(bar.width());
		var neww = dialog.width();
		dialog.height(bar.height());
		var left = $('#options').offset().left;
		var optionsMenu = $(".inplace_dialog_options_menu");
		optionsMenu.css("left",left);
	};

	var setOptions = function(options) {
		if (options) {
			if (options.showAllOccurrence === true || options.showAllOccurrence === false) {
				this._showAllOccurrence = options.showAllOccurrence;
			}
			if (options.ignoreCase === true || options.ignoreCase === false) {
				this._ignoreCase = options.ignoreCase;
			}
			if (options.wrapSearch === true || options.wrapSearch === false) {
				this._wrapSearch = options.wrapSearch;
			}
			if (options.wholeWord === true || options.wholeWord === false) {
				this._wholeWord = options.wholeWord;
			}
			if (options.incremental === true || options.incremental === false) {
				this._incremental = options.incremental;
			}
			if (options.useRegExp === true || options.useRegExp === false) {
				this._useRegExp = options.useRegExp;
			}
			if (options.findAfterReplace === true || options.findAfterReplace === false) {
				this._findAfterReplace = options.findAfterReplace;
			}

			if (options.reverse === true || options.reverse === false) {
				this._reverse = options.reverse;
			}

			if (options.toolBarId) {
				this._toolBarId = options.toolBarId;
			}
			if (options.searchRange) {
				this._searchRange = options.searchRange;
			}
			if (options.searchOnRange === true || options.searchOnRange === false) {
				this._searchOnRange = options.searchOnRange;
			}
		}
	};

	var startUndo = function() {
		if (this._undoStack) {
			this._undoStack.startCompoundChange();
		}
	};

	var endUndo = function() {
		if (this._undoStack) {
			this._undoStack.endCompoundChange();
		}
	};

	var focus = function(shouldSelect) {
		$('#findtext').focus();
		if (shouldSelect) {
			$('#findtext').select();
		}
	};

	var getSearchStartIndex = function(reverse, flag) {
		var currentCaretPos = this._editor.getCaretOffset();
		if(reverse) {
			var selection = this._editor.getSelection();
			var selectionSize = (selection.end > selection.start) ? selection.end - selection.start : 0;
			if(!flag){
				return (currentCaretPos- selectionSize - 1) > 0 ? (currentCaretPos- selectionSize - 1) : 0;
			}
			return selection.end > 0 ? selection.end : 0;
		}
		return currentCaretPos > 0 ? currentCaretPos : 0;
	};

	var replace = function() {
		this.startUndo();
		var newStr = $('#replacetext').val();
		var editor = this._editor;
		var selection = editor.getSelection();
		editor.setText(newStr, selection.start, selection.end);
		editor.setSelection(selection.start , selection.start + newStr.length, true);
		this.endUndo();
		var searchStr = $('#findtext').val();
		if (this._findAfterReplace && searchStr){
			this._doFind(searchStr, this.getSearchStartIndex(false), false, this._wrapSearch);
		}
	};

	var replaceAll = function() {
		var searchStr = $('#findtext').val();
		if(searchStr){
			this._replacingAll = true;
			var editor = this._editor;
			editor.reportStatus("");
			editor.reportStatus("Replacing all...", "progress");
			var newStr = $('#replacetext').val();
			window.setTimeout((function() {
				var startPos = 0;
				var number = 0, lastResult;
				while(true){
					var result = this._doFind(searchStr, startPos);
					if(!result) {
						break;
					}
					lastResult = result;
					number++;
					if(number === 1) {
						this.startUndo();
					}
					var selection = editor.getSelection();
					editor.setText(newStr, selection.start, selection.end);
					editor.setSelection(selection.start , selection.start + newStr.length, true);
					startPos = this.getSearchStartIndex(true, true);
				}
				if(number > 0) {
					this.endUndo();
				}
				editor.reportStatus("", "progress");
				if(startPos > 0) {
					editor.reportStatus("Replaced "+number+" matches");
				} else {
					editor.reportStatus("Nothing replaced", "error");
				}
				this._replacingAll = false;
			}).bind(this), 100);
		}
	};

	var findNext = function(next, searchStr, incremental) {
		this.setOptions({
			reverse : !next
		});
		var startIndex = this.getSearchStartIndex(incremental ? true : !next);
		if(!searchStr){
			searchStr = $('#findtext').val();
		}
		return this._doFind(searchStr, startIndex,!next, this._wrapSearch);
	};

	var _doFind = function(searchStr, startIndex, reverse, wrapSearch) {
		var editor = this._editor;
		var annotationModel = editor.getAnnotationModel();
		if(!searchStr){
			if(annotationModel){
				annotationModel.removeAnnotations(annotations.AnnotationType.ANNOTATION_CURRENT_SEARCH);
				annotationModel.removeAnnotations(annotations.AnnotationType.ANNOTATION_MATCHING_SEARCH);
			}
			return null;
		}
		this._lastSearchString = searchStr;
		var result = editor.getModel().find({
			string: searchStr,
			start: startIndex,
			reverse: reverse,
			wrap: wrapSearch,
			regex: this._useRegExp,
			wholeWord: this._wholeWord,
			caseInsensitive: this._ignoreCase
		}).next();
		if (!this._replacingAll) {
			if (result) {
				this._editor.reportStatus("");
			} else {
				this._editor.reportStatus("Not found", "error");
			}
			var type = annotations.AnnotationType.ANNOTATION_CURRENT_SEARCH;
			if (annotationModel) {
				annotationModel.removeAnnotations(type);
				if (result) {
					annotationModel.addAnnotation(annotations.AnnotationType.createAnnotation(type, result.start, result.end));
				}
			}
			if(this._showAllOccurrences){
				if(this._timer){
					window.clearTimeout(this._timer);
				}
				var that = this;
				this._timer = window.setTimeout(function(){
					that.markAllOccurrences(result);
					that._timer = null;
				}, 500);
			}
		}
		if (result) {
			editor.moveSelection(result.start, result.end, null, false);
		}
		return result;
	};

	var markAllOccurrences = function(singleResult) {
		var annotationModel = this._editor.getAnnotationModel();
		if(!annotationModel){
			return;
		}
		var type = annotations.AnnotationType.ANNOTATION_MATCHING_SEARCH;
		var iter = annotationModel.getAnnotations(0, annotationModel.getTextModel().getCharCount());
		var remove = [], add;
		while (iter.hasNext()) {
			var annotation = iter.next();
			if (annotation.type === type) {
				remove.push(annotation);
			}
		}

		var searchStr = $('#findtext').val();

		if(singleResult && searchStr) {
			iter = this._editor.getModel().find({
				string: searchStr,
				regex: this._useRegExp,
				wholeWord: this._wholeWord,
				caseInsensitive: this._ignoreCase
			});
			add = [];
			while (iter.hasNext()) {
				var match = iter.next();
				add.push(annotations.AnnotationType.createAnnotation(type, match.start, match.end));
			}
		}
		annotationModel.replaceAnnotations(remove, add);
	};

	var keyupHandler = function(evt) {
		if(this._incremental && !this._keyUpHandled){
			this.findNext(true, null, true);
		}
		this._keyUpHandled = false;
		return true;
	};

	var keydownHandler = function(evt, pressedInSearch){
		var ctrlKeyName = this.isMac ? 'metaKey' : 'ctrlKey';
		var otherKeyName = this.isMac ? 'ctrlKey' : 'metaKey';
		var ctrlKey = evt[ctrlKeyName];

		// TODO look up keybinding, don't just assume 'f'
		if (ctrlKey && !evt[otherKeyName] && !evt.shiftKey && evt.keyCode===70/*f*/) {
			this._keyUpHandled = pressedInSearch;
			this.focus(true);
			return false;
		}

		if ((ctrlKey && evt.keyCode === 75/*k*/) || evt.keyCode===13/*enter*/) {
			this._keyUpHandled = pressedInSearch;
			this.findNext(!evt.shiftKey);
			return false;
		}

		if (evt.keyCode===27/*ESC*/) {
			this.closeDialog();
			this._keyUpHandled = pressedInSearch;
			return false;
		}

		if( ctrlKey &&  evt.keyCode === 82 /*r*/){
			this._keyUpHandled = pressedInSearch;
			if(!pressedInSearch) {
				this.replace();
			}
			return false;
		}
		return true;
	};


	var openDialog = function(editor, undoStack, selectionText, bar) {

		// TODO allow opening on different editor, close the current one and switch it to the new editor

		// If already open, just focus on the search field and return
		var dialogNode = $(this.dialog);
		if (dialogNode.length>0) {
			if (this._editor === editor) {
				this.focus();
				return;
			} else {
				this.closeDialog();
			}
		}

		this._editor = editor;
		this._undoStack = undoStack;
		this._bar = bar;

		// If not yet set, let's initialize them now
		if (typeof this._showAllOccurrences === 'undefined') {
			this._showAllOccurrences = true; // Should the editor show all the matches
			this._ignoreCase = true;         // Is the search case sensitive?
			this._wrapSearch = true;
			this._wholeWord = false;
			this._incremental = true;
			this._useRegExp = false;
			this._findAfterReplace = true;
		}

		this.isMac = navigator.platform.indexOf("Mac") !== -1;

		this.dialog="#inplace_dialog_infile_search";
		this.activeElement = document.activeElement;
		this.startUndo = startUndo;
		this.removeCurrentAnnotation = removeCurrentAnnotation;
		this.endUndo = endUndo;
		this.resize = resize;
		this.focus = focus;
		this.replace = replace;
		this.replaceAll = replaceAll;
		this.positionDialog = positionDialog;
		this._doFind = _doFind;
		this.keydownHandler = keydownHandler;
		this.getSearchStartIndex=getSearchStartIndex;
		this.keyupHandler = keyupHandler;
		this.findNext = findNext;
		this.setOptions = setOptions;
		this.markAllOccurrences = markAllOccurrences;
		this.closeDialog = closeDialog;

		var that = this;

		$(bar).on('widthchange.dialog',function() {
			that.resize(that.dialog);
		});

		$(document)
			.off('keydown.dialogs')
			.on('keydown.dialogs', function(e){
				if (e.keyCode === 27){
					that.closeDialog();
					$(this).unbind(e);
					return false;
				}
				return true;
			});

		this.positionDialog(this.dialog);

		$('#replace_button').on('click',function(evt) {
			that.replace();
		});

		$('#replace_all_button').on('click',function(evt) {
			that.replaceAll();
		});

		// options hidden by default
		$(".inplace_dialog_options_menu").hide();

		var setNode = function(node,value) {
			if (value) {
				$(node).attr('checked','true');
			}
		};

		$('.inplace_dialog_options_menu').mouseenter(function(evt) {
			that.okToCloseOnMouseOut = true;
		});

		$('.inplace_dialog_options_menu').mouseleave(function(evt) {
			if (that.okToCloseOnMouseOut) {
				$('.inplace_dialog_options_menu').hide();
				that.focus(true);
				return false;
			}
		});

		setNode('input[name=show_all]',this._showAllOccurrences);
		setNode('input[name=case_sensitive]',!this._ignoreCase);
		setNode('input[name=wrap_search]',this._wrapSearch);
		setNode('input[name=incremental_search]',this._incremental);
		setNode('input[name=whole_word]',this._wholeWord);
		setNode('input[name=regular_expression]',this._useRegExp);
		setNode('input[name=find_after_replace]',this._findAfterReplace);

		$('input[name=show_all]').change(function() {
			that._showAllOccurrences = $(this).is(':checked');
		});
		$('#show_all_option').on('click',function(evt) {
			$('input[name=show_all]').trigger('click');
		});

		$('input[name=case_sensitive]').change(function() {
			that._ignoreCase = !$(this).is(':checked');
		});
		$('#case_sensitive_option').on('click',function(evt) {
			$('input[name=case_sensitive]').trigger('click');
		});

		$('input[name=wrap_search]').change(function() {
			that._wrapSearch = $(this).is(':checked');
		});
		$('#wrap_search_option').on('click',function(evt) {
			$('input[name=wrap_search]').trigger('click');
		});

		$('input[name=incremental_search]').change(function() {
			that._incremental = $(this).is(':checked');
		});
		$('#incremental_search_option').on('click',function(evt) {
			$('input[name=incremental_search]').trigger('click');
		});

		$('input[name=whole_word]').change(function() {
			that._wholeWord = $(this).is(':checked');
		});
		$('#whole_word_option').on('click',function(evt) {
			$('input[name=whole_word]').trigger('click');
		});

		$('input[name=regular_expression]').change(function() {
			that._useRegExp = $(this).is(':checked');
		});
		$('#regular_expression_option').on('click',function(evt) {
			$('input[name=regular_expression]').trigger('click');
		});

		$('input[name=find_after_replace]').change(function() {
			that._findAfterReplace = $(this).is(':checked');
		});
		$('#find_after_replace_option').on('click',function(evt) {
			$('input[name=find_after_replace]').trigger('click');
		});

		$("#options").on('click',function (evt) {
			var optionsMenu = $(".inplace_dialog_options_menu");
			if (optionsMenu.is(':visible')) {
				optionsMenu.hide();
				that.okToCloseOnMouseOut = false;
			} else {
				var pos =  $('#options').offset();
				var left = pos.left;
				optionsMenu.css("left",left);
				optionsMenu.css("top",pos.top+17);
				optionsMenu.show();
				that.okToCloseOnMouseOut = false;
			}
		});

		$(".defaulttext").focus(function() {
			if ($(this).val() === $(this)[0].title) {
			    $(this).removeClass("defaultTextActive");
			    $(this).val("");
			}
		});

		$(".defaulttext").blur(function() {
			if ($(this).val() === "") {
			    $(this).addClass("defaultTextActive");
			    $(this).val($(this)[0].title);
			}
		});

		$(".defaulttext").blur();

		if (selectionText) {
			$('#findtext').val(selectionText);
			$('#findtext').removeClass("defaultTextActive");
		} else if (this._lastSearchString && this._lastSearchString.length!==0) {
			$('#findtext').val(this._lastSearchString);
			$('#findtext').removeClass("defaultTextActive");
		}
		this.focus(true);

		// Handle ENTER and ESCAPE keypresses on the dialog
		$('#findtext').on('keydown.dialogs', function(evt) {
			return keydownHandler.bind(that)(evt,true);
		});
		$('#findtext').off('keyup.dialogs');
		$('#findtext').on('keyup.dialogs', function(evt) {
			return keyupHandler.bind(that)(evt);
		});

		$('#arrow_next').on('click',function(evt) {
			that.findNext(true);
		});
		$('#arrow_previous').on('click',function(evt) {
			that.findNext(false, null, true);
		});
    };

	return {
		openDialog: openDialog
	};
});

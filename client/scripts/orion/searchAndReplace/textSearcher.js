/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2011 IBM Corporation and others. All rights reserved.
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define window document navigator*/

define(['require', 'orion/textview/annotations', 'dojo', 'dijit', 'orion/commands', 'orion/editor/regex', 'orion/searchUtils', 'dijit/Menu', 'dijit/MenuItem', 'dijit/form/DropDownButton' ], 
	function(require, mAnnotations, dojo, dijit, mCommands, mRegex, mSearchUtils){
	
var orion = orion || {};

orion.TextSearcher = (function() {
	function TextSearcher(editor, cmdservice, undoStack, options) {
		this._editor = editor;
		this._commandService = cmdservice;
		this._undoStack = undoStack;
		
		this._showAllOccurrence = true;
		this._ignoreCase = true;
		this._wrapSearch = true;
		this._wholeWord = false;
		this._incremental = true;
		this._useRegExp = false;
		this._findAfterReplace = true;
		
		this._reverse = false;
		this.isMac = navigator.platform.indexOf("Mac") !== -1;
		
		this._searchRange = null;
		this._timer = null;
		this._searchOnRange = false;
		this._lastSearchString = "";
		var that = this;
		this._listeners = {
			onEditorFocus: function(e) {
				that.removeCurrentAnnotation(e);
			}
		};
		this.setOptions(options);
	}
	TextSearcher.prototype = {
		_createActionTable : function() {
			var that = this;
			this._commandService.openParameterCollector("pageNavigationActions", function(parentDiv) {
	
				// create the command span for Find
				var span = document.createElement('span');
				dojo.addClass(span, "parameters");
				span.id = "localSearchFindCommands";
				parentDiv.appendChild(span);
				// td.noWrap = true;
	
				// create the input box for searc hterm
				var searchStringDiv = document.createElement('input');
				searchStringDiv.type = "text";
				searchStringDiv.name = "Find:";
				searchStringDiv.id = "localSearchFindWith";
				searchStringDiv.placeholder="Find With";
				searchStringDiv.onkeyup = function(evt){
					return that._handleKeyUp(evt);
				};
				searchStringDiv.onkeydown = function(evt){
					return that._handleKeyDown(evt,true);
				};
				parentDiv.appendChild(searchStringDiv);
				
				// create replace text
				var replaceStringDiv = document.createElement('input');
				replaceStringDiv.type = "text";
				replaceStringDiv.name = "ReplaceWith:";
				replaceStringDiv.id = "localSearchReplaceWith";
				replaceStringDiv.placeholder="Replace With";
				dojo.addClass(replaceStringDiv, 'searchCmdGroupMargin');
				replaceStringDiv.onkeydown = function(evt){
					return that._handleKeyDown(evt, false);
				};
				parentDiv.appendChild(replaceStringDiv);
	
				// create the command span for Replace
				span = document.createElement('span');
				dojo.addClass(span, "parameters");
				span.id = "localSearchReplaceCommands";
				parentDiv.appendChild(span);
	
				// create all other span for commands : replace/find ,
				// replace all
				span = document.createElement('span');
				span.id = "localSearchOtherCommands";
				dojo.addClass(span, "parameters");
				parentDiv.appendChild(span);
	
				// create Options button , which will bring a dialog
				var optionTd = document.createElement('span');
				dojo.addClass(optionTd, "parameters");

				// td.noWrap = true;
				parentDiv.appendChild(optionTd);
	
				var optionMenu = dijit.byId("searchOptMenu");
				if (optionMenu) {
					optionMenu.destroy();
				}
				var newMenu = new dijit.Menu({
					style : "display: none;",
					id : "searchOptMenu"
				});
				
				newMenu.addChild(new dijit.CheckedMenuItem({
					label: "Show all",
					checked: that._showAllOccurrence,
					onChange : function(checked) {
						that.setOptions({showAllOccurrence: checked});
						if(checked){
							that.markAllOccurrences(true);
						} else {
							var annotationModel = that._editor.getAnnotationModel();
							if(annotationModel){
								annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_MATCHING_SEARCH);
							}
						}
					}
				}));
				
				newMenu.addChild(new dijit.CheckedMenuItem({
					label: "Case sensitive",
					checked: !that._ignoreCase,
					onChange : function(checked) {
						that.setOptions({ignoreCase: !checked});
					}
				}));
				
				newMenu.addChild(new dijit.CheckedMenuItem({
					label: "Wrap search",
					checked: that._wrapSearch,
					onChange : function(checked) {
						that.setOptions({wrapSearch: checked});
					}
				}));
				newMenu.addChild(new dijit.CheckedMenuItem({
					label: "Incremental search",
					checked: that._incremental,
					onChange : function(checked) {
						that.setOptions({incremental: checked});
					}
				}));
				
				newMenu.addChild(new dijit.CheckedMenuItem({
					label: "Whole Word",
					checked: that._wholeWord,
					onChange : function(checked) {
						that.setOptions({wholeWord: checked});
					}
				}));
				
				newMenu.addChild(new dijit.CheckedMenuItem({
					label: "Regular expression",
					checked: that._useRegExp,
					onChange : function(checked) {
						that.setOptions({useRegExp: checked});
					}
				}));
				
				newMenu.addChild(new dijit.CheckedMenuItem({
					label: "Find after replace",
					checked: that._findAfterReplace,
					onChange : function(checked) {
						that.setOptions({findAfterReplace: checked});
					}
				}));
				
				var menuButton = new dijit.form.DropDownButton({
					label : "Options",
					dropDown : newMenu
				});
				dojo.addClass(menuButton.domNode, "parametersMenu");
				dojo.place(menuButton.domNode, optionTd, "last");
			},
			function(){that.closeUI();});
		},
		
		visible: function(){
			return document.getElementById("localSearchFindWith") ? true : false;
		},
		
		_handleKeyUp: function(evt){
			if(this._incremental && !this._keyUpHandled){
				this.findNext(true, null, true);
			}
			this._keyUpHandled = false;
			return true;
		},
		
		_handleKeyDown: function(evt, fromSearch){
			var ctrlKey = this.isMac ? evt.metaKey : evt.ctrlKey;
			if(ctrlKey &&  evt.keyCode === 70/*"f"*/ ) {
				this._keyUpHandled = fromSearch;
				if( evt.stopPropagation ) { 
					evt.stopPropagation(); 
				}
				evt.cancelBubble = true;
				return false;
			}
			if((ctrlKey &&  evt.keyCode === 75/*"k"*/ ) || evt.keyCode === 13/*enter*/ ){
				if( evt.stopPropagation ) { 
					evt.stopPropagation(); 
				}
				evt.cancelBubble = true;
				this.findNext(!evt.shiftKey);
				this._keyUpHandled = fromSearch;
				return false;
			}
			if( ctrlKey &&  evt.keyCode === 82 /*"r"*/){
				if( evt.stopPropagation ) { 
					evt.stopPropagation(); 
				}
				evt.cancelBubble = true;
				if(!fromSearch) {
					this.replace();
				}
				this._keyUpHandled = fromSearch;
				return false;
			}
			if( evt.keyCode === 27/*ESC*/ ){
				this.closeUI();
				this._keyUpHandled = fromSearch;
				return false;
			}
			return true;
		},
		
		closeUI : function() {
			if(this.visible()){
				this._commandService.closeParameterCollector();
			}
			this._editor.getTextView().removeEventListener("Focus", this._listeners.onEditorFocus);
			this._editor.getTextView().focus();
			var annotationModel = this._editor.getAnnotationModel();
			if (annotationModel) {
				annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_CURRENT_SEARCH);
				annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_MATCHING_SEARCH);
			}
			// TODO dirty, should be a callback
			/*
			var wh = $(window).height();
			    var ww = $(window).width();
			    // What needs fitting into the space?
			    // the navigator/editor and lower pane
			    var editorElement = $("#editor");
			    editorElement.offset({top:28,left:200});
			    editorElement.width(ww-200);
			    editorElement.height(wh-28-16);
			    console.log("closing");
			*/
		},

		removeCurrentAnnotation: function(evt){
			var annotationModel = this._editor.getAnnotationModel();
			if (annotationModel) {
				annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_CURRENT_SEARCH);
			}
		},
		
		buildToolBar : function(defaultSearchStr) {
			this._keyUpHandled = true;
			var that = this;
			this._editor.getTextView().addEventListener("Focus", this._listeners.onEditorFocus);
			var findDiv = document.getElementById("localSearchFindWith");
			if (this.visible()) {
				if(defaultSearchStr.length > 0){
					findDiv.value = defaultSearchStr;
				}
				window.setTimeout(function() {
						findDiv.select();
						findDiv.focus();
				}, 10);				
				return;
			}
			this._createActionTable();

			// set the default value of search string
			findDiv = document.getElementById("localSearchFindWith");
			findDiv.value = defaultSearchStr;
			window.setTimeout(function() {
				findDiv.select();
				findDiv.focus();
			}, 10);				

			var findNextCommand = new mCommands.Command({
				tooltip : "Find next match",
				imageClass : "core-sprite-move_down",
				id : "orion.search.findNext",
				groupId : "orion.searchGroup",
				callback : function() {
					that.findNext(true);
				}
			});

			var findPrevCommand = new mCommands.Command({
				tooltip : "Find previous match",
				imageClass : "core-sprite-move_up",
				id : "orion.search.findPrev",
				groupId : "orion.searchGroup",
				callback : function() {
					that.findNext(false);
				}
			});

			var replaceCommand = new mCommands.Command({
				name : "Replace",
				image : require.toUrl("images/replace.gif"),
				id : "orion.search.replace",
				groupId : "orion.searchGroup",
				callback : function() {
					that.replace();
				}
			});

			var replaceAllCommand = new mCommands.Command({
				name : "Replace All",
				image : require.toUrl("images/replaceAll.gif"),
				id : "orion.search.replaceAll",
				groupId : "orion.searchGroup",
				callback : function() {
					that.replaceAll();
				}
			});

			this._commandService.addCommand(findNextCommand);
			this._commandService.addCommand(findPrevCommand);
			this._commandService.addCommand(replaceCommand);
			this._commandService.addCommand(replaceAllCommand);

			// Register command contributions
			this._commandService.registerCommandContribution("localSearchFindCommands", "orion.search.findNext", 1);
			this._commandService.registerCommandContribution("localSearchFindCommands", "orion.search.findPrev", 2);
			this._commandService.registerCommandContribution("localSearchReplaceCommands", "orion.search.replace", 1);
			this._commandService.registerCommandContribution("localSearchReplaceCommands", "orion.search.replaceAll", 2);
			this._commandService.renderCommands("localSearchFindCommands", "localSearchFindCommands", that, that, "button");
			this._commandService.renderCommands("localSearchReplaceCommands", "localSearchReplaceCommands", that, that, "button");
		},

		setOptions : function(options) {
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
		},

		getSearchStartIndex: function(reverse, flag) {
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
		},
		
		findNext : function(next, searchStr, incremental) {
			this.setOptions({
				reverse : !next
			});
			var findTextDiv = document.getElementById("localSearchFindWith");
			var startIndex = this.getSearchStartIndex(incremental ? true : !next);
			if(!searchStr){
				searchStr = findTextDiv ? findTextDiv.value : this._lastSearchString;
			}
			return this._doFind(searchStr, startIndex, !next, this._wrapSearch);
		},

		startUndo: function() {
			if (this._undoStack) {
				this._undoStack.startCompoundChange();
			}
		}, 
		
		endUndo: function() {
			if (this._undoStack) {
				this._undoStack.endCompoundChange();
			}
		}, 
	
		replace: function() {
			this.startUndo();
			var newStr = document.getElementById("localSearchReplaceWith").value;
			var editor = this._editor;
			var selection = editor.getSelection();
			editor.setText(newStr, selection.start, selection.end);
			editor.setSelection(selection.start , selection.start + newStr.length, true);
			this.endUndo();
			var searchStr = document.getElementById("localSearchFindWith").value;
			if (this._findAfterReplace && searchStr){
				this._doFind(searchStr, this.getSearchStartIndex(false), false, this._wrapSearch);
			}
		},
		
		_doFind: function(searchStr, startIndex, reverse, wrapSearch) {
			var editor = this._editor;
			var annotationModel = editor.getAnnotationModel();
			if(!searchStr){
				if(annotationModel){
					annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_CURRENT_SEARCH);
					annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_MATCHING_SEARCH);
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
				var visible = this.visible();
				if (visible) {
					var type = mAnnotations.AnnotationType.ANNOTATION_CURRENT_SEARCH;
					if (annotationModel) {
						annotationModel.removeAnnotations(type);
						if (result) {
							annotationModel.addAnnotation(mAnnotations.AnnotationType.createAnnotation(type, result.start, result.end));
						}
					}
					if(this._showAllOccurrence){
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
			}
			if (result) {
				editor.moveSelection(result.start, result.end, null, false);
			}
			return result;
		},

		replaceAll : function() {
			var searchStr = document.getElementById("localSearchFindWith").value;
			if(searchStr){
				this._replacingAll = true;
				var editor = this._editor;
				editor.reportStatus("");
				editor.reportStatus("Replacing all...", "progress");
				var newStr = document.getElementById("localSearchReplaceWith").value;
				window.setTimeout(dojo.hitch(this, function() {
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
				}), 100);				
				
			}
		},
		
		markAllOccurrences: function(singleResult) {
			var annotationModel = this._editor.getAnnotationModel();
			if(!annotationModel){
				return;
			}
			var type = mAnnotations.AnnotationType.ANNOTATION_MATCHING_SEARCH;
			var iter = annotationModel.getAnnotations(0, annotationModel.getTextModel().getCharCount());
			var remove = [], add;
			while (iter.hasNext()) {
				var annotation = iter.next();
				if (annotation.type === type) {
					remove.push(annotation);
				}
			}
			
			var localSearchFindWith = document.getElementById("localSearchFindWith");
			var searchStr = (localSearchFindWith) ? localSearchFindWith.value : "";
			
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
					add.push(mAnnotations.AnnotationType.createAnnotation(type, match.start, match.end));
				}
			}
			annotationModel.replaceAnnotations(remove, add);
		}
	};
	return TextSearcher;
}());

return orion;
});

/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define */
/*jslint maxerr:150 browser:true devel:true */

define("orion/editor/editorFeatures", ['i18n!orion/editor/nls/messages', 'orion/textview/undoStack', 'orion/textview/keyBinding', //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	'orion/textview/rulers', 'orion/textview/annotations', 'orion/textview/tooltip', 'orion/textview/textDND', 'orion/editor/regex', 'orion/textview/util', //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	'scripted/dialogs/gotoLineDialog', 'scripted/keybindings/keybinder'],
function(messages, mUndoStack, mKeyBinding, mRulers, mAnnotations, mTooltip, mTextDND, mRegex, util,
	mGotoLineDialog, mKeybinder) {

	function UndoFactory() {
	}
	UndoFactory.prototype = {
		createUndoStack: function(editor) {
			var textView = editor.getTextView();
			var undoStack =  new mUndoStack.UndoStack(textView, 200);
			// SCRIPTED - the new editor doesn't have this line in, who binds it?
			// textView.setKeyBinding(new mKeyBinding.KeyBinding('z', true), "undo");
			textView.setAction("undo", function() { //$NON-NLS-0$
				undoStack.undo();
				return true;
			}, {name: messages.undo});
			
			// SCRIPTED - the new editor doesn't have these two lines, who binds them?
			// var isMac = navigator.platform.indexOf("Mac") !== -1;
			// textView.setKeyBinding(isMac ? new mKeyBinding.KeyBinding('z', true, true) : new mKeyBinding.KeyBinding('y', true), "Redo");
			textView.setAction("redo", function() { //$NON-NLS-0$
				undoStack.redo();
				return true;
			}, {name: messages.redo});
			return undoStack;
		}
	};

	function LineNumberRulerFactory() {
	}
	LineNumberRulerFactory.prototype = {
		createLineNumberRuler: function(annotationModel) {
			return new mRulers.LineNumberRuler(annotationModel, "left", {styleClass: "ruler lines"}, {styleClass: "rulerLines odd"}, {styleClass: "rulerLines even"}); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		}
	};
	
	function FoldingRulerFactory() {
	}
	FoldingRulerFactory.prototype = {
		createFoldingRuler: function(annotationModel) {
			return new mRulers.FoldingRuler(annotationModel, "left", {styleClass: "ruler folding"}); //$NON-NLS-1$ //$NON-NLS-0$
		}
	};
	
	function AnnotationFactory() {
	}
	AnnotationFactory.prototype = {
		createAnnotationModel: function(model) {
			return new mAnnotations.AnnotationModel(model);
		},
		createAnnotationStyler: function(annotationModel, view) {
			return new mAnnotations.AnnotationStyler(annotationModel, view);
		},
		createAnnotationRulers: function(annotationModel) {
			var annotationRuler = new mRulers.AnnotationRuler(annotationModel, "left", {styleClass: "ruler annotations"}); //$NON-NLS-1$ //$NON-NLS-0$
			var overviewRuler = new mRulers.OverviewRuler(annotationModel, "right", {styleClass: "ruler overview"}); //$NON-NLS-1$ //$NON-NLS-0$
			return {annotationRuler: annotationRuler, overviewRuler: overviewRuler};
		}
	};
	
	function TextDNDFactory() {
	}
	TextDNDFactory.prototype = {
		createTextDND: function(editor, undoStack) {
			return new mTextDND.TextDND(editor.getTextView(), undoStack);
		}
	};

	/**
	 * TextCommands connects common text editing keybindings onto an editor.
	 */
	function TextActions(editor, undoStack, searcher) {
		this.editor = editor;
		this.textView = editor.getTextView();
		this.undoStack = undoStack;
		this._incrementalFindActive = false;
		this._incrementalFindSuccess = true;
		this._incrementalFindIgnoreSelection = false;
		this._incrementalFindPrefix = "";
		this._searcher =  searcher;
		this._lastEditLocation = null;
		this.init();
	}
	TextActions.prototype = {
		init: function() {
			var self = this;
			this._incrementalFindListener = {
				onVerify: function(e){
					var editor = self.editor;
					var model = editor.getModel();
					var start = editor.mapOffset(e.start), end = editor.mapOffset(e.end);
					var txt = model.getText(start, end);
					var prefix = self._incrementalFindPrefix;
					// TODO: mRegex is pulled in just for this one call so we can get case-insensitive search
					// is it really necessary
					var match = prefix.match(new RegExp("^" + mRegex.escape(txt), "i")); //$NON-NLS-1$ //$NON-NLS-0$
					if (match && match.length > 0) {
						prefix = self._incrementalFindPrefix += e.text;
						self.editor.reportStatus(util.formatMessage(messages.incrementalFind, prefix));
						var searchStart = editor.getSelection().start;
						var result = editor.getModel().find({
							string: prefix,
							start: searchStart,
							caseInsensitive: prefix.toLowerCase() === prefix}).next();
						if (result) {
							self._incrementalFindSuccess = true;
							self._incrementalFindIgnoreSelection = true;
							editor.moveSelection(result.start, result.end);
							self._incrementalFindIgnoreSelection = false;
						} else {
							editor.reportStatus(util.formatMessage(messages.incrementalFindNotFound, prefix), "error"); //$NON-NLS-0$
							self._incrementalFindSuccess = false;
						}
						e.text = null;
					} else {
					}
				},
				onSelection: function() {
					if (!self._incrementalFindIgnoreSelection) {
						self.toggleIncrementalFind();
					}
				}
			};
			
			this._lastEditListener = {
				onModelChanged: function(e) {
					if (self.editor.isDirty()) {
						self._lastEditLocation = e.start + e.addedCharCount;
					}
				}
			};
			this.textView.addEventListener("ModelChanged", this._lastEditListener.onModelChanged); //$NON-NLS-0$
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("k", true), "findNext"); //$NON-NLS-1$ //$NON-NLS-0$
			this.textView.setAction("findNext", function() { //$NON-NLS-0$
				if (this._searcher){
					var selection = this.textView.getSelection();
					if(selection.start < selection.end) {
						this._searcher.findNext(true, this.textView.getText(selection.start, selection.end));
					} else {
						this._searcher.findNext(true);
					}
					return true;
				}
				return false;
			}.bind(this), {name: messages.findNext});
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("k", true, true), "findPrevious"); //$NON-NLS-1$ //$NON-NLS-0$
			this.textView.setAction("findPrevious", function() { //$NON-NLS-0$
				if (this._searcher){
					var selection = this.textView.getSelection();
					if(selection.start < selection.end) {
						this._searcher.findNext(false, this.textView.getText(selection.start, selection.end));
					} else {
						this._searcher.findNext(false);
					}
					return true;
				}
				return false;
			}.bind(this), {name: messages.findPrevious});
	
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("j", true), "incrementalFind"); //$NON-NLS-1$ //$NON-NLS-0$
			this.textView.setAction("incrementalFind", function() { //$NON-NLS-0$
				if (this._searcher && this._searcher.visible()) {
					return true;
				}
				var editor = this.editor;
				if (!this._incrementalFindActive) {
					editor.setCaretOffset(editor.getCaretOffset());
					this.toggleIncrementalFind();
				} else {
					var prefix = this._incrementalFindPrefix;
					if (prefix.length !== 0) {
						var result;
						var searchStart = 0;
						if (this._incrementalFindSuccess) {
							searchStart = editor.getSelection().start + 1;
						}
						result = editor.getModel().find({
							string: prefix,
							start: searchStart,
							caseInsensitive: prefix.toLowerCase() === prefix}).next();
						if (result) {
							this._incrementalFindSuccess = true;
							this._incrementalFindIgnoreSelection = true;
							editor.moveSelection(result.start, result.end);
							this._incrementalFindIgnoreSelection = false;
							editor.reportStatus(util.formatMessage(messages.incrementalFind, prefix));
						} else {
							editor.reportStatus(util.formatMessage(messages.incrementalFindNotFound, prefix), "error"); //$NON-NLS-0$
							this._incrementalFindSuccess = false;
						}
					}
				}
				return true;
			}.bind(this), {name: messages.incrementalFindKey});
			this.textView.setAction("deletePrevious", function() { //$NON-NLS-0$
				if (this._incrementalFindActive) {
					var editor = this.editor;
					var prefix = this._incrementalFindPrefix;
					prefix = this._incrementalFindPrefix = prefix.substring(0, prefix.length-1);
					if (prefix.length===0) {
						this._incrementalFindSuccess = true;
						this._incrementalFindIgnoreSelection = true;
						editor.setCaretOffset(editor.getSelection().start);
						this._incrementalFindIgnoreSelection = false;
						this.toggleIncrementalFind();
						return true;
					}
					editor.reportStatus(util.formatMessage(messages.incrementalFind, prefix));
					var result = editor.getModel().find({
						string: prefix,
						start: editor.getCaretOffset() - prefix.length - 1,
						reverse: true,
						caseInsensitive: prefix.toLowerCase() === prefix}).next();
					if (result) {
						this._incrementalFindSuccess = true;
						this._incrementalFindIgnoreSelection = true;
						editor.moveSelection(result.start,result.end);
						this._incrementalFindIgnoreSelection = false;
					} else {
						editor.reportStatus(util.formatMessage(messages.incrementalFindNotFound, prefix), "error"); //$NON-NLS-0$
					}
					return true;
				}
				return false;
			}.bind(this));
			
			this.textView.setAction("tab", function() { //$NON-NLS-0$
				if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
				if(!this.textView.getOptions("tabMode")) { return; } //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				if (firstLine !== lastLine) {
					// SCRIPTED - modified not to indent lines that don't have anything on them. Just for SA
					// SCRIPTED - these two lines commented out
//					var lines = [];
//					lines.push("");
					var lineStart = model.getLineStart(firstLine);
					var lineEnd = model.getLineEnd(lastLine, true);
					var options = this.textView.getOptions("tabSize", "expandTab"); //$NON-NLS-1$ //$NON-NLS-0$
					var text = options.expandTab ? new Array(options.tabSize + 1).join(" ") : "\t"; //$NON-NLS-1$ //$NON-NLS-0$

					// SCRIPTED was
					/*{
					editor.setText(lines.join(text), lineStart, lineEnd);
					editor.setSelection(lineStart === selection.start ? selection.start : selection.start + text.length, selection.end + ((lastLine - firstLine + 1) * text.length));
					}*/
					// now:
					var newtext = "";
					var line;
					var indents = 0;
					var indentforfirstline = "";
					for (var i = firstLine; i <= lastLine; i++) {
						line = model.getLine(i,true);
						if (line.length!==0 && !(line.charCodeAt(0)===10 || line.charCodeAt(0)===13)) {
							newtext = newtext + text + line;
							if (i===firstLine) {
								indentforfirstline = text;
							}
							indents++;
						} else {
							newtext = newtext + line;
						}
//						lines.push(model.getLine(i, true));
					}

					editor.setText(newtext/*lines.join(text)*/, lineStart, lineEnd);
//					editor.setSelection(lineStart === selection.start ? selection.start : selection.start + text.length, selection.end + ((lastLine - firstLine + 1) * text.length));
					editor.setSelection(lineStart === selection.start ? selection.start : selection.start + indentforfirstline.length, selection.end + (indents* text.length));
					// SCRIPTED end
					return true;
				}
				
				var keyModes = editor.getKeyModes();
				for (var j = 0; j < keyModes.length; j++) {
					if (keyModes[j].isActive()) {
						return keyModes[j].tab();
					}
				}
				
				return false;
			}.bind(this));
	
			this.textView.setAction("shiftTab", function() { //$NON-NLS-0$
				if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
				if(!this.textView.getOptions("tabMode")) { return; } //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				var tabSize = this.textView.getOptions("tabSize"); //$NON-NLS-0$
				var spaceTab = new Array(tabSize + 1).join(" "); //$NON-NLS-0$
				var lines = [], removeCount = 0, firstRemoveCount = 0;
				for (var i = firstLine; i <= lastLine; i++) {
					var line = model.getLine(i, true);
					if (model.getLineStart(i) !== model.getLineEnd(i)) {
						if (line.indexOf("\t") === 0) { //$NON-NLS-0$
							line = line.substring(1);
							removeCount++;
						} else if (line.indexOf(spaceTab) === 0) {
							line = line.substring(tabSize);
							removeCount += tabSize;
						} else {
							return true;
						}
					}
					if (i === firstLine) {
						firstRemoveCount = removeCount;
					}
					lines.push(line);
				}
				var lineStart = model.getLineStart(firstLine);
				var lineEnd = model.getLineEnd(lastLine, true);
				var lastLineStart = model.getLineStart(lastLine);
				editor.setText(lines.join(""), lineStart, lineEnd);
				// SCRIPTED
				/*was{
				var start = lineStart === selection.start ? selection.start : selection.start - firstRemoveCount;
				var end = Math.max(start, selection.end - removeCount + (selection.end === lastLineStart+1 && selection.start !== selection.end ? 1 : 0));
				editor.setSelection(start, end);
				}*/
				// if the current selection was at the start of the line, it will not need moving:
				var startpos = lineStart === selection.start ? selection.start: selection.start - firstRemoveCount;
				var endpos = -1;
				if (selection.end===selection.start) {
					// no real current selection and caret at line start, don't move the end position
					endpos = startpos;
				} else {
					// still a little bit cryptic what this first clause does?
					if (lastLine!==firstLine) {
						endpos = selection.end - removeCount + (selection.end === lastLineStart+1 ? 1 : 0);
					} else {
						endpos = selection.end - removeCount;
					}
				}
				// SCRIPTED end
				editor.setSelection(startpos,endpos);
				return true;
			}.bind(this), {name: messages.unindentLines});
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(38, false, false, true), "moveLinesUp"); //$NON-NLS-0$
			this.textView.setAction("moveLinesUp", function() { //$NON-NLS-0$
				if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var firstLine = model.getLineAtOffset(selection.start);
				if (firstLine === 0) {
					return true;
				}
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				var lineCount = model.getLineCount();
				var insertOffset = model.getLineStart(firstLine - 1);
				var lineStart = model.getLineStart(firstLine);
				var lineEnd = model.getLineEnd(lastLine, true);
				var text = model.getText(lineStart, lineEnd);
				var delimiterLength = 0;
				if (lastLine === lineCount-1) {
					// Move delimiter preceding selection to end of text
					var delimiterStart = model.getLineEnd(firstLine - 1);
					var delimiterEnd = model.getLineEnd(firstLine - 1, true);
					text += model.getText(delimiterStart, delimiterEnd);
					lineStart = delimiterStart;
					delimiterLength = delimiterEnd - delimiterStart;
				}
				this.startUndo();
				editor.setText("", lineStart, lineEnd);
				editor.setText(text, insertOffset, insertOffset);
				editor.setSelection(insertOffset, insertOffset + text.length - delimiterLength);
				this.endUndo();
				return true;
			}.bind(this), {name: messages.moveLinesUp});
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(40, false, false, true), "moveLinesDown"); //$NON-NLS-0$
			this.textView.setAction("moveLinesDown", function() { //$NON-NLS-0$
				if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				var lineCount = model.getLineCount();
				if (lastLine === lineCount-1) {
					return true;
				}
				var lineStart = model.getLineStart(firstLine);
				var lineEnd = model.getLineEnd(lastLine, true);
				var insertOffset = model.getLineEnd(lastLine+1, true) - (lineEnd - lineStart);
				var text, delimiterLength = 0;
				if (lastLine !== lineCount-2) {
					text = model.getText(lineStart, lineEnd);
				} else {
					// Move delimiter following selection to front of the text
					var lineEndNoDelimiter = model.getLineEnd(lastLine);
					text = model.getText(lineEndNoDelimiter, lineEnd) + model.getText(lineStart, lineEndNoDelimiter);
					delimiterLength += lineEnd - lineEndNoDelimiter;
				}
				this.startUndo();
				editor.setText("", lineStart, lineEnd);
				editor.setText(text, insertOffset, insertOffset);
				editor.setSelection(insertOffset + delimiterLength, insertOffset + delimiterLength + text.length);
				this.endUndo();
				return true;
			}.bind(this), {name: messages.moveLinesDown});
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(38, true, false, true), "copyLinesUp"); //$NON-NLS-0$
			this.textView.setAction("copyLinesUp", function() { //$NON-NLS-0$
				if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				var lineStart = model.getLineStart(firstLine);
				var lineEnd = model.getLineEnd(lastLine, true);
				var lineCount = model.getLineCount();
				var delimiter = "";
				var text = model.getText(lineStart, lineEnd);
				if (lastLine === lineCount-1) {
					text += (delimiter = model.getLineDelimiter());
				}
				var insertOffset = lineStart;
				editor.setText(text, insertOffset, insertOffset);
				editor.setSelection(insertOffset, insertOffset + text.length - delimiter.length);
				return true;
			}.bind(this), {name: messages.copyLinesUp});
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(40, true, false, true), "copyLinesDown"); //$NON-NLS-0$
			this.textView.setAction("copyLinesDown", function() { //$NON-NLS-0$
				if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				var lineStart = model.getLineStart(firstLine);
				var lineEnd = model.getLineEnd(lastLine, true);
				var lineCount = model.getLineCount();
				var delimiter = "";
				var text = model.getText(lineStart, lineEnd);
				if (lastLine === lineCount-1) {
					text = (delimiter = model.getLineDelimiter()) + text;
				}
				var insertOffset = lineEnd;
				editor.setText(text, insertOffset, insertOffset);
				editor.setSelection(insertOffset + delimiter.length, insertOffset + text.length);
				return true;
			}.bind(this), {name: messages.copyLinesDown});
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding('d', true, false, false), "deleteLines"); //$NON-NLS-1$ //$NON-NLS-0$
			this.textView.setAction("deleteLines", function() { //$NON-NLS-0$
				if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
				var editor = this.editor;
				var selection = editor.getSelection();
				var model = editor.getModel();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				var lineStart = model.getLineStart(firstLine);
				var lineEnd = model.getLineEnd(lastLine, true);
				editor.setText("", lineStart, lineEnd);
				return true;
			}.bind(this), {name: messages.deleteLines});
			
			// Go To Line action
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("l", true), "gotoLine"); //$NON-NLS-1$ //$NON-NLS-0$
			this.textView.setAction("gotoLine", function() { //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var line = model.getLineAtOffset(editor.getCaretOffset());
				// SCRIPTED - TODO - use the prompt approach and plug the dialog into the right place instead of here
				/*was{
				line = prompt(messages.gotoLinePrompty, line + 1);
				if (line) {
					line = parseInt(line, 10);
					editor.onGotoLine(line - 1, 0);
				}
				
				}*/
				// now:
				mGotoLineDialog.openDialog(line+1,function(line) {
					editor.onGotoLine(line - 1, 0);
				});
				// SCRIPTED end
				return true;
			}.bind(this), {name: messages.gotoLine});
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(190, true), "nextAnnotation"); //$NON-NLS-0$
			this.textView.setAction("nextAnnotation", function() { //$NON-NLS-0$
				var editor = this.editor;
				var annotationModel = editor.getAnnotationModel();
				if(!annotationModel) { return true; }
				var model = editor.getModel();
				var currentOffset = editor.getCaretOffset();
				var annotations = annotationModel.getAnnotations(currentOffset, model.getCharCount());
				while(annotations.hasNext()) {
					var annotation = annotations.next();
					if(annotation.start <= currentOffset) { continue; }
					if(annotation.type !== mAnnotations.AnnotationType.ANNOTATION_ERROR && 
					   annotation.type !== mAnnotations.AnnotationType.ANNOTATION_WARNING && 
					   annotation.type !== mAnnotations.AnnotationType.ANNOTATION_TASK && 
					   annotation.type !== mAnnotations.AnnotationType.ANNOTATION_BOOKMARK) { continue; }
					var tooltip = mTooltip.Tooltip.getTooltip(this.textView);
					if (!tooltip) { 
						editor.moveSelection(annotation.start);
						return true;
					}
					var nextLine = model.getLineAtOffset(annotation.start);
					var view = this.textView;
					var callback = function() {
						setTimeout( function() {
							tooltip.setTarget({
								getTooltipInfo: function() {
									var tooltipCoords = view.convert({x: view.getLocationAtOffset(annotation.start).x, 
																	  y: view.getLocationAtOffset(model.getLineStart(nextLine)).y},
																	  "document", "page"); //$NON-NLS-1$ //$NON-NLS-0$
									return { contents: [annotation],
											 x: tooltipCoords.x,
											 y: tooltipCoords.y + Math.floor(view.getLineHeight(nextLine) * 1.33)
										   };
								}
							}, 0);
						}, 0);
					};
					editor.moveSelection(annotation.start, annotation.start, callback);
					break;
				}
				return true;
			}.bind(this), {name: messages.nextAnnotation});
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(188, true), "previousAnnotation"); //$NON-NLS-0$
			this.textView.setAction("previousAnnotation", function() { //$NON-NLS-0$
				var editor = this.editor;
				var annotationModel = editor.getAnnotationModel();
				if(!annotationModel) { return true; }
				var model = editor.getModel();
				var currentOffset = editor.getCaretOffset();
				var annotations = annotationModel.getAnnotations(0, currentOffset);
				var previousAnnotation = null;
				while(annotations.hasNext()) {
					var annotation = annotations.next();
					if(annotation.start >= currentOffset) { continue; }
					if(annotation.type !== mAnnotations.AnnotationType.ANNOTATION_ERROR && 
					   annotation.type !== mAnnotations.AnnotationType.ANNOTATION_WARNING && 
					   annotation.type !== mAnnotations.AnnotationType.ANNOTATION_TASK && 
					   annotation.type !== mAnnotations.AnnotationType.ANNOTATION_BOOKMARK) { continue; }
					previousAnnotation = annotation;
				}
				if(previousAnnotation) {
					var nextLine = model.getLineAtOffset(previousAnnotation.start);
					var tooltip = mTooltip.Tooltip.getTooltip(this.textView);
					if (!tooltip) {
						editor.moveSelection(previousAnnotation.start);
						return true;
					}
					var view = this.textView;
					var callback = function() {
						setTimeout( function() {
							tooltip.setTarget({
								getTooltipInfo: function() {
									var tooltipCoords = view.convert({x: view.getLocationAtOffset(previousAnnotation.start).x, 
																	  y: view.getLocationAtOffset(model.getLineStart(nextLine)).y},
																	  "document", "page"); //$NON-NLS-1$ //$NON-NLS-0$
									return { contents: [previousAnnotation],
											 x: tooltipCoords.x,
											 y: tooltipCoords.y + Math.floor(view.getLineHeight(nextLine) * 1.33)
										   };
								}
							}, 0);
						}, 0);
					};
					editor.moveSelection(previousAnnotation.start, previousAnnotation.start, callback);
				}
				return true;
			}.bind(this), {name: messages.prevAnnotation});
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("e", true, false, true, false), "expand"); //$NON-NLS-1$ //$NON-NLS-0$
			this.textView.setAction("expand", function() { //$NON-NLS-0$
				var editor = this.editor;
				var annotationModel = editor.getAnnotationModel();
				if(!annotationModel) { return true; }
				var model = editor.getModel();
				var currentOffset = editor.getCaretOffset();
				var lineIndex = model.getLineAtOffset(currentOffset);
				var start = model.getLineStart(lineIndex);
				var end = model.getLineEnd(lineIndex, true);
				if (model.getBaseModel) {
					start = model.mapOffset(start);
					end = model.mapOffset(end);
					model = model.getBaseModel();
				}
				var annotation, iter = annotationModel.getAnnotations(start, end);
				while (!annotation && iter.hasNext()) {
					var a = iter.next();
					if (a.type !== mAnnotations.AnnotationType.ANNOTATION_FOLDING) { continue; }
					if (a.expanded) { continue; }
					annotation = a;
				}
				if (annotation && !annotation.expanded) {
					annotation.expand();
					annotationModel.modifyAnnotation(annotation);
				}
				return true;
			}.bind(this), {name: messages.expand});
	
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("c", true, false, true, false), "collapse"); //$NON-NLS-1$ //$NON-NLS-0$
				this.textView.setAction("collapse", function() { //$NON-NLS-0$
				var editor = this.editor;
				var annotationModel = editor.getAnnotationModel();
				if(!annotationModel) { return true; }
				var model = editor.getModel();
				var currentOffset = editor.getCaretOffset();
				var lineIndex = model.getLineAtOffset(currentOffset);
				var start = model.getLineStart(lineIndex);
				var end = model.getLineEnd(lineIndex, true);
				if (model.getBaseModel) {
					start = model.mapOffset(start);
					end = model.mapOffset(end);
					model = model.getBaseModel();
				}
				var annotation, iter = annotationModel.getAnnotations(start, end);
				while (!annotation && iter.hasNext()) {
					var a = iter.next();
					if (a.type !== mAnnotations.AnnotationType.ANNOTATION_FOLDING) { continue; }
					annotation = a;
				}
				if (annotation && annotation.expanded) {
					editor.setCaretOffset(annotation.start);
					annotation.collapse();
					annotationModel.modifyAnnotation(annotation);
				}
				return true;
			}.bind(this), {name: messages.collapse});
	
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("e", true, true, true, false), "expandAll"); //$NON-NLS-1$ //$NON-NLS-0$
			this.textView.setAction("expandAll", function() { //$NON-NLS-0$
				var editor = this.editor;
				var annotationModel = editor.getAnnotationModel();
				if(!annotationModel) { return true; }
				var model = editor.getModel();
				var annotation, iter = annotationModel.getAnnotations(0, model.getCharCount());
				this.textView.setRedraw(false);
				while (iter.hasNext()) {
					annotation = iter.next();
					if (annotation.type !== mAnnotations.AnnotationType.ANNOTATION_FOLDING) { continue; }
					if (!annotation.expanded) {
						annotation.expand();
						annotationModel.modifyAnnotation(annotation);
					}
				}
				this.textView.setRedraw(true);
				return true;
			}.bind(this), {name: messages.expandAll});
	
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("c", true, true, true, false), "collapseAll"); //$NON-NLS-1$ //$NON-NLS-0$
			this.textView.setAction("collapseAll", function() { //$NON-NLS-0$
				var editor = this.editor;
				var annotationModel = editor.getAnnotationModel();
				if(!annotationModel) { return true; }
				var model = editor.getModel();
				var annotation, iter = annotationModel.getAnnotations(0, model.getCharCount());
				this.textView.setRedraw(false);
				while (iter.hasNext()) {
					annotation = iter.next();
					if (annotation.type !== mAnnotations.AnnotationType.ANNOTATION_FOLDING) { continue; }
					if (annotation.expanded) {
						annotation.collapse();
						annotationModel.modifyAnnotation(annotation);
					}
				}
				this.textView.setRedraw(true);
				return true;
			}.bind(this), {name: messages.collapseAll});
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("q", !util.isMac, false, false, util.isMac), "lastEdit"); //$NON-NLS-1$ //$NON-NLS-0$
			this.textView.setAction("lastEdit", function() { //$NON-NLS-0$
				if (typeof this._lastEditLocation === "number")  { //$NON-NLS-0$
					this.editor.showSelection(this._lastEditLocation);
				}
				return true;
			}.bind(this), {name: messages.lastEdit});
		},
			
		toggleIncrementalFind: function() {
			this._incrementalFindActive = !this._incrementalFindActive;
			if (this._incrementalFindActive) {
				this.editor.reportStatus(util.formatMessage(messages.incrementalFind, this._incrementalFindPrefix));
				this.textView.addEventListener("Verify", this._incrementalFindListener.onVerify); //$NON-NLS-0$
				this.textView.addEventListener("Selection", this._incrementalFindListener.onSelection); //$NON-NLS-0$
			} else {
				this._incrementalFindPrefix = "";
				this.editor.reportStatus("");
				this.textView.removeEventListener("Verify", this._incrementalFindListener.onVerify); //$NON-NLS-0$
				this.textView.removeEventListener("Selection", this._incrementalFindListener.onSelection); //$NON-NLS-0$
				this.textView.setCaretOffset(this.textView.getCaretOffset());
			}
		},
		
		startUndo: function() {
			if (this.undoStack) {
				this.undoStack.startCompoundChange();
			}
		}, 
		
		endUndo: function() {
			if (this.undoStack) {
				this.undoStack.endCompoundChange();
			}
		}, 
	
		cancel: function() {
			this.toggleIncrementalFind();
		},
		
		isActive: function() {
			return this._incrementalFindActive;
		},
		
		isStatusActive: function() {
			return this._incrementalFindActive;
		},
		
		lineUp: function() {
			if (this._incrementalFindActive) {
				var prefix = this._incrementalFindPrefix;
				if (prefix.length === 0) {
					return false;
				}
				var editor = this.editor;
				var model = editor.getModel();
				var start;
				if (this._incrementalFindSuccess) {
					start = editor.getCaretOffset() - prefix.length - 1;
				} else {
					start = model.getCharCount() - 1;
				}
				var result = editor.getModel().find({
					string: prefix,
					start: start,
					reverse: true,
					caseInsensitive: prefix.toLowerCase() === prefix}).next();
				if (result) {
					this._incrementalFindSuccess = true;
					this._incrementalFindIgnoreSelection = true;
					editor.moveSelection(result.start, result.end);
					this._incrementalFindIgnoreSelection = false;
					editor.reportStatus(util.formatMessage(messages.incrementalFind, prefix));
				} else {
					editor.reportStatus(util.formatMessage(messages.incrementalFindNotFound, prefix), "error"); //$NON-NLS-0$
					this._incrementalFindSuccess = false;
				}
				return true;
			}
			return false;
		},
		lineDown: function() {	
			if (this._incrementalFindActive) {
				var prefix = this._incrementalFindPrefix;
				if (prefix.length === 0) {
					return false;
				}
				var editor = this.editor;
				var start = 0;
				if (this._incrementalFindSuccess) {
					start = editor.getSelection().start + 1;
				}
				var result = editor.getModel().find({
					string: prefix,
					start: start,
					caseInsensitive: prefix.toLowerCase() === prefix}).next();
				if (result) {
					this._incrementalFindSuccess = true;
					this._incrementalFindIgnoreSelection = true;
					editor.moveSelection(result.start, result.end);
					this._incrementalFindIgnoreSelection = false;
					editor.reportStatus(util.formatMessage(messages.incrementalFind, prefix));
				} else {
					editor.reportStatus(util.formatMessage(messages.incrementalFindNotFound, prefix), "error"); //$NON-NLS-0$
					this._incrementalFindSuccess = false;
				}
				return true;
			}
			return false;
		},
		enter: function() {
			return false;
		}
	};
	
	/**
	 * @param {orion.editor.Editor} editor
	 * @param {orion.textView.UndoStack} undoStack
	 * @param {orion.editor.ContentAssist} [contentAssist]
	 * @param {orion.editor.LinkedMode} [linkedMode]
	 */
	function SourceCodeActions(editor, undoStack, contentAssist, linkedMode) {
		this.editor = editor;
		this.textView = editor.getTextView();
		this.undoStack = undoStack;
		this.contentAssist = contentAssist;
		this.linkedMode = linkedMode;
		if (this.contentAssist) {
			this.contentAssist.addEventListener("ProposalApplied", this.contentAssistProposalApplied.bind(this)); //$NON-NLS-0$
		}
		this.init();
	}
	SourceCodeActions.prototype = {
		startUndo: function() {
			if (this.undoStack) {
				this.undoStack.startCompoundChange();
			}
		}, 
		
		endUndo: function() {
			if (this.undoStack) {
				this.undoStack.endCompoundChange();
			}
		}, 
		init: function() {
		
			this.textView.setAction("lineStart", function() { //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var caretOffset = editor.getCaretOffset();
				var lineIndex = model.getLineAtOffset(caretOffset);
				var lineOffset = model.getLineStart(lineIndex);
				var lineText = model.getLine(lineIndex);
				var offset;
				for (offset=0; offset<lineText.length; offset++) {
					var c = lineText.charCodeAt(offset);
					if (!(c === 32 || c === 9)) {
						break;
					}
				}
				offset += lineOffset;
				if (caretOffset !== offset) {
					editor.setSelection(offset, offset);
					return true;
				}
				return false;
			}.bind(this));
		
			// Block comment operations
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(191, true), "toggleLineComment"); //$NON-NLS-0$
			this.textView.setAction("toggleLineComment", function() { //$NON-NLS-0$
				if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				var uncomment = true, lines = [], lineText, index;
				for (var i = firstLine; i <= lastLine; i++) {
					lineText = model.getLine(i, true);
					lines.push(lineText);
					if (!uncomment || (index = lineText.indexOf("//")) === -1) { //$NON-NLS-0$
						uncomment = false;
					} else {
						if (index !== 0) {
							var j;
							for (j=0; j<index; j++) {
								var c = lineText.charCodeAt(j);
								if (!(c === 32 || c === 9)) {
									break;
								}
							}
							uncomment = j === index;
						}
					}
				}
				var text, selStart, selEnd;
				var lineStart = model.getLineStart(firstLine);
				var lineEnd = model.getLineEnd(lastLine, true);
				if (uncomment) {
					for (var k = 0; k < lines.length; k++) {
						lineText = lines[k];
						index = lineText.indexOf("//"); //$NON-NLS-0$
						lines[k] = lineText.substring(0, index) + lineText.substring(index + 2);
					}
					text = lines.join("");
					var lastLineStart = model.getLineStart(lastLine);
					selStart = lineStart === selection.start ? selection.start : selection.start - 2;
					selEnd = selection.end - (2 * (lastLine - firstLine + 1)) + (selection.end === lastLineStart+1 ? 2 : 0);
				} else {
					lines.splice(0, 0, "");
					text = lines.join("//"); //$NON-NLS-0$
					selStart = lineStart === selection.start ? selection.start : selection.start + 2;
					selEnd = selection.end + (2 * (lastLine - firstLine + 1));
				}
				editor.setText(text, lineStart, lineEnd);
				editor.setSelection(selStart, selEnd);
				return true;
			}.bind(this), {name: messages.toggleLineComment});
			
			function findEnclosingComment(model, start, end) {
				var open = "/*", close = "*/"; //$NON-NLS-1$ //$NON-NLS-0$
				var firstLine = model.getLineAtOffset(start);
				var lastLine = model.getLineAtOffset(end);
				var i, line, extent, openPos, closePos;
				var commentStart, commentEnd;
				for (i=firstLine; i >= 0; i--) {
					line = model.getLine(i);
					extent = (i === firstLine) ? start - model.getLineStart(firstLine) : line.length;
					openPos = line.lastIndexOf(open, extent);
					closePos = line.lastIndexOf(close, extent);
					if (closePos > openPos) {
						break; // not inside a comment
					} else if (openPos !== -1) {
						commentStart = model.getLineStart(i) + openPos;
						break;
					}
				}
				for (i=lastLine; i < model.getLineCount(); i++) {
					line = model.getLine(i);
					extent = (i === lastLine) ? end - model.getLineStart(lastLine) : 0;
					openPos = line.indexOf(open, extent);
					closePos = line.indexOf(close, extent);
					if (openPos !== -1 && openPos < closePos) {
						break;
					} else if (closePos !== -1) {
						commentEnd = model.getLineStart(i) + closePos;
						break;
					}
				}
				return {commentStart: commentStart, commentEnd: commentEnd};
			}
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(191, true, !util.isMac, false, util.isMac), "addBlockComment"); //$NON-NLS-0$
			this.textView.setAction("addBlockComment", function() { //$NON-NLS-0$
				if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var open = "/*", close = "*/", commentTags = new RegExp("/\\*" + "|" + "\\*/", "g"); //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				
				var result = findEnclosingComment(model, selection.start, selection.end);
				if (result.commentStart !== undefined && result.commentEnd !== undefined) {
					return true; // Already in a comment
				}
				
				var text = model.getText(selection.start, selection.end);
				if (text.length === 0) { return true; }
				
				var oldLength = text.length;
				text = text.replace(commentTags, "");
				var newLength = text.length;
				
				editor.setText(open + text + close, selection.start, selection.end);
				editor.setSelection(selection.start + open.length, selection.end + open.length + (newLength-oldLength));
				return true;
			}.bind(this), {name: messages.addBlockComment});
			
			// SCRIPTED proper implementation of enterAfter - how does latest orion editor behave?
			this.textView.setAction("enterAfter",function() {
				// Partial copy of the "enter" code but moves selection to end of line before doing
				// the insert
				// Auto indent
				var editor = this.editor;
				var selection = editor.getSelection();
				if (selection.start === selection.end) {
					var model = editor.getModel();
					var lineIndex = model.getLineAtOffset(selection.start);
					var lineText = model.getLine(lineIndex, true);
					var lineStart = model.getLineStart(lineIndex);
					var index = 0, end = selection.start - lineStart, c;
					while (index < end && ((c = lineText.charCodeAt(index)) === 32 || c === 9)) { index++; }
					if (index > 0) {
						//TODO still wrong when typing inside folding
						var prefix = lineText.substring(0, index);
						index = end;
						while (index < lineText.length && ((c = lineText.charCodeAt(index++)) === 32 || c === 9)) { selection.end++; }
						var lineEnd = model.getLineEnd(lineIndex);
						selection.end = lineEnd;
						selection.start=lineEnd;
						editor.setSelection(lineEnd,lineEnd);
						editor.setText(model.getLineDelimiter() + prefix, selection.start, selection.end);
						return true;
					}
				}
				return false;
			}.bind(this));
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(220, true, !util.isMac, false, util.isMac), "removeBlockComment"); //$NON-NLS-0$
			this.textView.setAction("removeBlockComment", function() { //$NON-NLS-0$
				if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var open = "/*", close = "*/"; //$NON-NLS-1$ //$NON-NLS-0$
				
				// Try to shrink selection to a comment block
				var selectedText = model.getText(selection.start, selection.end);
				var newStart, newEnd;
				var i;
				for(i=0; i < selectedText.length; i++) {
					if (selectedText.substring(i, i + open.length) === open) {
						newStart = selection.start + i;
						break;
					}
				}
				for (; i < selectedText.length; i++) {
					if (selectedText.substring(i, i + close.length) === close) {
						newEnd = selection.start + i;
						break;
					}
				}
				
				if (newStart !== undefined && newEnd !== undefined) {
					editor.setText(model.getText(newStart + open.length, newEnd), newStart, newEnd + close.length);
					editor.setSelection(newStart, newEnd);
				} else {
					// Otherwise find enclosing comment block
					var result = findEnclosingComment(model, selection.start, selection.end);
					if (result.commentStart === undefined || result.commentEnd === undefined) {
						return true;
					}
					
					var text = model.getText(result.commentStart + open.length, result.commentEnd);
					editor.setText(text, result.commentStart, result.commentEnd + close.length);
					editor.setSelection(selection.start - open.length, selection.end - close.length);
				}
				return true;
			}.bind(this), {name: messages.removeBlockComment});
		},
		/**
		 * Called when a content assist proposal has been applied. Inserts the proposal into the
		 * document. Activates Linked Mode if applicable for the selected proposal.
		 * @param {orion.editor.ContentAssist#ProposalAppliedEvent} event
		 */
		contentAssistProposalApplied: function(event) {
			/**
			 * The event.proposal is an object with this shape:
			 * {   proposal: "[proposal string]", // Actual text of the proposal
			 *     description: "diplay string", // Optional
			 *     positions: [{
			 *         offset: 10, // Offset of start position of parameter i
			 *         length: 3  // Length of parameter string for parameter i
			 *     }], // One object for each parameter; can be null
			 *     escapePosition: 19, // Optional; offset that caret will be placed at after exiting Linked Mode.
			 *     style: 'emphasis', // Optional: either emphasis, noemphasis, hr to provide custom styling for the proposal
			 *     unselectable: false // Optional: if set to true, then this proposal cannnot be selected through the keyboard
			 * }
			 * Offsets are relative to the text buffer.
			 */
			var proposal = event.data.proposal;
			
			//if the proposal specifies linked positions, build the model and enter linked mode
			if (proposal.positions && this.linkedMode) {
				var positionGroups = [];
				for (var i = 0; i < proposal.positions.length; ++i) {
					// SCRIPTED: begin
					/*old
					positionGroups[i] = {
						positions: [{
							offset: proposal.positions[i].offset,
							length: proposal.positions[i].length
						}]
					};
					*/
					//new: handle positionGroups with more than one element
					if (Array.isArray(proposal.positions[i])) {
						positionGroups[i] = { positions : [] };
						for (var j = 0; j < proposal.positions[i].length; j++) {
							positionGroups[i].positions.push({
								offset: proposal.positions[i][j].offset,
								length: proposal.positions[i][j].length
							});
						}
					} else {
						positionGroups[i] = {
							positions: [{
								offset: proposal.positions[i].offset,
								length: proposal.positions[i].length
							}]
						};
					}
					// SCRIPTED: end
				}

				var linkedModeModel = {
					groups: positionGroups,
					escapePosition: proposal.escapePosition
				};
				this.linkedMode.enterLinkedMode(linkedModeModel);
			} else if (proposal.escapePosition) {
				//we don't want linked mode, but there is an escape position, so just set cursor position
				this.textView.setCaretOffset(proposal.escapePosition);
			}
			return true;
		},
		cancel: function() {
			return false;
		},
		isActive: function() {
			return true;
		},
		isStatusActive: function() {
			// SourceCodeActions never reports status
			return false;
		},
		lineUp: function() {
			return false;
		},
		lineDown: function() {
			return false;
		},
		enter: function() {
			// Auto indent
			if (this.textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var editor = this.editor;
			var selection = editor.getSelection();
			if (selection.start === selection.end) {
				var model = editor.getModel();
				var lineIndex = model.getLineAtOffset(selection.start);
				var lineText = model.getLine(lineIndex, true);
				var lineStart = model.getLineStart(lineIndex);
				var index = 0, end = selection.start - lineStart, c;
				while (index < end && ((c = lineText.charCodeAt(index)) === 32 || c === 9)) { index++; }
				if (index > 0) {
					//TODO still wrong when typing inside folding
					var prefix = lineText.substring(0, index);
					index = end;
					while (index < lineText.length && ((c = lineText.charCodeAt(index++)) === 32 || c === 9)) { selection.end++; }
					editor.setText(model.getLineDelimiter() + prefix, selection.start, selection.end);
					return true;
				}
			}
			return false;
		},
		tab: function() {
			return false;
		}
	};
	
	function LinkedMode(editor) {
		this.editor = editor;
		this.textView = editor.getTextView();
		
		/**
		 * The variables used by the Linked Mode. The elements of linkedModePositions have following structure:
		 * {
		 *     offset: 10, // The offset of the position counted from the beginning of the text buffer
		 *     length: 3 // The length of the position (selection)
		 * }
		 *
		 * The linkedModeEscapePosition contains an offset (counted from the beginning of the text buffer) of a
		 * position where the caret will be placed after exiting from the Linked Mode.
		 */
		this.linkedModeActive = false;
		this.linkedModePositions = [];
		this.linkedModeCurrentPositionIndex = 0;
		this.linkedModeEscapePosition = 0;
		
		/**
		 * Listener called when Linked Mode is active. Updates position's offsets and length
		 * on user change. Also escapes the Linked Mode if the text buffer was modified outside of the Linked Mode positions.
		 */
		this.linkedModeListener = {
			onVerify: function(event) {
				var changeInsideGroup = false;
				var offsetDifference = 0;
				for (var i = 0; i < this.linkedModePositions.length; ++i) {
					var position = this.linkedModePositions[i];
					if (changeInsideGroup) {
						// The change has already been noticed, update the offsets of all positions next to the changed one
						position.offset += offsetDifference;
					} else if (event.start >= position.offset && event.end <= position.offset + position.length) {
						// The change was done in the current position, update its length
						var oldLength = position.length;
						position.length = (event.start - position.offset) + event.text.length + (position.offset + position.length - event.end);
						offsetDifference = position.length - oldLength;
						changeInsideGroup = true;
					}
				}

				if (changeInsideGroup) {
					// Update escape position too
					this.linkedModeEscapePosition += offsetDifference;
				} else {
					// The change has been done outside of the positions, exit the Linked Mode
					this.cancel();
				}
			}.bind(this)
		};
	}
	LinkedMode.prototype = {
		/**
		 * Starts Linked Mode, selects the first position and registers the listeners.
		 * @parma {Object} linkedModeModel An object describing the model to be used by linked mode.
		 * Contains one or more position groups. If one positions in a group is edited, the other positions in the
		 * group are edited the same way. The structure is as follows:<pre>
		 * {
		 *     groups: [{
		 *         positions: [{
		 *             offset: 10, // Relative to the text buffer
		 *             length: 3
		 *         }]
		 *     }],
		 *     escapePosition: 19, // Relative to the text buffer
		 * }</pre>
		 */
		enterLinkedMode: function(linkedModeModel) {
			if (this.linkedModeActive) {
				return;
			}
			// SCRIPTED - new code, remembers the bindings
			var kbs = mKeybinder.getKeyBindings(this.editor);
			this.oldTabBinding = kbs['Tab'];
			this.oldShiftTabBinding = kbs['Shift+Tab'];
			// SCRIPTED change end
			this.linkedModeActive = true;

			// NOTE: only the first position from each group is supported for now
			this.linkedModePositions = [];
			for (var i = 0; i < linkedModeModel.groups.length; ++i) {
				var group = linkedModeModel.groups[i];
				this.linkedModePositions[i] = {
					offset: group.positions[0].offset,
					length: group.positions[0].length
				};
			}

			this.linkedModeEscapePosition = linkedModeModel.escapePosition;
			this.linkedModeCurrentPositionIndex = 0;
			this.selectTextForLinkedModePosition(this.linkedModePositions[this.linkedModeCurrentPositionIndex]);

			this.textView.addEventListener("Verify", this.linkedModeListener.onVerify); //$NON-NLS-0$

			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9), "nextLinkedModePosition"); //$NON-NLS-0$
			this.textView.setAction("nextLinkedModePosition", function() { //$NON-NLS-0$
				// Switch to the next group on TAB key
				this.linkedModeCurrentPositionIndex = ++this.linkedModeCurrentPositionIndex % this.linkedModePositions.length;
				this.selectTextForLinkedModePosition(this.linkedModePositions[this.linkedModeCurrentPositionIndex]);
				return true;
			}.bind(this));
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9, false, true), "previousLinkedModePosition"); //$NON-NLS-0$
			this.textView.setAction("previousLinkedModePosition", function() { //$NON-NLS-0$
				this.linkedModeCurrentPositionIndex = this.linkedModeCurrentPositionIndex > 0 ? this.linkedModeCurrentPositionIndex-1 : this.linkedModePositions.length-1;
				this.selectTextForLinkedModePosition(this.linkedModePositions[this.linkedModeCurrentPositionIndex]);
				return true;
			}.bind(this));

			this.editor.reportStatus(messages.linkedModeEntered, null, true);
		},
		isActive: function() {
			return this.linkedModeActive;
		},
		isStatusActive: function() {
			return this.linkedModeActive;
		},
		enter: function() {
			this.cancel();
			return true;
		},
		/** 
		 * Exits Linked Mode. Optionally places the caret at linkedModeEscapePosition. 
		 * @param {boolean} ignoreEscapePosition optional if true, do not place the caret at the 
		 * escape position.
		 */
		cancel: function(ignoreEscapePosition) {
			if (!this.linkedModeActive) {
				return;
			}
			this.linkedModeActive = false;
			this.textView.removeEventListener("Verify", this.linkedModeListener.onVerify); //$NON-NLS-0$
			// SCRIPTED, was:
			/*{
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9), "tab"); //$NON-NLS-0$
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9, false, true), "shiftTab"); //$NON-NLS-0$
			}*/
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9), this.oldTabBinding);
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9, false, true), this.oldShiftTabBinding);
			
			if (!ignoreEscapePosition) {
				this.textView.setCaretOffset(this.linkedModeEscapePosition, false);
			}

			this.editor.reportStatus(messages.linkedModeExited, null, true);
		},
		lineUp: function() {
			this.cancel(true);
			return false;
		},
		lineDown: function() {
			this.cancel(true);
			return false;
		},		/**
		 * Updates the selection in the textView for given Linked Mode position.
		 */
		selectTextForLinkedModePosition: function(position) {
			this.textView.setSelection(position.offset, position.offset + position.length);
		}
	};

	return {
		UndoFactory: UndoFactory,
		LineNumberRulerFactory: LineNumberRulerFactory,
		FoldingRulerFactory: FoldingRulerFactory,
		AnnotationFactory: AnnotationFactory,
		TextDNDFactory: TextDNDFactory,
		TextActions: TextActions,
		SourceCodeActions: SourceCodeActions,
		LinkedMode: LinkedMode
	};
});

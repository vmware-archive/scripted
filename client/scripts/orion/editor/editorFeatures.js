/*******************************************************************************
 * @license
 * Copyright (c) 2011 IBM Corporation and others.
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

define("orion/editor/editorFeatures", ['i18n!orion/editor/nls/messages', 'orion/textview/undoStack', 'orion/textview/keyBinding',
	'orion/textview/rulers', 'orion/textview/annotations', 'orion/textview/textDND', 'orion/editor/regex', 'orion/textview/util'],
function(messages, mUndoStack, mKeyBinding, mRulers, mAnnotations, mTextDND, mRegex, mUtil) {

	function UndoFactory() {
	}
	UndoFactory.prototype = {
		createUndoStack: function(editor) {
			var textView = editor.getTextView();
			var undoStack =  new mUndoStack.UndoStack(textView, 200);
			textView.setKeyBinding(new mKeyBinding.KeyBinding('z', true), "Undo");
			textView.setAction("Undo", function() {
				undoStack.undo();
				return true;
			});
			
			var isMac = navigator.platform.indexOf("Mac") !== -1;
			textView.setKeyBinding(isMac ? new mKeyBinding.KeyBinding('z', true, true) : new mKeyBinding.KeyBinding('y', true), "Redo");
			textView.setAction("Redo", function() {
				undoStack.redo();
				return true;
			});
			return undoStack;
		}
	};

	function LineNumberRulerFactory() {
	}
	LineNumberRulerFactory.prototype = {
		createLineNumberRuler: function(annotationModel) {
			return new mRulers.LineNumberRuler(annotationModel, "left", {styleClass: "ruler lines"}, {styleClass: "rulerLines odd"}, {styleClass: "rulerLines even"});
		}
	};
	
	function FoldingRulerFactory() {
	}
	FoldingRulerFactory.prototype = {
		createFoldingRuler: function(annotationModel) {
			return new mRulers.FoldingRuler(annotationModel, "left", {styleClass: "ruler folding"});
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
			var annotationRuler = new mRulers.AnnotationRuler(annotationModel, "left", {styleClass: "ruler annotations"});
			var overviewRuler = new mRulers.OverviewRuler(annotationModel, "right", {styleClass: "ruler overview"});
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
					var match = prefix.match(new RegExp("^" + mRegex.escape(txt), "i"));
					if (match && match.length > 0) {
						prefix = self._incrementalFindPrefix += e.text;
						self.editor.reportStatus(mUtil.formatMessage(messages.incrementalFind, prefix));
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
							editor.reportStatus(mUtil.formatMessage(messages.incrementalFindNotFound, prefix), "error");
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
			this.textView.addEventListener("ModelChanged", this._lastEditListener.onModelChanged);
			
			// Find actions
			// These variables are used among the various find actions:
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("f", true), messages.find);
			this.textView.setAction(messages.find, function() {
				if (this._searcher) {
					var editor = this.editor;
					var selection = editor.getSelection();
					var searchString = "";
					if (selection.end > selection.start) {
						var model = editor.getModel();
						searchString = model.getText(selection.start, selection.end);
					}
					this._searcher.buildToolBar(searchString);
					return true;
				}
				return false;
			}.bind(this));
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("k", true), messages.findNext);
			this.textView.setAction(messages.findNext, function() {
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
			}.bind(this));
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("k", true, true), messages.findPrevious);
			this.textView.setAction(messages.findPrevious, function() {
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
			}.bind(this));
	
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("j", true), messages.incrementalFindKey);
			this.textView.setAction(messages.incrementalFindKey, function() {
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
							editor.reportStatus(mUtil.formatMessage(messages.incrementalFind, prefix));
						} else {
							editor.reportStatus(mUtil.formatMessage(messages.incrementalFindNotFound, prefix), "error");
							this._incrementalFindSuccess = false;
						}
					}
				}
				return true;
			}.bind(this));
			this.textView.setAction("deletePrevious", function() {
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
					editor.reportStatus(mUtil.formatMessage(messages.incrementalFind, prefix));
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
						editor.reportStatus(mUtil.formatMessage(messages.incrementalFindNotFound, prefix), "error");
					}
					return true;
				}
				return false;
				}.bind(this));

				this.textView.setAction("tab", function() {
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				if (firstLine !== lastLine) {
					// SCRIPTED - modified not to indent lines that don't have anything on them. Just for SA
//					var lines = [];
//					lines.push("");
					var lineStart = model.getLineStart(firstLine);
					var lineEnd = model.getLineEnd(lastLine, true);
					var options = this.textView.getOptions("tabSize", "expandTab");
					var text = options.expandTab ? new Array(options.tabSize + 1).join(" ") : "\t";

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
					return true;
				}
				return false;
			}.bind(this));
	
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9, false, true), messages.unindentLines);
			this.textView.setAction(messages.unindentLines, function() {	
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				var tabSize = this.textView.getOptions("tabSize");
				var spaceTab = new Array(tabSize + 1).join(" ");
				var lines = [], removeCount = 0, firstRemoveCount = 0;
				for (var i = firstLine; i <= lastLine; i++) {
					var line = model.getLine(i, true);
					if (model.getLineStart(i) !== model.getLineEnd(i)) {
						if (line.indexOf("\t") === 0) {
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
				editor.setSelection(startpos,endpos);
				return true;
			}.bind(this));
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(38, false, false, true), messages.moveLinesUp);
			this.textView.setAction(messages.moveLinesUp, function() {
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
			}.bind(this));
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(40, false, false, true), messages.moveLinesDown);
			this.textView.setAction(messages.moveLinesDown, function() {
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
			}.bind(this));
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(38, true, false, true), messages.copyLinesUp);
			this.textView.setAction(messages.copyLinesUp, function() {
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
			}.bind(this));
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(40, true, false, true), messages.copyLinesDown);
			this.textView.setAction(messages.copyLinesDown, function() {
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
			}.bind(this));
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding('d', true, false, false), messages.deleteLines);
			this.textView.setAction(messages.deleteLines, function() {
				var editor = this.editor;
				var selection = editor.getSelection();
				var model = editor.getModel();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				var lineStart = model.getLineStart(firstLine);
				var lineEnd = model.getLineEnd(lastLine, true);
				editor.setText("", lineStart, lineEnd);
				return true;
			}.bind(this));
			
			// Go To Line action
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("l", true), messages.gotoLine);
			this.textView.setAction(messages.gotoLine, function() {
				var editor = this.editor;
				var model = editor.getModel();
				var line = model.getLineAtOffset(editor.getCaretOffset());
				line = prompt(messages.gotoLinePrompty, line + 1);
				if (line) {
					line = parseInt(line, 10);
					editor.onGotoLine(line - 1, 0);
				}
				return true;
			}.bind(this));
			
			var isMac = navigator.platform.indexOf("Mac") !== -1;
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding("q", !isMac, false, false, isMac), messages.lastEdit);
			this.textView.setAction(messages.lastEdit, function() {
				if (typeof this._lastEditLocation === "number")  {
					this.editor.showSelection(this._lastEditLocation);
				}
				return true;
			}.bind(this));
		},
			
		toggleIncrementalFind: function() {
			this._incrementalFindActive = !this._incrementalFindActive;
			if (this._incrementalFindActive) {
				this.editor.reportStatus(mUtil.formatMessage(messages.incrementalFind, this._incrementalFindPrefix));
				this.textView.addEventListener("Verify", this._incrementalFindListener.onVerify);
				this.textView.addEventListener("Selection", this._incrementalFindListener.onSelection);
			} else {
				this._incrementalFindPrefix = "";
				this.editor.reportStatus("");
				this.textView.removeEventListener("Verify", this._incrementalFindListener.onVerify);
				this.textView.removeEventListener("Selection", this._incrementalFindListener.onSelection);
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
					editor.reportStatus(mUtil.formatMessage(messages.incrementalFind, prefix));
				} else {
					editor.reportStatus(mUtil.formatMessage(messages.incrementalFindNotFound, prefix), "error");
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
					editor.reportStatus(mUtil.formatMessage(messages.incrementalFind, prefix));
				} else {
					editor.reportStatus(mUtil.formatMessage(messages.incrementalFindNotFound, prefix), "error");
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
			this.contentAssist.addEventListener("accept", this.contentAssistProposalAccepted.bind(this));
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
		
			// Block comment operations
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(191, true), messages.toggleLineComment);
			this.textView.setAction(messages.toggleLineComment, function() {
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var firstLine = model.getLineAtOffset(selection.start);
				var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
				var uncomment = true, lines = [], lineText, index;
				for (var i = firstLine; i <= lastLine; i++) {
					lineText = model.getLine(i, true);
					lines.push(lineText);
					if (!uncomment || (index = lineText.indexOf("//")) === -1) {
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
						index = lineText.indexOf("//");
						lines[k] = lineText.substring(0, index) + lineText.substring(index + 2);
					}
					text = lines.join("");
					var lastLineStart = model.getLineStart(lastLine);
					selStart = lineStart === selection.start ? selection.start : selection.start - 2;
					selEnd = selection.end - (2 * (lastLine - firstLine + 1)) + (selection.end === lastLineStart+1 ? 2 : 0);
				} else {
					lines.splice(0, 0, "");
					text = lines.join("//");
					selStart = lineStart === selection.start ? selection.start : selection.start + 2;
					selEnd = selection.end + (2 * (lastLine - firstLine + 1));
				}
				editor.setText(text, lineStart, lineEnd);
				editor.setSelection(selStart, selEnd);
				return true;
			}.bind(this));
			
			function findEnclosingComment(model, start, end) {
				var open = "/*", close = "*/";
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
			
			var isMac = navigator.platform.indexOf("Mac") !== -1;
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(191, true, !isMac, false, isMac), messages.addBlockComment);
			this.textView.setAction(messages.addBlockComment, function() {
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var open = "/*", close = "*/", commentTags = new RegExp("/\\*" + "|" + "\\*/", "g");
				
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
			}.bind(this));
			
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
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(220, true, !isMac, false, isMac), messages.removeBlockComment);
			this.textView.setAction(messages.removeBlockComment, function() {
				var editor = this.editor;
				var model = editor.getModel();
				var selection = editor.getSelection();
				var open = "/*", close = "*/";
				
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
			}.bind(this));
		},
		/**
		 * Called when a content assist proposal has been accepted. Inserts the proposal into the
		 * document. Activates Linked Mode if applicable for the selected proposal.
		 */
		contentAssistProposalAccepted: function(event) {
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
			var proposalText = proposal.proposal;
			this.textView.setText(proposalText, event.data.start, event.data.end);
			
			//if the proposal specifies linked positions, build the model and enter linked mode
			if (proposal.positions && this.linkedMode) {
				var positionGroups = [];
				for (var i = 0; i < proposal.positions.length; ++i) {
					positionGroups[i] = {
						positions: [{
							offset: proposal.positions[i].offset,
							length: proposal.positions[i].length
						}]
					};
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

			this.textView.addEventListener("Verify", this.linkedModeListener.onVerify);

			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9), "nextLinkedModePosition");
			this.textView.setAction("nextLinkedModePosition", function() {
				// Switch to the next group on TAB key
				this.linkedModeCurrentPositionIndex = ++this.linkedModeCurrentPositionIndex % this.linkedModePositions.length;
				this.selectTextForLinkedModePosition(this.linkedModePositions[this.linkedModeCurrentPositionIndex]);
				return true;
			}.bind(this));
			
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9, false, true), "previousLinkedModePosition");
			this.textView.setAction("previousLinkedModePosition", function() {
				this.linkedModeCurrentPositionIndex = this.linkedModeCurrentPositionIndex > 0 ? this.linkedModeCurrentPositionIndex-1 : this.linkedModePositions.length-1;
				this.selectTextForLinkedModePosition(this.linkedModePositions[this.linkedModeCurrentPositionIndex]);
				return true;
			}.bind(this));

			this.editor.reportStatus(messages.linkedModeEntered);
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
			this.textView.removeEventListener("Verify", this.linkedModeListener.onVerify);
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9), "tab");
			this.textView.setKeyBinding(new mKeyBinding.KeyBinding(9, false, true), null);
			
			if (!ignoreEscapePosition) {
				this.textView.setCaretOffset(this.linkedModeEscapePosition, false);
			}
			this.editor.reportStatus(messages.linkedModeExited);
		},
		lineUp: function() {
			this.cancel(true);
			return false;
		},
		lineDown: function() {
			this.cancel(true);
			return false;
		},
		/**
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

/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
 /*global define window */
 /*jslint maxerr:150 browser:true devel:true laxbreak:true regexp:false*/

define("orion/editor/editor", ['i18n!orion/editor/nls/messages', 'orion/textview/keyBinding', 'orion/textview/eventTarget', 'orion/textview/tooltip', 'orion/textview/annotations', 'orion/textview/util'], function(messages, mKeyBinding, mEventTarget, mTooltip, mAnnotations, mUtil) {

	/**
	 * @name orion.editor.util
	 * @class Basic helper functions used by <code>orion.editor</code>.
	 */
	var util;
	
	var HIGHLIGHT_ERROR_ANNOTATION = "orion.annotation.highlightError";

	/**
	 * @name orion.editor.Editor
	 * @class An <code>Editor</code> is a user interface for editing text that provides additional features over the basic {@link orion.textview.TextView}.
	 * Some of <code>Editor</code>'s features include:
	 * <ul>
	 * <li>Additional actions and key bindings for editing text</li>
	 * <li>Content assist</li>
	 * <li>Find and Incremental Find</li>
	 * <li>Rulers for displaying line numbers and annotations</li>
	 * <li>Status reporting</li>
	 * </ul>
	 * 
	 * @description Creates a new Editor with the given options.
	 * @param {Object} options Options controlling the features of this Editor.
	 * @param {Object} options.annotationFactory
	 * @param {Object} options.contentAssistFactory
	 * @param {Object} options.domNode
	 * @param {Object} options.keyBindingFactory
	 * @param {Object} options.lineNumberRulerFactory
	 * @param {Object} options.statusReporter
	 * @param {Object} options.syntaxHighlightProviders
	 * @param {Object} options.textViewFactory
	 * @param {Object} options.undoStackFactory
	 * @param {Object} options.textDNDFactory
	 *
	 * @borrows orion.textview.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.textview.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.textview.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function Editor(options) {
		this._textViewFactory = options.textViewFactory;
		this._undoStackFactory = options.undoStackFactory;
		this._textDNDFactory = options.textDNDFactory;
		this._annotationFactory = options.annotationFactory;
		this._foldingRulerFactory = options.foldingRulerFactory;
		this._lineNumberRulerFactory = options.lineNumberRulerFactory;
		this._contentAssistFactory = options.contentAssistFactory;
		this._keyBindingFactory = options.keyBindingFactory;
		this._statusReporter = options.statusReporter;
		this._domNode = options.domNode;
		this._syntaxHighlightProviders = options.syntaxHighlightProviders;
		
		this._annotationRuler = null;
		this._overviewRuler = null;
		this._foldingRuler = null;
		this._dirty = false;
		this._contentAssist = null;
		this._title = null;
		this._keyModes = [];
	}
	Editor.prototype = /** @lends orion.editor.Editor.prototype */ {
		
		/**
		 * Returns the underlying <code>TextView</code> used by this editor. 
		 * @returns orion.textview.TextView
		 */
		getTextView: function() {
			return this._textView;
		},
		
		/**
		 * @private
		 */
		reportStatus: function(message, type) {
			if (this._statusReporter) {
				this._statusReporter(message, type);
			} else {
				window.alert(type === "error" ? "ERROR: " + message : message);
			}
		},
		
		getModel: function() {
			var model = this._textView.getModel();
			if (model.getBaseModel) {
				model = model.getBaseModel();
			}
			return model;
		},
		
		mapOffset: function(offset, parent) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				offset = model.mapOffset(offset, parent);
			}
			return offset;
		},
		
		getCaretOffset: function() {
			return this.mapOffset(this._textView.getCaretOffset());
		},
		
		getSelection: function() {
			var textView = this._textView;
			var selection = textView.getSelection();
			var model = textView.getModel();
			if (model.getBaseModel) {
				selection.start = model.mapOffset(selection.start);
				selection.end = model.mapOffset(selection.end);
			}
			return selection;
		},
		
		getText: function(start, end) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				model = model.getBaseModel();
			}
			return model.getText(start, end);
		},
		
		_expandOffset: function(offset) {
			var model = this._textView.getModel();
			var annotationModel = this._annotationModel;
			if (!annotationModel || !model.getBaseModel) { return; }
			var annotations = annotationModel.getAnnotations(offset, offset + 1);
			while (annotations.hasNext()) {
				var annotation = annotations.next();
				if (annotation.type === mAnnotations.AnnotationType.ANNOTATION_FOLDING) {
					if (annotation.expand) {
						annotation.expand();
						annotationModel.modifyAnnotation(annotation);
					}
				}
			}
		},

		setCaretOffset: function(caretOffset) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				this._expandOffset(caretOffset);
				caretOffset = model.mapOffset(caretOffset, true);
			}
			textView.setCaretOffset(caretOffset);
		},
	
		setText: function(text, start, end) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				if (start !== undefined) {
					this._expandOffset(start);
					start = model.mapOffset(start, true);
				}
				if (end !== undefined) {
					this._expandOffset(end);
					end = model.mapOffset(end, true);
				}
			}
			textView.setText(text, start, end);
		},
		
		setFoldingEnabled: function(enabled) {
			this._foldingEnabled = enabled;
			this._updateFoldingRuler();
		},
		
		_updateFoldingRuler: function() {
			var textView = this._textView;
			if (this._foldingEnabled) {
				if (!this._foldingRuler && this._foldingRulerFactory && textView.getModel().getBaseModel && this._foldingEnabled) {
					/*
					* TODO - UndoStack relies on this line to ensure that collapsed regions are expanded 
					* when the undo operation happens to those regions. This line needs to be remove when the
					* UndoStack is fixed.
					*/
					textView.annotationModel = this._annotationModel;
					
					this._foldingRuler = this._foldingRulerFactory.createFoldingRuler(this._annotationModel);
					this._foldingRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_FOLDING);
					textView.addRuler(this._foldingRuler);
				}
			} else {
				if (this._foldingRuler) { 
					textView.removeRuler(this._foldingRuler);
					this._foldingRuler = null;
				}
			}
		},
		
		setSelection: function(start, end, show) {
			var textView = this._textView;
			var model = textView.getModel();
			if (model.getBaseModel) {
				this._expandOffset(start);
				this._expandOffset(end);
				start = model.mapOffset(start, true);
				end = model.mapOffset(end, true);
			}
			textView.setSelection(start, end, show);
		},
				
		/**
		 * @static
		 * @param {orion.textview.TextView} textView
		 * @param {Number} start
		 * @param {Number} [end]
		 * @param {function} callBack A call back function that is used after the move animation is done
		 * @private
		 */
		moveSelection: function(start, end, callBack, focus) {
			end = end || start;
			var textView = this._textView;
			this.setSelection(start, end, false);
			var topPixel = textView.getTopPixel();
			var bottomPixel = textView.getBottomPixel();
			var model = this.getModel();
			var line = model.getLineAtOffset(start);
			var linePixel = textView.getLinePixel(line);
			if (linePixel < topPixel || linePixel > bottomPixel) {
				var height = bottomPixel - topPixel;
				var target = Math.max(0, linePixel- Math.floor((linePixel<topPixel?3:1)*height / 4));
				var a = new util.Animation({
					node: textView,
					duration: 300,
					curve: [topPixel, target],
					onAnimate: function(x){
						textView.setTopPixel(Math.floor(x));
					},
					onEnd: function() {
						textView.showSelection();
						if (focus === undefined || focus) {
							textView.focus();
						}
						if(callBack) {
							callBack();
						}
					}
				});
				a.play();
			} else {
				textView.showSelection();
				if (focus === undefined || focus) {
					textView.focus();
				}
				if(callBack) {
					callBack();
				}
			}
		},
		/**
		 * Returns <code>true</code> if the editor is dirty; <code>false</code> otherwise.
		 * @returns {Boolean} 
		 */
		isDirty : function() {
			return this._dirty;
		},
		/**
		 * Sets whether the editor is dirty.
		 *
		 * @param {Boollean} dirty
		 */
		setDirty: function(dirty) {
			if (this._dirty === dirty) { return; }
			this._dirty = dirty;
			this.onDirtyChanged({type: "DirtyChanged"});
		},
		/** @private */
		checkDirty : function() {
			this.setDirty(!this._undoStack.isClean());
		},
		
		/** @private */
		_getTooltipInfo: function(x, y, hoverCallback) { // SCRIPTED change add hoverCallback
			var textView = this._textView;			
			var annotationModel = this.getAnnotationModel();
			if (!annotationModel) { return null; }
			var annotationStyler = this._annotationStyler;
			if (!annotationStyler) { return null; }
			var offset = textView.getOffsetAtLocation(x, y);
			if (offset === -1) { return null; }
			offset = this.mapOffset(offset);
			var annotations = annotationStyler.getAnnotationsByType(annotationModel, offset, offset + 1);
			var rangeAnnotations = [];
			for (var i = 0; i < annotations.length; i++) {
				if (annotations[i].rangeStyle) {
					rangeAnnotations.push(annotations[i]);
				}
			}
			// SCRIPTED change use hoverCallback if there are no annotations
			if (rangeAnnotations.length === 0) { 
				rangeAnnotations = hoverCallback(this.getText(), offset);
				if (rangeAnnotations === null) {
					return null;
				}
			}
			// SCRIPTED end
			var pt = textView.convert({x: x, y: y}, "document", "page");
			var info = {
				contents: rangeAnnotations,
				anchor: "left",
				x: pt.x + 10,
				y: pt.y + 20
			};
			return info;
		}, 
		
		/**
		 * 
		 * @returns {orion.textview.AnnotationModel}
		 */
		getAnnotationModel : function() {
			return this._annotationModel;
		},
		
		/** @private */
		_highlightCurrentLine: function(newSelection, oldSelection) {
			var annotationModel = this._annotationModel;
			if (!annotationModel) { return; }
			var textView = this._textView;	
			var model = textView.getModel();
			var oldLineIndex = oldSelection ? model.getLineAtOffset(oldSelection.start) : -1;
			var lineIndex = model.getLineAtOffset(newSelection.start);
			var newEmpty = newSelection.start === newSelection.end;
			var oldEmpty = !oldSelection || oldSelection.start === oldSelection.end;
			if (!(oldLineIndex === lineIndex && oldEmpty && newEmpty)) {
				var remove = this._currentLineAnnotation ? [this._currentLineAnnotation] : null;
				this._currentLineAnnotation = null;
				var add;
				if (newEmpty) {
					var start = model.getLineStart(lineIndex);
					var end = model.getLineEnd(lineIndex);
					if (model.getBaseModel) {
						start = model.mapOffset(start);
						end = model.mapOffset(end);
					}
					var type = mAnnotations.AnnotationType.ANNOTATION_CURRENT_LINE;
					this._currentLineAnnotation = mAnnotations.AnnotationType.createAnnotation(type, start, end);
					add = [this._currentLineAnnotation];
				}
				annotationModel.replaceAnnotations(remove, add);
			}
		},
		
		highlightAnnotations: function() {
			if (this._annotationStyler) {
				this._annotationStyler.destroy();
				this._annotationStyler = null;
			}
			if (this._annotationFactory) {
				this._annotationStyler = this._annotationFactory.createAnnotationStyler(this.getTextView(), this._annotationModel);
				this._annotationStyler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_CURRENT_SEARCH);
				this._annotationStyler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_MATCHING_SEARCH);
				this._annotationStyler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_ERROR);
				this._annotationStyler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_WARNING);
				this._annotationStyler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_MATCHING_BRACKET);
				this._annotationStyler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_CURRENT_BRACKET);
				this._annotationStyler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_CURRENT_LINE);
				this._annotationStyler.addAnnotationType(HIGHLIGHT_ERROR_ANNOTATION);
			}
		},
		
		/**
		 * Creates the underlying TextView and installs the editor's features.
		 */
		installTextView : function(hoverCallback) { // SCRIPTED change add hoverCallback
			// Create textView and install optional features
			this._textView = this._textViewFactory();
			if (this._undoStackFactory) {
				this._undoStack = this._undoStackFactory.createUndoStack(this);
			}
			if (this._textDNDFactory) {
				this._textDND = this._textDNDFactory.createTextDND(this, this._undoStack);
			}
			if (this._contentAssistFactory) {
				this._contentAssist = this._contentAssistFactory(this);
				this._keyModes.push(this._contentAssist);
			}
			
			var editor = this, textView = this._textView;
			
			var self = this;
			this._listener = {
				onModelChanged: function(e) {
					self.checkDirty();
				},
				onMouseOver: function(e) {
					self._listener.onMouseMove(e);
				},
				onMouseMove: function(e) {
					var tooltip = mTooltip.Tooltip.getTooltip(textView);
					if (!tooltip) { return; }
					tooltip.setTarget({
						x: e.x,
						y: e.y,
						getTooltipInfo: function() {
							return self._getTooltipInfo(this.x, this.y, hoverCallback); // SCRIPTED change add hoverCallback
						}
					});
				},
				onMouseOut: function(lineIndex, e) {
					var tooltip = mTooltip.Tooltip.getTooltip(textView);
					if (!tooltip) { return; }
					tooltip.setTarget(null);
				},
				onSelection: function(e) {
					self._updateCursorStatus();
					self._highlightCurrentLine(e.newValue, e.oldValue);
				}
			};
			textView.addEventListener("ModelChanged", this._listener.onModelChanged);
			textView.addEventListener("Selection", this._listener.onSelection);
			textView.addEventListener("MouseOver", this._listener.onMouseOver);
			textView.addEventListener("MouseOut", this._listener.onMouseOut);
			textView.addEventListener("MouseMove", this._listener.onMouseMove);
						
			// Set up keybindings
			if (this._keyBindingFactory) {
				this._keyBindingFactory(this, this._keyModes, this._undoStack, this._contentAssist);
			}
			
			// Set keybindings for keys that apply to different modes
			textView.setKeyBinding(new mKeyBinding.KeyBinding(27), "Cancel Current Mode");
			textView.setAction("Cancel Current Mode", function() {
				// loop through all modes in case multiple modes are active.  Keep track of whether we processed the key.
				var keyUsed = false;
				for (var i=0; i<this._keyModes.length; i++) {
					if (this._keyModes[i].isActive()) {
						keyUsed = this._keyModes[i].cancel() || keyUsed;
					}
				}
				return keyUsed;
			}.bind(this));

			textView.setAction("lineUp", function() {
				for (var i=0; i<this._keyModes.length; i++) {
					if (this._keyModes[i].isActive()) {
						return this._keyModes[i].lineUp();
					}
				}
				return false;
			}.bind(this));
			textView.setAction("lineDown", function() {
				for (var i=0; i<this._keyModes.length; i++) {
					if (this._keyModes[i].isActive()) {
						return this._keyModes[i].lineDown();
					}
				}
				return false;
			}.bind(this));

			textView.setAction("enter", function() {
				for (var i=0; i<this._keyModes.length; i++) {
					if (this._keyModes[i].isActive()) {
						return this._keyModes[i].enter();
					}
				}
				return false;
			}.bind(this));
						
			// Create rulers
			if (this._annotationFactory) {
				var textModel = textView.getModel();
				if (textModel.getBaseModel) { textModel = textModel.getBaseModel(); }
				this._annotationModel = this._annotationFactory.createAnnotationModel(textModel);
				var annotations = this._annotationFactory.createAnnotationRulers(this._annotationModel);
				this._annotationRuler = annotations.annotationRuler;
			
				this._annotationRuler.onClick = function(lineIndex, e) {
					if (lineIndex === undefined) { return; }
					if (lineIndex === -1) { return; }
					var viewModel = textView.getModel();
					var annotationModel = this.getAnnotationModel();
					var lineStart = editor.mapOffset(viewModel.getLineStart(lineIndex));
					var lineEnd = editor.mapOffset(viewModel.getLineEnd(lineIndex));
					var annotations = annotationModel.getAnnotations(lineStart, lineEnd);
					while (annotations.hasNext()) {
						var annotation = annotations.next();
						if (!this.isAnnotationTypeVisible(annotation.type)) { continue; }
						var model = editor.getModel();
						editor.onGotoLine(model.getLineAtOffset(lineStart), annotation.start - lineStart, annotation.end - lineStart);
						break;
					}
				};
				
				this._overviewRuler = annotations.overviewRuler;
				this._overviewRuler.onClick = function(lineIndex, e) {
					if (lineIndex === undefined) { return; }
					var offset = textView.getModel().getLineStart(lineIndex);
					editor.moveSelection(editor.mapOffset(offset));
				};
			
				this._annotationRuler.setMultiAnnotationOverlay({html: "<div class='annotationHTML overlay'></div>"});
				this._annotationRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_ERROR);
				this._annotationRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_WARNING);
				this._annotationRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_TASK);
				this._overviewRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_CURRENT_SEARCH);
				this._overviewRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_MATCHING_SEARCH);
				this._overviewRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_ERROR);
				this._overviewRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_WARNING);
				this._overviewRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_TASK);
				this._overviewRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_MATCHING_BRACKET);
				this._overviewRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_CURRENT_BRACKET);
				this._overviewRuler.addAnnotationType(mAnnotations.AnnotationType.ANNOTATION_CURRENT_LINE);
				textView.addRuler(this._annotationRuler);
				textView.addRuler(this._overviewRuler);
			}
			
			if (this._lineNumberRulerFactory) {
				this._lineNumberRuler = this._lineNumberRulerFactory.createLineNumberRuler(this._annotationModel);
				textView.addRuler(this._lineNumberRuler);
			}
			
			this._updateFoldingRuler();
			
			var textViewInstalledEvent = {
				type: "TextViewInstalled",
				textView: textView
			};
			this.dispatchEvent(textViewInstalledEvent);
		},
		
		_updateCursorStatus: function() {
			var model = this.getModel();
			var caretOffset = this.getCaretOffset();
			var lineIndex = model.getLineAtOffset(caretOffset);
			var lineStart = model.getLineStart(lineIndex);
			var offsetInLine = caretOffset - lineStart;
			// If we are in a mode and it owns status reporting, we bail out from reporting the cursor position.
			for (var i=0; i<this._keyModes.length; i++) {
				var mode = this._keyModes[i];
				if (mode.isActive() && mode.isStatusActive && mode.isStatusActive()) {
					return;
				}
			}
			this.reportStatus(mUtil.formatMessage(messages.lineColumn, lineIndex + 1, offsetInLine + 1));
		},
		
		showProblems: function(problems) {
			var annotationModel = this._annotationModel;
			if (!annotationModel) {
				return;
			}
			var remove = [], add = [];
			var model = annotationModel.getTextModel();
			var annotations = annotationModel.getAnnotations(0, model.getCharCount()), annotation;
			while (annotations.hasNext()) {
				annotation = annotations.next();
				if (annotation.type === mAnnotations.AnnotationType.ANNOTATION_ERROR || annotation.type === mAnnotations.AnnotationType.ANNOTATION_WARNING) {
					remove.push(annotation);
				}
			}
			if (problems) { 
				for (var i = 0; i < problems.length; i++) {
					var problem = problems[i];
					if (problem) {
						// escaping voodoo... we need to construct HTML that contains valid JavaScript.
						// TODO safeText() from util.js
						var escapedDescription = problem.description;
						if (escapedDescription !== undefined) {
							escapedDescription = escapedDescription.replace(/'/g, "&#39;").replace(/"/g, '&#34;');
						}
//						var escapedDescription = problem.description.replace(/'/g, "&#39;").replace(/"/g, '&#34;');
						var lineIndex = problem.line - 1;
						var lineStart = model.getLineStart(lineIndex);
						var severity = problem.severity;
						var type = severity === "error" ? mAnnotations.AnnotationType.ANNOTATION_ERROR : mAnnotations.AnnotationType.ANNOTATION_WARNING;
						var start = lineStart + problem.start - 1;
						var end = lineStart + problem.end;
						annotation = mAnnotations.AnnotationType.createAnnotation(type, start, end, escapedDescription);
						add.push(annotation);
					}
				}
			}
			annotationModel.replaceAnnotations(remove, add);
		},
		
		/**
		 * Reveals and selects a portion of text.
		 * @param {Number} start
		 * @param {Number} end
		 * @param {Number} line
		 * @param {Number} offset
		 * @param {Number} length
		 */
		showSelection: function(start, end, line, offset, length) {
			// We use typeof because we need to distinguish the number 0 from an undefined or null parameter
			if (typeof(start) === "number") {
				if (typeof(end) !== "number") {
					end = start;
				}
				this.moveSelection(start, end);
			} else if (typeof(line) === "number") {
				var model = this.getModel();
				var pos = model.getLineStart(line-1);
				if (typeof(offset) === "number") {
					pos = pos + offset;
				}
				if (typeof(length) !== "number") {
					length = 0;
				}
				this.moveSelection(pos, pos+length);
			}
		},
		
		/**
		 * Sets the editor's contents.
		 *
		 * @param {String} title
		 * @param {String} message
		 * @param {String} contents
		 * @param {Boolean} contentsSaved
		 */
		setInput: function(title, message, contents, contentsSaved) {
			this._title = title;
			if (this._textView) {
				if (contentsSaved) {
					// don't reset undo stack on save, just mark it clean so that we don't lose the undo past the save
					this._undoStack.markClean();
					this.checkDirty();
				} else {
					if (message) {
						this._textView.setText(message);
					} else {
						if (contents !== null && contents !== undefined) {
							this._textView.setText(contents);
							this._textView.getModel().setLineDelimiter("auto");
							this._highlightCurrentLine(this._textView.getSelection());
						}
					}
					this._undoStack.reset();
					this.checkDirty();
					this._textView.focus();
				}
			}
			this.onInputChanged({
				type: "InputChanged",
				title: title,
				message: message,
				contents: contents,
				contentsSaved: contentsSaved
			});
		},
		
		/**
		 * Called when the editor's contents have changed.
		 * @param {Event} inputChangedEvent
		 */
		onInputChanged: function (inputChangedEvent) {
			return this.dispatchEvent(inputChangedEvent);
		},
		/**
		 * Reveals a line in the editor, and optionally selects a portion of the line.
		 * @param {Number} line - document base line index
		 * @param {Number|String} column
		 * @param {Number} [end]
		 */
		onGotoLine: function(line, column, end) {
			if (this._textView) {
				var model = this.getModel();
				var lineStart = model.getLineStart(line);
				var start = 0;
				if (end === undefined) {
					end = 0;
				}
				if (typeof column === "string") {
					var index = model.getLine(line).indexOf(column);
					if (index !== -1) {
						start = index;
						end = start + column.length;
					}
				} else {
					start = column;
					var lineLength = model.getLineEnd(line) - lineStart;
					start = Math.min(start, lineLength);
					end = Math.min(end, lineLength);
				}
				this.moveSelection(lineStart + start, lineStart + end);
			}
		},
		
		/**
		 * Called when the dirty state of the editor changes.
		 * @param {Event} dirtyChangedEvent
		 */
		onDirtyChanged: function(dirtyChangedEvent) {
			return this.dispatchEvent(dirtyChangedEvent);
		},
		
		getTitle: function() {
			return this._title;
		}
	};
	mEventTarget.EventTarget.addMixin(Editor.prototype);

	/**
	 * @name orion.editor.util
	 * @class Basic helper functions used by <code>orion.editor</code>.
	 */
	util = {
		/**
		 * @class
		 * @private
		 * @name orion.editor.Animation
		 * @description Creates an animation.
		 * @param {Object} options Options controlling the animation.
		 * @param {Array} options.curve Array of 2 values giving the start and end points for the animation.
		 * @param {Number} [options.duration=350] Duration of the animation, in milliseconds.
		 * @param {Function} [options.easing]
		 * @param {Function} [options.onAnimate]
		 * @param {Function} [options.onEnd]
		 * @param {Number} [options.rate=20] The time between frames, in milliseconds.
		 */
		Animation: (function() {
			function Animation(options) {
				this.options = options;
			}
			/**
			 * Plays this animation.
			 * @methodOf orion.editor.Animation.prototype
			 * @name play
			 */
			Animation.prototype.play = function() {
				var duration = (typeof this.options.duration === "number") ? this.options.duration : 350,
				    rate = (typeof this.options.rate === "number") ? this.options.rate : 20,
				    easing = this.options.easing || this.defaultEasing,
				    onAnimate = this.options.onAnimate || function() {},
				    onEnd = this.options.onEnd || function () {},
				    start = this.options.curve[0],
				    end = this.options.curve[1],
				    range = (end - start);
				var propertyValue,
				    interval,
				    startedAt = -1;
				
				function onFrame() {
					startedAt = (startedAt === -1) ? new Date().getTime() : startedAt;
					var now = new Date().getTime(),
					    percentDone = (now - startedAt) / duration;
					if (percentDone < 1) {
						var eased = easing(percentDone);
						propertyValue = start + (eased * range);
						onAnimate(propertyValue);
					} else {
						clearInterval(interval);
						onEnd();
					}
				}
				interval = setInterval(onFrame, rate);
			};
			Animation.prototype.defaultEasing = function(x) {
				return Math.sin(x * (Math.PI / 2));
			};
			return Animation;
		}()),
		
		/**
		 * @private
		 * @param context Value to be used as the returned function's <code>this</code> value.
		 * @param [arg1, arg2, ...] Fixed argument values that will prepend any arguments passed to the returned function when it is invoked.
		 * @returns {Function} A function that always executes this function in the given <code>context</code>.
		 */
		bind: function(context) {
			var fn = this,
			    fixed = Array.prototype.slice.call(arguments, 1);
			if (fixed.length) {
				return function() {
					return arguments.length
						? fn.apply(context, fixed.concat(Array.prototype.slice.call(arguments)))
						: fn.apply(context, fixed);
				};
			}
			return function() {
				return arguments.length ? fn.apply(context, arguments) : fn.call(context);
			};
		}
	};
	
	if (!Function.prototype.bind) {
		Function.prototype.bind = util.bind;
	}

	return {
		Editor: Editor,
		util: util
	};
});

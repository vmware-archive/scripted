/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define */

define("orion/textview/undoStack", [], function() {

	/** 
	 * Constructs a new Change object.
	 * 
	 * @class 
	 * @name orion.textview.Change
	 * @private
	 */
	function Change(offset, text, previousText) {
		this.offset = offset;
		this.text = text;
		this.previousText = previousText;
	}
	Change.prototype = {
		/** @ignore */
		undo: function (view, select) {
			this._doUndoRedo(this.offset, this.previousText, this.text, view, select);
		},
		/** @ignore */
		redo: function (view, select) {
			this._doUndoRedo(this.offset, this.text, this.previousText, view, select);
		},
		_doUndoRedo: function(offset, text, previousText, view, select) {
			var model = view.getModel();
			/* 
			* TODO UndoStack should be changing the text in the base model.
			* This is code needs to change when modifications in the base
			* model are supported properly by the projection model.
			*/
			if (model.mapOffset && view.annotationModel) {
				var mapOffset = model.mapOffset(offset, true);
				if (mapOffset < 0) {
					var annotationModel = view.annotationModel;
					var iter = annotationModel.getAnnotations(offset, offset + 1);
					while (iter.hasNext()) {
						var annotation = iter.next();
						if (annotation.type === "orion.annotation.folding") {
							annotation.expand();
							mapOffset = model.mapOffset(offset, true);
							break;
						}
					}
				}
				if (mapOffset < 0) { return; }
				offset = mapOffset;
			}
			view.setText(text, offset, offset + previousText.length);
			if (select) {
				view.setSelection(offset, offset + text.length);
			}
		}
	};

	/** 
	 * Constructs a new CompoundChange object.
	 * 
	 * @class 
	 * @name orion.textview.CompoundChange
	 * @private
	 */
	function CompoundChange () {
		this.changes = [];
	}
	CompoundChange.prototype = {
		/** @ignore */
		add: function (change) {
			this.changes.push(change);
		},
		/** @ignore */
		end: function (view) {
			this.endSelection = view.getSelection();
			this.endCaret = view.getCaretOffset();
		},
		/** @ignore */
		undo: function (view, select) {
			for (var i=this.changes.length - 1; i >= 0; i--) {
				this.changes[i].undo(view, false);
			}
			if (select) {
				var start = this.startSelection.start;
				var end = this.startSelection.end;
				view.setSelection(this.startCaret ? start : end, this.startCaret ? end : start);
			}
		},
		/** @ignore */
		redo: function (view, select) {
			for (var i = 0; i < this.changes.length; i++) {
				this.changes[i].redo(view, false);
			}
			if (select) {
				var start = this.endSelection.start;
				var end = this.endSelection.end;
				view.setSelection(this.endCaret ? start : end, this.endCaret ? end : start);
			}
		},
		/** @ignore */
		start: function (view) {
			this.startSelection = view.getSelection();
			this.startCaret = view.getCaretOffset();
		}
	};

	/**
	 * Constructs a new UndoStack on a text view.
	 *
	 * @param {orion.textview.TextView} view the text view for the undo stack.
	 * @param {Number} [size=100] the size for the undo stack.
	 *
	 * @name orion.textview.UndoStack
	 * @class The UndoStack is used to record the history of a text model associated to an view. Every
	 * change to the model is added to stack, allowing the application to undo and redo these changes.
	 *
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.textview.TextView}<br/>
	 * </p>
	 */
	function UndoStack (view, size) {
		this.view = view;
		this.size = size !== undefined ? size : 100;
		this.reset();
		var model = view.getModel();
		if (model.getBaseModel) {
			model = model.getBaseModel();
		}
		this.model = model;
		var self = this;
		this._listener = {
			onChanging: function(e) {
				self._onChanging(e);
			},
			onDestroy: function(e) {
				self._onDestroy(e);
			}
		};
		model.addEventListener("Changing", this._listener.onChanging);
		view.addEventListener("Destroy", this._listener.onDestroy);
	}
	UndoStack.prototype = /** @lends orion.textview.UndoStack.prototype */ {
		/**
		 * Adds a change to the stack.
		 * 
		 * @param change the change to add.
		 * @param {Number} change.offset the offset of the change
		 * @param {String} change.text the new text of the change
		 * @param {String} change.previousText the previous text of the change
		 */
		add: function (change) {
			if (this.compoundChange) {
				this.compoundChange.add(change);
			} else {
				var length = this.stack.length;
				this.stack.splice(this.index, length-this.index, change);
				this.index++;
				if (this.stack.length > this.size) {
					this.stack.shift();
					this.index--;
					this.cleanIndex--;
				}
			}
		},
		/** 
		 * Marks the current state of the stack as clean.
		 *
		 * <p>
		 * This function is typically called when the content of view associated with the stack is saved.
		 * </p>
		 *
		 * @see #isClean
		 */
		markClean: function() {
			this.endCompoundChange();
			this._commitUndo();
			this.cleanIndex = this.index;
		},
		/**
		 * Returns true if current state of stack is the same
		 * as the state when markClean() was called.
		 *
		 * <p>
		 * For example, the application calls markClean(), then calls undo() four times and redo() four times.
		 * At this point isClean() returns true.  
		 * </p>
		 * <p>
		 * This function is typically called to determine if the content of the view associated with the stack
		 * has changed since the last time it was saved.
		 * </p>
		 *
		 * @return {Boolean} returns if the state is the same as the state when markClean() was called.
		 *
		 * @see #markClean
		 */
		isClean: function() {
			return this.cleanIndex === this.getSize().undo;
		},
		/**
		 * Returns true if there is at least one change to undo.
		 *
		 * @return {Boolean} returns true if there is at least one change to undo.
		 *
		 * @see #canRedo
		 * @see #undo
		 */
		canUndo: function() {
			return this.getSize().undo > 0;
		},
		/**
		 * Returns true if there is at least one change to redo.
		 *
		 * @return {Boolean} returns true if there is at least one change to redo.
		 *
		 * @see #canUndo
		 * @see #redo
		 */
		canRedo: function() {
			return this.getSize().redo > 0;
		},
		/**
		 * Finishes a compound change.
		 *
		 * @see #startCompoundChange
		 */
		endCompoundChange: function() {
			if (this.compoundChange) {
				this.compoundChange.end(this.view);
			}
			this.compoundChange = undefined;
		},
		/**
		 * Returns the sizes of the stack.
		 *
		 * @return {object} a object where object.undo is the number of changes that can be un-done, 
		 *  and object.redo is the number of changes that can be re-done.
		 *
		 * @see #canUndo
		 * @see #canRedo
		 */
		getSize: function() {
			var index = this.index;
			var length = this.stack.length;
			if (this._undoStart !== undefined) {
				index++;
			}
			return {undo: index, redo: (length - index)};
		},
		/**
		 * Undo the last change in the stack.
		 *
		 * @return {Boolean} returns true if a change was un-done.
		 *
		 * @see #redo
		 * @see #canUndo
		 */
		undo: function() {
			this._commitUndo();
			if (this.index <= 0) {
				return false;
			}
			var change = this.stack[--this.index];
			this._ignoreUndo = true;
			change.undo(this.view, true);
			this._ignoreUndo = false;
			return true;
		},
		/**
		 * Redo the last change in the stack.
		 *
		 * @return {Boolean} returns true if a change was re-done.
		 *
		 * @see #undo
		 * @see #canRedo
		 */
		redo: function() {
			this._commitUndo();
			if (this.index >= this.stack.length) {
				return false;
			}
			var change = this.stack[this.index++];
			this._ignoreUndo = true;
			change.redo(this.view, true);
			this._ignoreUndo = false;
			return true;
		},
		/**
		 * Reset the stack to its original state. All changes in the stack are thrown away.
		 */
		reset: function() {
			this.index = this.cleanIndex = 0;
			this.stack = [];
			this._undoStart = undefined;
			this._undoText = "";
			this._undoType = 0;
			this._ignoreUndo = false;
			this._compoundChange = undefined;
		},
		/**
		 * Starts a compound change. 
		 * <p>
		 * All changes added to stack from the time startCompoundChange() is called
		 * to the time that endCompoundChange() is called are compound on one change that can be un-done or re-done
		 * with one single call to undo() or redo().
		 * </p>
		 *
		 * @see #endCompoundChange
		 */
		startCompoundChange: function() {
			this._commitUndo();
			var change = new CompoundChange();
			this.add(change);
			this.compoundChange = change;
			this.compoundChange.start(this.view);
		},
		_commitUndo: function () {
			if (this._undoStart !== undefined) {
				if (this._undoType === -1) {
					this.add(new Change(this._undoStart, "", this._undoText));
				} else {
					this.add(new Change(this._undoStart, this._undoText, ""));
				}
				this._undoStart = undefined;
				this._undoText = "";
				this._undoType = 0;
			}
		},
		_onDestroy: function(evt) {
			this.model.removeEventListener("Changing", this._listener.onChanging);
			this.view.removeEventListener("Destroy", this._listener.onDestroy);
		},
		_onChanging: function(e) {
			var newText = e.text;
			var start = e.start;
			var removedCharCount = e.removedCharCount;
			var addedCharCount = e.addedCharCount;
			if (this._ignoreUndo) {
				return;
			}
			if (this._undoStart !== undefined && 
				!((addedCharCount === 1 && removedCharCount === 0 && this._undoType === 1 && start === this._undoStart + this._undoText.length) ||
					(addedCharCount === 0 && removedCharCount === 1 && this._undoType === -1 && (((start + 1) === this._undoStart) || (start === this._undoStart)))))
			{
				this._commitUndo();
			}
			if (!this.compoundChange) {
				if (addedCharCount === 1 && removedCharCount === 0) {
					if (this._undoStart === undefined) {
						this._undoStart = start;
					}
					this._undoText = this._undoText + newText;
					this._undoType = 1;
					return;
				} else if (addedCharCount === 0 && removedCharCount === 1) {
					var deleting = this._undoText.length > 0 && this._undoStart === start;
					this._undoStart = start;
					this._undoType = -1;
					if (deleting) {
						this._undoText = this._undoText + this.model.getText(start, start + removedCharCount);
					} else {
						this._undoText = this.model.getText(start, start + removedCharCount) + this._undoText;
					}
					return;
				}
			}
			this.add(new Change(start, newText, this.model.getText(start, start + removedCharCount)));
		}
	};
	
	return {
		UndoStack: UndoStack
	};
});

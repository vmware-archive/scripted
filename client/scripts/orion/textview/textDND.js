/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/
 
/*global define */

define("orion/textview/textDND", [], function() { //$NON-NLS-0$

	function TextDND(view, undoStack) {
		this._view = view;
		this._undoStack = undoStack;
		this._dragSelection = null;
		this._dropOffset = -1;
		this._dropText = null;
		var self = this;
		this._listener = {
			onDragStart: function (evt) {
				self._onDragStart(evt);
			},
			onDragEnd: function (evt) {
				self._onDragEnd(evt);
			},
			onDragEnter: function (evt) {
				self._onDragEnter(evt);
			},
			onDragOver: function (evt) {
				self._onDragOver(evt);
			},
			onDrop: function (evt) {
				self._onDrop(evt);
			},
			onDestroy: function (evt) {
				self._onDestroy(evt);
			}
		};
		view.addEventListener("DragStart", this._listener.onDragStart); //$NON-NLS-0$
		view.addEventListener("DragEnd", this._listener.onDragEnd); //$NON-NLS-0$
		view.addEventListener("DragEnter", this._listener.onDragEnter); //$NON-NLS-0$
		view.addEventListener("DragOver", this._listener.onDragOver); //$NON-NLS-0$
		view.addEventListener("Drop", this._listener.onDrop); //$NON-NLS-0$
		view.addEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
	}
	TextDND.prototype = {
		destroy: function() {
			var view = this._view;
			if (!view) { return; }
			view.removeEventListener("DragStart", this._listener.onDragStart); //$NON-NLS-0$
			view.removeEventListener("DragEnd", this._listener.onDragEnd); //$NON-NLS-0$
			view.removeEventListener("DragEnter", this._listener.onDragEnter); //$NON-NLS-0$
			view.removeEventListener("DragOver", this._listener.onDragOver); //$NON-NLS-0$
			view.removeEventListener("Drop", this._listener.onDrop); //$NON-NLS-0$
			view.removeEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
			this._view = null;
		},
		_onDestroy: function(e) {
			this.destroy();
		},
		_onDragStart: function(e) {
			var view = this._view;
			var selection = view.getSelection();
			var model = view.getModel();
			if (model.getBaseModel) {
				selection.start = model.mapOffset(selection.start);
				selection.end = model.mapOffset(selection.end);
				model = model.getBaseModel();
			}
			var text = model.getText(selection.start, selection.end);
			if (text) {
				this._dragSelection = selection;
				e.event.dataTransfer.effectAllowed = "copyMove"; //$NON-NLS-0$
				e.event.dataTransfer.setData("Text", text); //$NON-NLS-0$
			}
		},
		_onDragEnd: function(e) {
			var view = this._view;
			if (this._dragSelection) {
				if (this._undoStack) { this._undoStack.startCompoundChange(); }
				var move = e.event.dataTransfer.dropEffect === "move"; //$NON-NLS-0$
				if (move) {
					view.setText("", this._dragSelection.start, this._dragSelection.end);
				}
				if (this._dropText) {
					var text = this._dropText;
					var offset = this._dropOffset;
					if (move) {
						if (offset >= this._dragSelection.end) {
							offset -= this._dragSelection.end - this._dragSelection.start;
						} else if (offset >= this._dragSelection.start) {
							offset = this._dragSelection.start;
						}
					}
					view.setText(text, offset, offset);
					view.setSelection(offset, offset + text.length);
					this._dropText = null;
					this._dropOffset = -1;
				}
				if (this._undoStack) { this._undoStack.endCompoundChange(); }
			}
			this._dragSelection = null;
		},
		_onDragEnter: function(e) {
			this._onDragOver(e);
		},
		_onDragOver: function(e) {
			var types = e.event.dataTransfer.types;
			if (types) {
				var allowed = !this._view.getOptions("readonly"); //$NON-NLS-0$
				if (allowed) {
					allowed = types.contains ? types.contains("text/plain") : types.indexOf("text/plain") !== -1; //$NON-NLS-1$ //$NON-NLS-0$
				}
				if (!allowed) {
					e.event.dataTransfer.dropEffect = "none"; //$NON-NLS-0$
				}
			}
		},
		_onDrop: function(e) {
			var view = this._view;
			var text = e.event.dataTransfer.getData("Text"); //$NON-NLS-0$
			if (text) {
				var offset = view.getOffsetAtLocation(e.x, e.y);
				if (this._dragSelection) {
					this._dropOffset = offset;
					this._dropText = text;
				} else {
					view.setText(text, offset, offset);
					view.setSelection(offset, offset + text.length);
				}
			}
		}
	};

	return {TextDND: TextDND};
});
/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andrew Eisenberg (VMWare) - initial API and implementation
 ******************************************************************************/

/**
 * This module creates a wrapper for a scripted editor. providing consistent API for plugins
 *
 */

define(function (require) {
	var deref = require('scripted/utils/deref');
	var textUtils = require('scripted/utils/textUtils');

	/**
	 * A wrapper for a scripted editor that exposes API suitable for plugin development
	 * @param {{}} editor the editor to wrap
	 */
	var EditorProxy = function(editor) {
		this._editor = editor;
	};

	EditorProxy.prototype = {
		/**
		 * Returns the line index at the given character offset.
		 * <p>
		 * The valid offsets are 0 to char count inclusive. The line index for
		 * char count is <code>line count - 1</code>. Returns <code>-1</code> if
		 * the offset is out of range.
		 * </p>
		 *
		 * @param {Number} offset a character offset.
		 * @returns {Number} the zero based line index or <code>-1</code> if out of range.
		 */
		getLineAtOffset : function(offset) {
			return this._editor.getLineAtOffset(offset);
		},

		/**
		 * Convert from a line and column to an editor offset
		 * @param {Number} line number
		 * @param {Number} column number
		 */
		toOffset : function(line, col) {
			var lineoffset = this._editor.getTextView().getModel().getLineStart(line);
			return lineoffset+col;
		},

		/**
		 * Gets the start and end offsets for the given offset into the editor's buffer
		 * @param Number offset
		 * @return {{start:Number,end:Number}}
		 */
		getCurrentLineRange : function(offset) {
			return this._editor.getCurrentLineRange(offset);
		},

		/**
		 * Creates a linked editing mode for the current editor
		 * The linked mode is empty and must be filled in.
		 * @see mEditorFeatures.LinkedMode
		 */
		createLinkedMode : function() {
			return this._editor.createLinkedMode();
		},

		/**
		 * Returns the text specified by the start and end locations in the editor's buffer.
		 * If start and end are missing, then all text is returned
		 * @param  Number? start
		 * @param  Number? emd
		 * @return String the text in the editor's buffer
		 */
		getText : function(start, end) {
			return this._editor.getText(start, end);
		},
		/**
		 * Replaces the text inside the start and end locations in the editor's buffer to the
		 * value of <code>text</code>.
		 * If start and end are missing, then all text is replaced
		 * @param  String text
		 * @param  Number? start
		 * @param  Number? emd
		 */
		setText : function(text, start, end) {
			return this._editor.setText(text, start, end);
		},


		/**
		 * @return {{start:Number,end:Number}}
		 */
		getSelection : function() {
			return this._editor.getSelection();
		},

		/**
		 * @param Number start
		 * @param Number end
		 * @param Boolean show? if true, then reveal the selection in the editor
		 */
		setSelection : function(start, end, show) {
			return this._editor.setSelection(start, end, show);
		},

		/**
		 * @return String the full path to the file in the editor
		 */
		getFilePath : function() {
			return this._editor.getFilePath();
		},

		/**
		 * @return String the content type (usually the file extension)
		 * of the file currently in the editor.
		 */
		getContentType : function() {
			return this._editor.getContentType();
		},

		/**
		 * Sets focus to this editor
		 */
		setFocus : function() {
			this._editor.getTextView().focus();
		},

		/**
		 * @param String key the dotted configuration key to retrieve
		 * @return String the cofiguration value specified by the key
		 */
		getConfig : function(key) {
			return deref(deref(window, ['scripted', 'config']), key.split('.'));
		},

		/**
		 * @return String the indentation specified in the scripted configuration
		 * defaults to \t
		 */
		getIndent : function() {
			return textUtils.indent();
		},

		/**
		 * @return the leading whitespace of the line specified by the offset
		 */
		getLeadingWhitespace : function(offset) {
			return textUtils.leadingWhitespace(this._editor.getText(), offset);
		},

		getScriptedProxy : function () {
			//This doesn't need wrapping it's already a wrapper
			return this;
		}
	};

	return EditorProxy;
});
/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andrew Eisenberg - initial API and implementation
 ******************************************************************************/

// implements a zen coding plugin for scripted

/*jslint browser:true */
/*global define emmet prompt scripted */

define(["orion/textview/keyBinding", 'scripted/utils/editorUtils', 'jquery', 'zen'],
	function(mKeyBinding,  editorUtils, $) {
	function ZenEditorProxy(editor) {
		this.editor = editor;
	}


	ZenEditorProxy.prototype = {
		init : function() {
			this.proxy = this.createProxy(this.editor);
			this.attach(this.editor);
		},
		createProxy: function(editor) {
			this.editorProxy = emmet.exec(function(req, _) {
				console.log("in editor proxy");
				return {
					setContext: function(context) {
						// fix tab size
						var res = req('resources');
						var utils = req('utils');
						var indentation;
						if (!context.expandtab) {
							indentation = '\t';
						} else {
							indentation = utils.repeatString(' ', context.tabsize);
						}
						res.setVariable('indentation', indentation);
						utils.setNewline('\n');
					},

					/**
					 * Returns character indexes of selected text: object with <code>start</code>
					 * and <code>end</code> properties. If there's no selection, should return
					 * object with <code>start</code> and <code>end</code> properties referring
					 * to current caret position
					 * @return {Object}
					 * @example
					 * var selection = editor.getSelectionRange();
					 * alert(selection.start + ', ' + selection.end);
					 */
					getSelectionRange: function() {
						return {
							start: editor.getSelection().start,
							end: editor.getSelection().end
						};
					},

					/**
					 * Creates selection from <code>start</code> to <code>end</code> character
					 * indexes. If <code>end</code> is ommited, this method should place caret
					 * and <code>start</code> index
					 * @param {Number} start
					 * @param {Number} [end]
					 * @example
					 * editor.createSelection(10, 40);
					 *
					 * //move caret to 15th character
					 * editor.createSelection(15);
					 */
					createSelection: function(start, end) {
						var editor = editorUtils.geteditor();
						if (!editor) {
							return null;
						}
						editor.setSelection(start, end);
					},

					/**
					 * Returns current line's start and end indexes as object with <code>start</code>
					 * and <code>end</code> properties
					 * @return {Object}
					 * @example
					 * var range = editor.getCurrentLineRange();
					 * alert(range.start + ', ' + range.end);
					 */
					getCurrentLineRange: function() {
						var selStart = this.getCaretPos();
						var model = editor.getTextView().getModel();
						var line = model.getLineAtOffset(selStart);

						var result = {
							start: model.getLineStart(line),
							end: model.getLineEnd(line)
						};

						return result;
					},

					/**
					 * Returns current caret position
					 * @return {Number|null}
					 */
					getCaretPos: function() {
						var sel = this.getSelectionRange();
						return Math.min(sel.start, sel.end);
					},
					/**
					 * Set new caret position
					 * @param {Number} pos Caret position
					 */
					setCaretPos: function(pos) {
						this.createSelection(pos, pos);
					},

					/**
					 * Returns content of current line
					 * @return {String}
					 */
					getCurrentLine: function() {
						var range = this.getCurrentLineRange();
						return this.getContent().substring(range.start, range.end);
					},
					/**
					 * Replace editor's content or it's part (from <code>start</code> to
					 * <code>end</code> index). If <code>value</code> contains
					 * <code>caret_placeholder</code>, the editor will put caret into
					 * this position. If you skip <code>start</code> and <code>end</code>
					 * arguments, the whole target's content will be replaced with
					 * <code>value</code>.
					 *
					 * If you pass <code>start</code> argument only,
					 * the <code>value</code> will be placed at <code>start</code> string
					 * index of current content.
					 *
					 * If you pass <code>start</code> and <code>end</code> arguments,
					 * the corresponding substring of current target's content will be
					 * replaced with <code>value</code>.
					 * @param {String} value Content you want to paste
					 * @param {Number} [start] Start index of editor's content
					 * @param {Number} [end] End index of editor's content
					 * @param {Boolean} [no_indent] Do not auto indent <code>value</code>
					 */
					replaceContent: function(value, start, end, noIndent) {

						// TODO not handling indent
						editor.getTextView().setText(value, start, end);
					},

					/**
					 * Returns editor's content
					 * @return {String}
					 */
					getContent: function() {
						return editor.getText();
					},

					// TODO This doesn't work!!!
					getSyntax: function() {
						return "html";
					},


					// TODO This doesn't work!!!
					getProfileName: function() {
						return null;
					},
					// TODO uhhhh...we can do better
					prompt: function(title) {
						return prompt(title);
					},

					getSelection: function() {
						var sel = this.getSelectionRange();
						if (sel) {
							return editor.getText(sel.start, sel.end);
						}

						return '';
					},

					/**
					 * Returns current editor's file path
					 * @return {String}
					 * @since 0.65
					 */
					getFilePath: function() {
						return editor.getFilePath();
					}
				};
			});
		},
		
		attach : function(editor) {
			function runEmmetAction(name, args) {
				return emmet.require('actions').run(name, args);
			}
		
			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("1", /*command/ctrl*/ false, /*shift*/ false, /*alt*/ true), "Zen merge_lines");
			editor.getTextView().setAction("Zen merge_lines", function() {
				console.log("Running emmet action");
				try {
					runEmmetAction("merge_lines");
				} catch (e) {
					console.log(e);
				}
				console.log("Running emmet action");
				return true;
			});
		},
		
		detach : function() {
			$(document).on('paneDestroyed', function(event, pane) {
				if (pane.editor === this.editor) {
					
					this.editor = null;
					this.proxy = null;
				}
			});
		}
	};
	
	$(document).on('paneCreated', function(event, pane) {
		if (pane.editor) {
			var proxy = new ZenEditorProxy(pane.editor);
			proxy.init();
		}
	});
	
	// probably don't need to return anything
//	return ZenEditorProxy;
});
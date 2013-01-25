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

define(["orion/textview/keyBinding", 'scripted/utils/textUtils', 'orion/editor/editorFeatures',
	'jquery', 'zen'],
	function(mKeyBinding, textUtils, editorFeatures, $) {
	function ZenEditorProxy(editor) {
		this.editor = editor;
	}

	var TAB_POS = "${0}";

	ZenEditorProxy.prototype = {
		init : function() {
			this.editorProxy = this.createProxy(this.editor);
			this.attach(this.editor);
		},
		createProxy: function(editor) {
			return emmet.exec(function(req, _) {
				// TODO shouldn't have to do this twice
				var res = req('resources');
				var utils = req('utils');
				res.setVariable('indentation', textUtils.indent());
				utils.setNewline('\n');
				return {
					setContext: function(context) {
						// TODO shouldn't have to do this twice
						var res = req('resources');
						var utils = req('utils');
						res.setVariable('indentation', textUtils.indent());
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

						if (!noIndent) {
							var leading = textUtils.leadingWhitespace(editor.getTextView().getText(), start);
							var regex = new RegExp('\n', "g");
							value = value.replace(regex, "\n" + leading);
						}
						editor.getTextView().setText(value, start, end);
						
						var pos = value.indexOf(TAB_POS);
						if (pos !== -1) {
							var linkedMode = new editorFeatures.LinkedMode(editor);
							var linkedModeModel = { groups : [] };
							while (pos !== -1) {
								linkedModeModel.groups.push({
									positions : [{
										offset: pos + start,
										length: TAB_POS.length
									}]});
								pos = value.indexOf(TAB_POS, pos + TAB_POS.length);
							}
							linkedMode.enterLinkedMode(linkedModeModel);
						}
					},

					/**
					 * Returns editor's content
					 * @return {String}
					 */
					getContent: function() {
						return editor.getText();
					},

					getSyntax: function() {
						return editor.getContentType();
					},


					getProfileName: function() {
						return this.getSyntax();
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
		
		runEmmetAction : function(name, args) {
			try {
				return emmet.require('actions').run(name, [this.editorProxy]);
			} catch (e) {
				console.warn(e.message);
				console.warn(e.stack);
				return false;
			}
		},
		
		registerEmmetAction : function(name, key) {
			this.editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(key.toString(), /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Zen " + name);
			this.editor.getTextView().setAction("Zen " + name, function() {
				this.runEmmetAction(name);
				return false;
			}.bind(this));
		},

		
		attach : function(editor) {
			
			var i = 0;
			this.registerEmmetAction("expand_abbreviation", ++i);
			this.registerEmmetAction("match_pair_inward", ++i);
			this.registerEmmetAction("match_pair_outward", ++i);
			this.registerEmmetAction("matching_pair", ++i);
			this.registerEmmetAction("merge_lines", ++i);
			this.registerEmmetAction("remove_tag", ++i);
			this.registerEmmetAction("select_next_item", ++i);
			this.registerEmmetAction("select_previous_item", ++i);
			this.registerEmmetAction("split_join_tag", ++i);
		},
		
		detach : function() {
			$(document).on('paneDestroyed', function(event, pane) {
				if (pane.editor === this.editor) {
					
					this.editor = null;
					this.editorProxy = null;
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
});
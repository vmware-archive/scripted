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
 *     Kris De Volder
 ******************************************************************************/

/*global $*/

//
// Implements the small inline 'dialog' that allows changing keybindings
// when they are clicked on in the help panel.
//

define([
	'./keybinder', './keystroke',
	'text!./keyedit.html', 'jquery'
],
function (mKeybinder, mKeystroke, keyeditHtml) {

	var setKeyBinding = mKeybinder.setKeyBinding;

	var uiRoot;

	function destroyUI() {
		if (uiRoot) {
			uiRoot.remove();
			uiRoot = null;
		}
	}
	
	function createUI(domParent, actionName, keystroke) {
		destroyUI();
		uiRoot = $(keyeditHtml);
		$(domParent).after(uiRoot);
		
		var input = $('.keybinding_editor_capture', uiRoot);
		var bindButton = $('.keybinding_editor_bind_button', uiRoot);
		var unbindButton = $('.keybinding_editor_unbind_button', uiRoot);
		var cancelButton = $('.keybinding_editor_cancel_button', uiRoot);
		var messageBox = $('.keybinding_editor_message', uiRoot);

		function showError(e) {
			console.error(e);
			messageBox.text(""+e);
		}
		
		function clearMessage() {
			messageBox.text('');
		}
		
		/**
		 * Create a click handler for a button. All the handlers in this
		 * ui do more or less the same thing except for a bit of button-specific
		 * code in the middle.
		 */
		function doAndClose(thunk) {
			return function () {
				clearMessage();
				try {
					thunk();
					destroyUI();
				} catch (e) {
					showError(e);
				}
				return false;
			};
		}

		if (keystroke) {
			input.val(keystroke);
		}
		input.focus();
		input.keydown(function (e) {
			var keystroke = mKeystroke.fromKeyDownEvent(e);
			if (keystroke==='Enter') {
				bindButton.click();
			} else {
				clearMessage();
				$(input).val(keystroke);
			}
			return false;
		});
		
		cancelButton.click(doAndClose(function (){}));
		bindButton.click(doAndClose(function () {
			var newKeystroke = input.val();
			if (newKeystroke) {
				if (keystroke) {
					setKeyBinding(keystroke, null);
				}
				setKeyBinding(newKeystroke, actionName);
			} else {
				throw new Error('Keystroke not specified');
			}
		}));
		if (keystroke) {
			unbindButton.click(doAndClose(function () {
				setKeyBinding(keystroke, null);
			}));
		} else {
			unbindButton.hide();
		}
	}
	
	/**
	 * Attach a 'key editor' to a element in the help panel. When this element is
	 * clicked the editor will appear beneath it.
	 */
	function attachKeyEditor(domElement, actionName, keystroke) {
		$('.shortcut_keystroke', domElement).click(function (e) {
			createUI(domElement, actionName, keystroke);
			return false;
		});
	}
	
	return {
		attachKeyEditor: attachKeyEditor
	};

});
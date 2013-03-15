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
 *     Andrew Eisenberg
 *     Andrew Clement
 *     Kris De Volder
 *     Christopher Johnson
 ******************************************************************************/
/*global $*/

// Self contained implementation of the help panel.
// should be loaded by the main app somehow.
// When loaded it sets itself up without requiring any further help
// from the main app.

define(['jsrender', 'jquery', './keybinder', './keystroke', './keyedit',
	"scripted/utils/editorUtils",'text!./_keybinding.tmpl.html', './action-info',
	"scripted/utils/server-options"],
function (mJsRender, mJquery, mKeybinder, mKeystroke, mKeyedit, editorUtil, commandTemplate, mActionInfo,
options) {

	var attachKeyEditor = options.keyedit ? mKeyedit.attachKeyEditor : function () {};
	var getActionDescription = mActionInfo.getActionDescription;
	var getCategory = mActionInfo.getCategory;

	function getSortedKeybindings() {
		// use a copy so we can sort
		var editor = editorUtil.getMainEditor();
		var keyBindings = editor.getTextView()._keyBindings.filter(function (kb) { return kb.actionID; });

		// not perfect since not all names are correct here, but pretty close
		keyBindings.sort(function(l,r) {
			var lname = getActionDescription(l.actionID);
			var rname = getActionDescription(r.actionID);
			if (lname) {
				lname = lname.toLowerCase();
			}
			if (rname) {
				rname = rname.toLowerCase();
			}
			if (lname < rname) {
				return -1;
			} else if (rname < lname) {
				return 1;
			} else {
				return 0;
			}
		});

		return keyBindings;
	}

	/**
	 * Render or re-render the current keybindings to the help side panel.
	 */
	function renderKeyHelp() {
		var editor = editorUtil.getMainEditor();

		$.views.converters({
			toKeystroke: mKeystroke.fromKeyBinding,
			toShortcutName: getActionDescription
		});

		var keyBindings = getSortedKeybindings();

		var importantKeyBindings = [];
		var otherKeyBindings = [];

		keyBindings.forEach(function (kb) {
			switch(getCategory(kb.actionID)) {
				case 'hidden':
					break;
				case 'trivial':
					otherKeyBindings.push(kb);
					break;
				default:
					importantKeyBindings.push(kb);
			}
		});

		var tmpl = $.templates(commandTemplate);

		function render(it, into) {
			if (Array.isArray(it)) {
				for (var i = 0; i < it.length; i++) {
					render(it[i], into);
				}
			} else {
			    var element = $(tmpl.render(it));
			    attachKeyEditor(element, it.actionID, mKeystroke.fromKeyBinding(it.keyBinding));
				into.append(element);
			}
		}

		var cl = $('#command_list');

		cl.empty();
		cl.append("<b>Click any key binding value to configure it. Scroll down to see unbound actions.</b>");
		cl.append('<li><hr /></li>');
		render(importantKeyBindings, cl);
		cl.append('<li><hr /></li>');
		render(otherKeyBindings, cl);
		cl.append('<li><hr /></li>');
		render(
			mKeybinder.getUnboundActionNames(editorUtil.getMainEditor()).filter(function (id) {
				return getCategory(id)!=='hidden';
			}).map(function (actionID) {
				return {
					actionID: actionID
				};
			}),
			cl
		);

		editor.getTextView()._update();
	}

	/*Command help panel*/
	var help_close, help_open;

	var isOpen = false;

	help_open = function (){
		renderKeyHelp();
		isOpen = true;
		$('#help_panel').show();
		$('#help_open').off('click');
		$('#help_open').on('click', help_close);
	};

	help_close = function(){
		$('#command_list').empty(); //destroy... saves memory?
		isOpen = false;
		$('#help_panel').hide();
		$('#help_open').off('click');
		$('#help_open').on('click', help_open);
	};

	$('#help_open').on('click', help_open);
	$('#help_panel').on('refresh', function () {
		if (isOpen) { //Don't bother to render if the panel is not visible.
			renderKeyHelp();
		}
	});

});


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

//////////////////////////////////////////////////////////////////////////////////
// This module provides some API to manage keybindings in a scripted editor.
//
// Stuff like retrieve the 'current keybindings' from a live scripted editor.
// Change the keybindings etc.
//////////////////////////////////////////////////////////////////////////////////

define(['./keystroke', 'scripted/utils/os', 'servlets/config-client'], function (mKeystroke, OS, mConfig) {

var keybinding2keystroke = mKeystroke.fromKeyBinding;
var keystroke2keybinding = mKeystroke.toKeyBinding;
var getScriptedRcFile = mConfig.getScriptedRcFile;

/**
 * Set (or unset) a keybinding on a specific editor.
 * A keybinding maps a keystroke to specific editor action.
 * @param editor Reference to a scripted editor.
 * @param {String} A Scripted keystroke string
 * @param {String|null} Name of an action to bind keystroke to an action or null to unbind.
 */
function setKeyBinding(editor, keySpec, actionName) {
	var tv = editor.getTextView();
	tv.setKeyBinding(
		keystroke2keybinding(keySpec),
		actionName
	);
}

function toJSON(kbs) {
	var json = {};
	for (var i = 0; i < kbs.length; i++) {
		var keyBinding = kbs[i];
		if (keyBinding.name) {
			json[keybinding2keystroke(keyBinding.keyBinding)] = keyBinding.name;
		}
	}
	return json;
}

/**
 * Retrieve an editor's current keybindings as JSON-able object in scripted format.
 */
function getEditorKeyBindingsConfig(editor) {
	return toJSON(editor.getTextView()._keyBindings.slice(0));
}

/**
 * Dumps a current key bindings for a given editor onto the console
 * in json format. The printed format should be something we
 * can copy paste into a config file.
 */
function dumpCurrentKeyBindings(editor) {
	console.log(JSON.stringify(getEditorKeyBindingsConfig(editor), null, '  '));
}

/**
 * Retrieve the user's custom keybindings and apply them to the given editor.
 */
function installOn(editor) {
	//Before modifying any key bindings dump out the current state as the defaults:
	console.log('default keybindings are: ');
	dumpCurrentKeyBindings(editor);

	var configName = 'keymap-'+OS.name;
	return getScriptedRcFile(configName).then(
		function (conf) {
			console.log('Retrieved config: '+configName);
			console.log(JSON.stringify(conf, null, '  '));
			//conf is a map from keystroke strings to editor action names
			for (var k in conf) {
				if (conf.hasOwnProperty(k)) {
					setKeyBinding(editor, k, conf[k]);
				}
			}
		},
		function (err) {
			console.error(err);
		}
	);
}

/**
 * Fetch a list of valid action names whether or not they are currently bound to
 * a key shortcut.
 */
function getUnboundActionNames(editor) {
	//There's no easy/quick way to find whether there's a keybinding for a given action name
	//So we build a set of bound names first.
	var kbs = getEditorKeyBindingsConfig(editor);
	var boundNamesMap = {};
	for (var k in kbs) {
		var boundName = kbs[k];
		if (boundName) {
			boundNamesMap[boundName] = true;
		}
	}
	return editor.getTextView().getActions(true)
	.filter(function (name) {
		return !boundNamesMap[name];
	});
}

return {
//	dumpActionNames: dumpActionNames,
	getEditorKeyBindingsConfig: getEditorKeyBindingsConfig,
	getUnboundActionNames: getUnboundActionNames,
	dumpCurrentKeyBindings: dumpCurrentKeyBindings,
	installOn: installOn
};

}); //end AMD define
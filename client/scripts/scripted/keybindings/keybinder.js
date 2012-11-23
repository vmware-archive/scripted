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
var getScriptedRcFile = mConfig.getScriptedRcFile;

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

function getCurrentKeyBindingsConfig(editor) {
	return editor.getTextView()._keyBindings.slice(0);
}

function dump(json) {
	console.log(JSON.stringify(json, null, "  "));
}

/**
 * Dumps a current key bindings for a given editor onto the console
 * in json format. The printed format should be something we
 * can copy paste into a config file.
 */
function dumpCurrentKeyBindings(editor) {
	dump(toJSON(getCurrentKeyBindingsConfig(editor)));
}

/**
 * Retrieve the user's custom keybindings and apply them to the given editor.
 */
function installOn(editor) {
	var configName = 'keymap-'+OS.name;
	return getScriptedRcFile(configName).then(
		function (conf) {
			console.log('Got config for '+configName);
			console.log(conf);
		},
		function (err) {
			console.error(err);
		}
	);
}

return {
//	dumpActionNames: dumpActionNames,
	dumpCurrentKeyBindings: dumpCurrentKeyBindings,
	installOn: installOn
};

}); //end AMD define
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

define(["orion/textview/keyBinding", './keynames'], function (mKeyBinding, mKeynames) {

var name2code = mKeynames.name2code;
var code2name = mKeynames.code2name;

var isMac = window.navigator.platform.indexOf("Mac") !== -1;

var KeyBinding = mKeyBinding.KeyBinding;

var mod1str = isMac ? "cmd" : "ctrl";
var mod2str = "shift";
var mod3str = "alt";
var mod4str = isMac ? "ctrl" : "meta";

// Keycodes info:
// http://www.webonweboff.com/tips/js/event_key_codes.aspx


////////// intialize the maps /////////////////////////////////////////////////

// Info for these stuff is from here:
// http://www.webonweboff.com/tips/js/event_key_codes.aspx


////////////////////////////////////////////////////////////////////////////////


function keybindingString(kb) {
	var pieces = [];
	if (kb.mod1) { pieces.push(mod1str); }
	if (kb.mod2) { pieces.push(mod2str); }
	if (kb.mod3) { pieces.push(mod3str); }
	if (kb.mod4) { pieces.push(mod4str); }
	pieces.push(code2name(kb.keyCode));
	return pieces.join('+');
}

function toJSON(kbs) {
	var json = {};
	for (var i = 0; i < kbs.length; i++) {
		var keyBinding = kbs[i];
		if (keyBinding.name) {
			json[keybindingString(keyBinding.keyBinding)] = keyBinding.name;
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

return {
	dumpCurrentKeyBindings: dumpCurrentKeyBindings
};

});//end amd define

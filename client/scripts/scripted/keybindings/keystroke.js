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

////////////////////////////////////////////////////////////////////////////////
// This module is responible for converting between scripted 'keystroke' spec
// Strings and other representations of shortcut keys, such as orion KeyBinding
// objects and javascript event objects.
//
// A keystroke spec or orion KeyBinding object
// represents a combination of pressing one regular key in combination with
// zero or more modifier keys. E.g. 'CTRL+ALT+ENTER', 'CTRL-J', ...
//
// Note that the between KeyBinding and keystroke strings is platform dependent
// because of the special handling orion does for CTRL and CMD keys.
////////////////////////////////////////////////////////////////////////////////

var name2code = mKeynames.name2code;
var code2name = mKeynames.code2name;

var isMac = window.navigator.platform.indexOf("Mac") !== -1;

var KeyBinding = mKeyBinding.KeyBinding;

///////////// Conversion from orion KeyBinding to scripted keystroke string.

//Maps user-friendly modifier names to orion equivalent 'mod1', 'mod2' ...
var mod2orion = {
	//IMPORTANT: Keys in this map must be all lower case!!!

	"ctrl": isMac ? "mod4" : "mod1",
	"cmd": isMac ? "mod1" : "mod4", //actually should be undefined on non-mac, but map it to something anyway.

	"shift": "mod2",
	"alt": "mod3",
	"meta": "mod4",

	//Allow using mod1...mod4 directly for more platform independent keybindings
	"mod1": "mod1",
	"mod2": "mod2",
	"mod3": "mod3",
	"mod4": "mod4"
};

/**
 * Convert a Scripted keystroke spec String into an equivalent Orion KeyBinding object.
 */
function toKeyBinding(specString) {
	//TODO: This is incomplete... it doesn't support the full syntax yet. Only single character
	// keys. Intead it should use keynames module to map keynames to keycodes.
	var pieces = specString.split("+");
	var parsed = {};
	for (var i = 0; i < pieces.length; i++) {
		var piece = pieces[i];
		if (piece.length===1) {
			//Assume that 'piece' represents a 'regular' key
			if (parsed.key) {
				throw 'Invalid key spec: '+specString;
			} else {
				parsed.key = piece;
			}
		} else {
			//Assume that 'piece' represents a 'modifier' key.
			piece = piece.toLowerCase(); //So people can use variations like CTRL, Ctrl etc.
			var modifier = mod2orion[piece];
			if (modifier) {
				parsed[modifier] = true;
			} else {
				throw 'Invalid key spec: '+specString+' unknown modifier key: '+piece;
			}
		}
	}
	return new mKeyBinding.KeyBinding(
		parsed.key, !!parsed.mod1, !!parsed.mod2, !!parsed.mod3, !!parsed.mod4
	);
}

////////////// Conversion from scripted keystroke string into Orion keybinding object

//The names Scripted uses for Orion's 'mod1', 'mod2' etc. modifier keys.
//These names are platform dependent!
var mod1str = isMac ? "Cmd" : "Ctrl";
var mod2str = "Shift";
var mod3str = "Alt";
var mod4str = isMac ? "Ctrl" : "Meta";

/**
 * Convert a Orion KeyBinding object into Scripted keystroke spec
 * String.
 *
 * @param {String}
 * @reture {KeyBinding}
 */
function fromKeyBinding(kb) {
	var pieces = [];
	if (kb.mod1) { pieces.push(mod1str); }
	if (kb.mod2) { pieces.push(mod2str); }
	if (kb.mod3) { pieces.push(mod3str); }
	if (kb.mod4) { pieces.push(mod4str); }
	pieces.push(code2name(kb.keyCode));
	return pieces.join('+');
}

return {
	toKeyBinding: toKeyBinding,
	fromKeyBinding: fromKeyBinding
};

});//end amd define

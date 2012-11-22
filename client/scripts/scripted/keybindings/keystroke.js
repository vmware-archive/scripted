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

//The names Scripted uses for Orion's 'mod1', 'mod2' etc. modifier keys.
//These names are platform dependent!
var mod1str = isMac ? "Cmd" : "Ctrl";
var mod2str = "Shift";
var mod3str = "Alt";
var mod4str = isMac ? "Ctrl" : "Meta";

/**
 * Convert a scripted keystroke spec String into an orion KeyBinding object.
 * @param {String}
 * @return {KeyBinding}
 */
function toKeyBinding(keystroke) {
	throw "Not yet implemented";
}

/**
 * Convert a Orion KeyBinding object into Scripted keystroke spec
 * String.
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

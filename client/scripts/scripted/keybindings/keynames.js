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

////////////////////////////////////////////////////////////////////////////////
// This module is responsible for mapping keycodes from javascript events
// into/from user-friendly names such 'TAB', 'Enter' etc.
//
// Info for this mapping came from here:
// http://www.webonweboff.com/tips/js/event_key_codes.aspx
//
// All keycode names are case insensitive and should not contain
// ' ' or '+' characters since these characters will have special
// meaning in denining keystrokes.
//
// This module only deals with names of *individual* keys not combinations
// of presing multiple keys at once like.
////////////////////////////////////////////////////////////////////////////////

define([], function () {

/**
 * maps keycode to user-friendly names for the key codes.
 */
var code2nameMap = {
};

/**
 * maps user-friendly names to keycodes.
 */
var name2codeMap = {
};

/**
 * Helper function to add code-name pairs to the maps.
 * A single key-code can have multiple names. The names
 * are case insensitive but case is preserved for the
 * code2name mapping. If more than one name is provided,
 * the first name is the 'preferred' name for code to
 * name mapping.
 */
function defCode(code, names /*...*/) {
    names = Array.prototype.slice.call(arguments, [1]);
	for (var i = 0; i < names.length; i++) {
		var name = names[i];
		if (i===0) {
			code2nameMap[code] = name;
		}
		//The first name is the preferred name
		name2codeMap[name.toLowerCase()] = code;
	}
}

//More synonyms can be added. Things to know:
//Forbidden characters in names are:
//  space, +
//Names are case insensitive.

defCode(8, "Backspace");
defCode(9, "Tab");
defCode(13, "Enter");
defCode(19, "Pause", "Break");
defCode(20, "Capslock");
defCode(27, "Esc", "Escape");
defCode(32, "Space");
defCode(33, "PgUp", "PageUp");
defCode(34, "PgDn", "PageDown");
defCode(35, "End");
defCode(36, "Home");
defCode(37, "Left", "ArrowLeft");
defCode(38, "Up", "ArrowUp");
defCode(39, "Right", "ArrowRight");
defCode(40, "Down", "ArrowDown");
defCode(45, "Ins", "Insert");
defCode(46, "Del", "Delete");

// Add numeric keys '0'...'9'
for (var i=0; i<=9; i++) {
	name = ''+i;
	defCode(48+i, name);
}

defCode(59, ";", ":");
defCode(61, "=", "Plus");

// Add all alpha chars to the name maps.
for (i=65 ; i <=90; i++) {
	var char = String.fromCharCode(i);
	defCode(i, char.toLowerCase());
}

defCode(91, "Windows");

// Numeric keys (on keypad)
for (i=0 ; i <=9; i++) {
	defCode(96+i, "Num"+i);
}
defCode(106, "Num*");
defCode(107, "NumPlus"); //can't use Num+ because plus is used to create combos: 'shift+ctrl+A'
defCode(109, 'Num-');
defCode(111, 'Num/');

// Add function keys F1..F12
for (i = 112; i<=123; i++) {
	defCode(i, 'F'+(i-111));
}

defCode(144, 'NumLock');
defCode(145, 'ScrollLock');
defCode(188, ',', '<');
defCode(190, '.', '>');
defCode(191, '/', 'slash', '?');
defCode(192, '`', '~', 'Backquote', 'Tilde');

defCode(219, '[', '{');
defCode(220, '\\', 'Backslash', '|');
defCode(221, ']', '}');
defCode(222, "'", '"', 'quote');



/**
 * Given a keycode from a keydown type of event return a user-friendly name
 * for this key.
 *
 * @param {Integer}
 * @return {String}
 */
function code2name(keyCode) {
	var str = code2nameMap[keyCode];
	if (str) {
		return str;
	}
	//If there's no 'special' name simply smack a '#' in front of the keycode.
	return '#'+keyCode;
}

/**
 * Given a user-friendly key name return the corresponding key code.
 *
 * @param {String}
 * @return {Integer}
 */
function name2code(keyName) {
	keyName = keyName.toLowerCase();
	if (keyName[0]==='#') {
		return parseInt(keyName.substring(1), 10);
	}
	var code = name2codeMap[keyName];
	if (code) {
		return code;
	}
	throw "Unknown key name: "+keyName;
}


return {
	code2name: code2name,
	name2code: name2code
};

});

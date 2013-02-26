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
 *     Andrew Eisenberg
 ******************************************************************************/

//
// Public facing API to register keybindings. This is the API that
// plugins should use. Keybindings registered via this API are
// applied in between 'default' keybindings and keybindings overridden
// via scripterc config file. This means that plugin keybindings can
// modify the defaults, and scriptedrc config files can modify
// plugin keybindings.
//

define(function(require){
	var keybinder = require('scripted/keybindings/keybinder');

	/**
	 * Assign a given actionID (either a built-in editor actionID, or one defined via
	 * editor-extensions.setAction) to a given keystroke.
	 * <p>
	 * This overwrites any prior keybinding associated with given keystroke if
	 *    - it was registered via this API method
	 *    - it was a built-in editor keybinding
	 * However, it does not override changes made to keybingings via the scripted keybindings help panel.
	 * The bindings made via the help panel have higher priority than those made via this API.
	 * <p>
	 * This allows plugins to define default keybindings while allowing users to still
	 * change them via the keybinder UI.
	 *
	 * @param {String} keystroke
	 * @param {String} actionID
	 */
	function setKeyBinding(keystroke, actionID) {
		//console.log('setKeybinding: '+keystroke + ' => ' +actionID );
		keybinder.setPluginKeyBinding(keystroke, actionID);
	}

	return {
		setKeyBinding : setKeyBinding
	};
});
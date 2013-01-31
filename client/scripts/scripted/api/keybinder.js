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

	function setKeyBinding(keystroke, action) {
		keybinder.setPluginKeyBinding(keystroke, action);
	}

	return {
		setKeyBinding : setKeyBinding
	};
});
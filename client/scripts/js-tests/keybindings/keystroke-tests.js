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

define(['scripted/keybindings/keystroke', 'scripted/utils/os'], function (_unconfigured, os) {

var tests = {};

function makeTests(isMac) {

	var mKeystroke = _unconfigured.configure(isMac);

	function makeToKeybindingsModifierKeysTest(isCmd, isCtrl, isShift, isAlt) {
		//We can run tests with 'cmd' key on non-mac PF because we just pretend is
		//is another name for 'meta' or 'mod4' on non-mac platforms.
	
		tests[(isMac ? 'mac' : '') +
			'ToKeyBindingModifierKeys' +
			(isCmd   ? 'Cmd'   : '') +
			(isCtrl  ? 'Ctrl'  : '') +
			(isShift ? 'Shift' : '') +
			(isAlt   ? 'Alt'   : '')
		] = function (test) {
			var kb = mKeystroke.toKeyBinding(
				(isCmd   ? 'CMD+'   : '') +
				(isCtrl  ? 'CTRL+'  : '') +
				(isShift ? 'SHIFT+' : '') +
				(isAlt   ? 'ALT+'   : '') +
				"DELETE"
			);
			test.equals(46, kb.keyCode); //DELETE
			test.equals(isCtrl, isMac ? kb.mod4 : kb.mod1); //CTRL
			test.equals(isShift, kb.mod2); //SHIFT
			test.equals(isAlt, kb.mod3); //ALT
			test.equals(isCmd, isMac ? kb.mod1 : kb.mod4); //CMD
			test.done();
		};
	}
	
	makeToKeybindingsModifierKeysTest(true, true, true, true);
	makeToKeybindingsModifierKeysTest(false, true, true, true);
	makeToKeybindingsModifierKeysTest(false, false, true, true);
	makeToKeybindingsModifierKeysTest(false, false, false, true);
	makeToKeybindingsModifierKeysTest(false, false, false, false);
	
	makeToKeybindingsModifierKeysTest(true,  false, false, false);
	makeToKeybindingsModifierKeysTest(false, true,  false, false);
	makeToKeybindingsModifierKeysTest(false, false, true,  false);
	makeToKeybindingsModifierKeysTest(false, false, false, true);
}

makeTests(true);  //mac platform tests
makeTests(false); //non-mac platform tests

return tests;

});
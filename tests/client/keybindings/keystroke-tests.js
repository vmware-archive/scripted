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

define(['scripted/keybindings/keystroke'], function (_unconfigured) {

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



	if (isMac) {
		tests.mac_ctrlF = function (test) {
			var ctrlF = mKeystroke.toKeyBinding("Ctrl+F");
			test.equals(false, ctrlF.mod1);
			test.equals(false, ctrlF.mod2);
			test.equals(false, ctrlF.mod3);
			test.equals(true, ctrlF.mod4);
			test.equals("Ctrl+F", mKeystroke.fromKeyBinding(ctrlF));
			
			var cmdF = mKeystroke.toKeyBinding("Cmd+F");
			test.equals(true,  cmdF.mod1);
			test.equals(false, cmdF.mod2);
			test.equals(false, cmdF.mod3);
			test.equals(false, cmdF.mod4);
			test.equals("Cmd+F", mKeystroke.fromKeyBinding(cmdF));
			
			test.equals(false, cmdF.equals(ctrlF));
			test.equals(false, ctrlF.equals(cmdF));
			test.equals(true, ctrlF.equals(ctrlF));
			test.equals(true, cmdF.equals(cmdF));
			
			test.done();
		};
	}
}

makeTests(true);  //mac platform tests
makeTests(false); //non-mac platform tests

return tests;

});
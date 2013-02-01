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
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/

/*global require define console window */
/*jslint browser:true devel:true*/

define(["require", "orion/textview/keyBinding",
	"scripted/keybindings/keystroke", "scripted/exec/exec-shared",
    'scripted/exec/param-resolver'], function (require, mKeyBinding, mKeystroke, mShared) {

	var MAX_NAME_LEN = 20; //use the first X chars of a cmdString to create the name of a command.
	
	var getConfig = mShared.getConfig;
	var makeExecFunction = mShared.makeExecFunction;

	var keystroke2keybinding = mKeystroke.toKeyBinding;

	function installOn(editor) {

		var replaceParams = require('scripted/exec/param-resolver').forEditor(editor).replaceParams;
		var namesUsed = {}; //Maps command names we've already used to a number (how many times we've used it.
		                    //Any *actual* names we've used that are used more than once will get a number appended
		                    //starting from the second use onward.
	
		function createCommandName(cmdSpec) {
			var name = (typeof(cmdSpec)==='object') && cmdSpec.name;
			if (!name) {
				var cmdString =  cmdSpec.cmd || cmdSpec;
				name = cmdString.substring(0, MAX_NAME_LEN); // First 20 chars (or less if string is shorter).
				if (cmdString.length > MAX_NAME_LEN) {
					name = name + "...";
				}
			}
			var useCount = namesUsed[name] || 0;
			useCount++;
			namesUsed[name] = useCount;
			if (useCount > 1) {
				name = name + " (" + useCount +")";
			}
			return "Exec: "+name;
		}
		
		function defineExecKeyBinding(editor, keySpec, cmdSpec) {
			var tv = editor.getTextView();
		
			var commandName = createCommandName(cmdSpec);
			var cmdExec = makeExecFunction(cmdSpec);
			
			tv.setKeyBinding(
				keystroke2keybinding(keySpec),
				commandName
			);
			var action = function() {
				cmdExec(replaceParams);
				return true; //stop event propagation.
			};
			tv.setAction(commandName, action, {
				name: commandName,
				global: true
			});
		}
		
		//BEGIN installOn function body
		var execKeyConfig = getConfig("onKeys");
		if (execKeyConfig) {
			for (var key in execKeyConfig) {
				if (execKeyConfig.hasOwnProperty(key)) {
					try {
						defineExecKeyBinding(editor,
							key,
							execKeyConfig[key]
						);
					} catch (e) {
						//Log and ignore broken/unparseable key bindings.
						console.log(e);
					}
				}
			}
		}//END installOn function
	}
	
	return {
		installOn: installOn
	};

});

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

/*global require define window console */

/////////////////////////////
// exec-shared: 
//
//   Common functionality shared between exec-keys and exec-after-save 
//
//   TODO: actually, exec-keys isn't using this yet. The code was merely copied
//     from it.
/////////////////////////////
define(['require', 'servlets/exec-client'], function (require) {

	var exec = require('servlets/exec-client').exec;

	/** 
	 * Follow a 'trail' of properties starting at given object. 
	 * If one of the values on the trail is 'falsy' then 
	 * this value is returned instead of trying to keep following the
	 * trail down.
	 */
	function deref(obj, props) {
		var it = obj;
		for (var i = 0; it && i < props.length; i++) {
			it = it[props[i]];
		}
		return it;
	}

	/**
	 * Given an evenType like 'onKeys' or 'afterSave', retrieve the corresponding
	 * config section in the .scripted file.
	 */
	function getConfig(eventType) {
		return deref(window, ["scripted", "config", "exec", eventType]);
	}
	
	/////////////////////////////////////////////
	
	function render(msg) {
		if (typeof(msg)==='string') {
			return msg;
		} else {
			return ""+msg;
		}
	}
	
	var execConsole = {
		log : function (msg) {
			console.log(render(msg));
		},
		error: function (msg) {
			console.error(render(msg));
		}
	};
	
	function makeExecFunction(cmdSpec) {
		//Start by normalizing the cmdSpec so it always has 'object form' and provides
		//suitable defaults for required options.
		if (typeof(cmdSpec)==='string') {
			cmdSpec = {
				cmd: cmdSpec
			};
		}
		cmdSpec.cwd = cmdSpec.cwd || "${projectDir}";
		cmdSpec.timeout = cmdSpec.timeout || 5000;
		
		return function(replaceParams) {
			var cmd = replaceParams(cmdSpec);
			execConsole.log("exec: " + cmd.cmd);
			exec(cmd,
				function(error, stdout, stderr) {
					if (stdout) {
						execConsole.log(stdout);
					}
					if (stderr) {
						execConsole.error(stderr);
					}
					if (error) {
						execConsole.error(error);
					}
				}
			);
		};
	}
	
	return {
		getConfig: getConfig,
		makeExecFunction: makeExecFunction
	};

});	

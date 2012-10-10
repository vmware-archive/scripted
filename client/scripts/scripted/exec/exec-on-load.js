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

define(['scripted/exec/param-resolver', 'scripted/exec/exec-shared'], function (mParamResolver, mExecShared) {

	// We are assuming that we can 
	// treat the actual loading of this file as the 'on-load' trigger.

	var getConfig = mExecShared.getConfig;
	var makeExecFunction = mExecShared.makeExecFunction;
	
	function installOn(fsroot) {

		var replaceParams = mParamResolver.forFsRoot(fsroot);

		function execCommand(cmdSpec) {
			makeExecFunction(cmdSpec)(replaceParams);
		}

		/**
		 * Parse and exec one or more command specs. The spec can either be an individual command
		 * spec or a array of command specs.
		 */
		function execCommands(cmdSpecs) {
			if (Array.isArray(cmdSpecs)) {
				for (var i = 0; i < cmdSpecs.length; i++) {
					execCommands(cmdSpecs[i]);
				}
			} else {
				//Not an array, assume it is an individual command spec
				execCommand(cmdSpecs);
			}
		}
		
		//BEGIN installOn function body		
		var onLoadConf = getConfig("onLoad");
		if (onLoadConf) {
			execCommands(onLoadConf);
		}
		
		//END installOn function
	}
	
	return {
		installOn: installOn
	};

});

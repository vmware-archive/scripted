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

	var getConfig = mExecShared.getConfig;
	var makeExecFunction = mExecShared.makeExecFunction;
	
	var SPECIAL = ".$^()[]{}+|?"; //TODO: other things in need of escaping?
	
	function mustEscape(c) {
		for (var i = 0; i < SPECIAL.length; i++) {
			if (SPECIAL[i]===c) {
				return true;
			}
		}
		return false;
	}
	
	/**
	 * Convert a pattern using '**' and '*' into a equivalent RegExp
	 * "**" surrounded by '/' will match any sequence of 'path segments', 
	 * including a sequence of length 0. Using ** without surrounding '/'
	 * is not legal and results in an error.
	 * "*" will match any sequence of chars excluding '/'
	 */
	function pat2regexp(pat) {
		//TODO: is all this string concatenation slow?
		var re = "^";
		var absolute = '/'===pat[0];
		if (!absolute) {
			pat = window.fsroot + "/" + pat;
		}
		
		var i = 0;
		while (i<pat.length) {
			if ("/**/"===pat.substring(i,i+4)) {
				re += "/(.*/)?";
				i+=4;
			} else if ("**"===pat.substring(i,i+2)) {
				throw "Bad pattern in exec afterSave block: "+pat+"\n '**' only allowed as follows '.../**/...'";
			} else {
				var c = pat[i++];
				if (c==='*') {
					re += "[^/]*"; //Sequence of chars not including a '/'
				} else if (mustEscape(c)) {
					re += "\\"+c; 
				} else {
					re += c;
				}
			}
		}
		re += "$";
		return new RegExp(re); 
	} 
	
	function installOn(editor) {

		var replaceParams = mParamResolver.forEditor(editor);

		var afterSaves = [];
	
		function defineAfterSaveBinding(pathPattern, cmdSpec) {
			afterSaves.push({
				re: pat2regexp(pathPattern),
				exec: makeExecFunction(cmdSpec)
			});
		}
		
		//BEGIN installOn function body		
		var afterSaveConf = getConfig("afterSave");
		if (afterSaveConf) {
			var empty = true;
			for (var filePat in afterSaveConf) {
				if (afterSaveConf.hasOwnProperty(filePat)) {
					try {
						defineAfterSaveBinding(filePat, afterSaveConf[filePat]);
						empty = false;
					} catch (e) {
						//Log and ignore broken/unparseable entries
						console.error(e);
					}
				}
			}
			
			if (!empty) {//install event listener only if there is at least one afterSave exec.
				editor.addEventListener("afterSave", function (evt) {
					var file = evt.file;
					for (var i = 0; i < afterSaves.length; i++) {
						var re = afterSaves[i].re;
						if (re.test(file)) {
							afterSaves[i].exec(replaceParams);
							return; //abort after the first match
						}
					}
				});
			}
		}
		//END installOn function
	}
	
	return {
		installOn: installOn
	};

});

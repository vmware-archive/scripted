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

define(['scripted/pathUtils'], function () {

// This module provides a mechanism to replace 'parameters' of the form ${name}
// inside of data objects. It walks the data object creating a copy of it, replacing
// all occurrences of the params in every string found in the data object. 

//Creates a parameter replacement function that is base on a given set of parameter definitions.
function createParamReplacer(paramDefs) {

	function resolve(param) {
		var resolverDef = paramDefs[param];
		if (typeof(resolverDef)==='function') {
			return resolverDef();
		}
		return resolverDef; //Assuming it's just a literal value
	}

	function replaceParams(target) {
		if (typeof(target)==='string') {
			var string = target;
			for (var param in paramDefs) {
				if (paramDefs.hasOwnProperty(param)) {
					while (string.indexOf(param)>=0) {
						var value = resolve(param);
						string = string.replace(param, value);
					}
				}
			}
			return string;
		} else if (typeof(target)==='object') {
			var copied = Array.isArray(target)?[]:{};
			for (var property in target) {
				if (target.hasOwnProperty(property)) {
					copied[property] = replaceParams(target[property]);
				}
			}
			return copied;
		} else {
			return target;
		}
	}

	return replaceParams;
}

var getDirectory = require('scripted/pathUtils').getDirectory;

//Create a param replacer function that 'resolves' parameters relative to
//a given editor context.
function forEditor(editor) {

	var paramDefs = {
	};
	
	function getDir() {
		return getDirectory(editor.getFilePath());
	}
	
	function def(param, resolverFunOrValue) {
		if (paramDefs[param]) {
			throw "Multiple definitions for param: "+param;
		}
		paramDefs[param] = resolverFunOrValue;
	}
	
	def("${file}", function() {
		return editor.getFilePath();				
	});
	
	def("${dir}", getDir);
	
	def("${projectDir}", function () {
		return window.fsroot || getDir();
	});

	return createParamReplacer(paramDefs);

}

function forFsRoot(fsroot) {
	return createParamReplacer({
		"${projectDir}": fsroot
	});
}

return {
	forEditor: forEditor,
	forFsRoot: forFsRoot
};

});

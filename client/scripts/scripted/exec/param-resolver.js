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

/*global require define window scripted */
/*jslint browser:true devel:true*/

define(['scripted/utils/textUtils', 'scripted/utils/pathUtils'], function (textUtils) {

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

	var PARAM_START = "${";
	var PARAM_END = "}";
	

	function internalDoit(target, calcInitialValue, doitFunc) {
		paramDefs.extraIndentLevel = 0;
		
		if (typeof(target)==='string') {
			var res = calcInitialValue(target);
			var curr = 0;
			// must replace parameters sequentially
			// because ${selection} requires it
			while (curr >= 0) {
				var next = target.indexOf(PARAM_START, curr);
				var param = null;
				if (next >= 0) {
					var nextEnd = target.indexOf(PARAM_END, next);
					if (nextEnd >= 0) {
						param = target.substring(next, nextEnd+1);
						curr = nextEnd + 1;
					} else {
						curr = next + 1;
					}

					if (param && paramDefs.hasOwnProperty(param)) {
						var value = resolve(param);
						res = doitFunc(res, param, value, next, nextEnd + 1);
					} else {
						// didn't find a param
						curr = next + 1;
					}
				} else {
					// we're done
					curr = -1;
				}
			}
			
			return res;
		} else if (typeof(target)==='object') {
			var copied = Array.isArray(target)?[]:{};
			for (var property in target) {
				if (target.hasOwnProperty(property)) {
					copied[property] = internalDoit(target[property], calcInitialValue, doitFunc);
				}
			}
			return copied;
		} else {
			return target;
		}
	}
	
	function replaceParams(target) {
		return internalDoit(target,
			function(target) { return target; },
			function(string, param, value, start, end) {
				return string.replace(param, value);
			});
	}
	
	/**
	 * Finds the replacements for a given target string.  Does not apply the replacements.
	 * Instead, returns an array of replacements that would be applied.
	 * @param {String} target the target text to determine replacements for
	 * @return {Array.<{start:Number,end:Number,text:String,lengthAdded:Number}>} an array of replacements that
	 * would be applied if the replaceParams function is called.  the lengthAdded property
	 * is the number of chars added minus the number of chars removed
	 */
	function findReplacements(target) {
		return internalDoit(target,
			function(target) { return []; },
			function(res, param, value, start, end) {
				res.push({start:start, end: end-1, text:value, lengthAdded:(value.length - end + start)});
				return res;
			});
	}
	
	return {
		replaceParams : replaceParams,
		findReplacements : findReplacements
	};
}


var getDirectory = require('scripted/utils/pathUtils').getDirectory;

//Create a param replacer function that 'resolves' parameters relative to
//a given editor context.
function forEditor(editor) {

	var paramDefs = {};
	
	// used to ensure that selection is transformed according to extra indents
	paramDefs.extraIndentLevel = 0;
	
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
	
	// Returns 'hello.js' from '/path/project/sub/helloworld.js'
	def("${fileName}", function() {
		var p = editor.getFilePath();
		return p.substring(p.lastIndexOf('/')+1);
	});
	
	// Returns 'sub/hello.js' from '/path/project/sub/helloworld.js'
	def("${filePath}", function() {
		var p = editor.getFilePath();
		return p.substring((window.fsroot || getDir()).length+1);
	});
	
	// Returns 'hello' from '/path/project/sub/helloworld.js'
	def("${fileBase}", function() {
		var p = editor.getFilePath();
		p = p.substring(p.lastIndexOf('/')+1);
		return p.substring(0, p.lastIndexOf('.'));
	});
	
	def("${dir}", getDir);
	
	def("${projectDir}", function () {
		return window.fsroot || getDir();
	});
	
	// function to return the leading offset of the currently selected line
	def("${lineStart}", function() {
		var offset = editor.getTextView().getSelection().start;
		var buffer = editor.getText();
		paramDefs.extraIndentLevel = 0;
		return textUtils.leadingWhitespace(buffer, offset);
	});
	
	var indentText;
	def("${indent}", function() {
		if (!indentText) {
			indentText = textUtils.indent();
		}
		paramDefs.extraIndentLevel++;
		return indentText;
	});
	
	def("${selection}", function() {
		var selection = editor.getTextView().getSelection();
		var text = editor.getText(selection.start, selection.end);
		
		// now add extra indents after each newline
		// find index of previous lineStart call
		var indentText = "";
		for (var i = 0; i < paramDefs.extraIndentLevel; i++) {
			indentText += paramDefs["${indent}"]();
			paramDefs.extraIndentLevel--;
		}
		var regex = new RegExp('\n', "g");
		text = text.replace(regex, "\n" + indentText);
		return text;
	});
	
	def("${year}", function() {
		return new Date().getFullYear();
	});
	
	// Other possible parameters
	// current line
	// current user name (requires server call)
	// time
	// date (but how to format???)
	
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

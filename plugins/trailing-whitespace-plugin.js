/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Kris De Volder (VMWare) - initial API and implementation
 ******************************************************************************/
 //Trailing white space removed by my-first-scripted-plugin
define(function(require) {

	console.log('Trailing white space removal plugin loaded');

	var editorApi = require('scripted/api/editor');
	
	function trimLines(text) {
		//TODO: It looks like this code below isn't quite right.
		// Deletes blank lines of text as well.   

		return text.replace(/[ \t][ \t]*$/gm, "");
		//The nice line of code above came from here:  
		//http://stackoverflow.com/questions/5568797/trim-trailing-spaces-before-newlines-in-a-single-multi-line-string-in-javascript
	}
	editorApi.onSaveTransform(function (text, filePath) {
		console.log('Trailing ws removal on: '+filePath);
		if (/.*.js$/.test(filePath)) { //Only .js files
			return trimLines(text);
		}
		//return undefined;
	});
});
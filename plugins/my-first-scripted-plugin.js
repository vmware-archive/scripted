define(function(require) {
	var editorApi = require('scripted/api/editor');
	function trimLines(text) {
		return text.replace(/\s\s*$/gm, "");
		//The nice line of code above came from here:
		//http://stackoverflow.com/questions/5568797/trim-trailing-spaces-before-newlines-in-a-single-multi-line-string-in-javascript
	}
	editorApi.onSaveTransform(function (text, filePath) {
		if (/.*.js$/.test(filePath)) { //Only .js files
			return  '//Trailing white space removed by my-first-scripted-plugin\n'+
					trimLines(text);
		}
		//return undefined;
	});
	console.log('my-first-scripted-plugin');
});
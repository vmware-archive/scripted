// This is a scripted plugin that checks on save of any .js file whether the file
// has a copyright header. If it does not than it adds one
define(function (require) {

	console.log('Copyright plugin loaded');

	// play with this regexp to define what a 'licence header' looks like
	var copyright = new RegExp('@license|\\* Copyright \\(c\\)');
	var defaultCopyright = require('text!./copyright.txt');
	var jsFile = /.*\.js$/;

	var editorApi = require('scripted/api/editor');
	var configApi = require('scripted/api/config');
	
	editorApi.onSaveTransform(function (text, path) {
		console.log('Checking for copyright header in '+path);
		if (jsFile.test(path)) {
			if (!copyright.test(text)) {
				return defaultCopyright + text;
			} else {
				console.log('Skip: already has copyright header');
			}
		} else {
			console.log('Skip: not a .js file');
		}
	});

});
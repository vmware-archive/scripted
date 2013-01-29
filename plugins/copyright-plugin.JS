// This is a scripted plugin that checks on save of any .js file whether the file
// has a copyright header. If it does not than it adds one
define(function (require) {

	console.log('Copyright plugin loaded');

	var editorApi = require('scripted/api/editor');
	
	var jsFile = /.*\.js$/;
	var copyright = new RegExp('@license|\\* Copyright \\(c\\)');
	var defaultCopyright =  require('text!./copyright.txt');

	editorApi.onSaveTransform(function (text, path) {
		return configApi.getConfig('copyright/text', path).then(function (copyrightHeader) {
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

});
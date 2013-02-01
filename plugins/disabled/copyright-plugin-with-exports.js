// This is a scripted plugin that checks on save of any .js file whether the file
// has a copyright header. If it does not than it adds one.

// The 'plugin model' used here assumes that plugin-loader will inspect what's
// being returned from the plugin module and if it sees 'special' properties
// will do something to hook them up.

// We could further simplify what a user has to write by automatically adding
// the commonsjs/amd module wrapper code somehow so the user doesn't have
// to write that boilerplate.
define(function (require, exports) {

	console.log('Copyright plugin loaded');

	// play with this regexp to define what a 'licence header' looks like
	var copyright = new RegExp('@license|\\* Copyright \\(c\\)');
	var defaultCopyright = require('text!./copyright.txt');
	var jsFile = /.*\.js$/;

	exports.onSaveTransform = function (text, path) {
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
	};

});
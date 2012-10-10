/*global requirejs require $*/

// paths not right
requirejs.config({
	packages:	[{ name: 'dojo', location: 'dojo', main:'lib/main-browser', lib:'.'},
				{ name: 'dijit',location: 'dijit',main:'lib/main',lib: '.'}], 
	paths: {
		i18n: 'requirejs/i18n',
		text: 'requirejs/text',
		fileapi: 'orion/editor/fileapi',
		jquery: 'lib/jquery-1.7.2.min',
		jquery_ui: 'lib/jquery-ui-custom',
		jsbeautify: 'orion/editor/beautify',
		jsrender: 'lib/jsrender',
		sockjs:'lib/sockjs-592774a-0.3.1.min'
	}
});

var MAX_RESULTS = 10;

//require(["servlets/incremental-search-client", "jquery"], function (isearch) {
//
//	var resultCount = 0;
//
//	$("#result").append("Hello<br>");
//	var mySearch = isearch("/home/kdvolder/server.js", "*util", {
////	var mySearch = isearch("/home/kdvolder/commandline-dev/new-tools/scripted/server/server.js", "*", {
//		add: function (path) {
//			resultCount++;
//			$("#result").append(path+"<br>");
//			if (resultCount>MAX_RESULTS) {
//				mySearch.cancel();
//			}
//		},
//		done: function () {
//			$("#result").append("DONE<br>");
//		}
//	});
//
//});

// paths not right
require(["servlets/jsdepend-client", "jquery"], function (jsdepend) {

	var resultCount = 0;

	$("#result").append("Hello<br>");
	jsdepend.getTransitiveDependencies("/home/kdvolder/commandline-dev/new-tools/scripted/server/jsdepend/api.js", function (deps) {
		console.log(deps);
	});

});

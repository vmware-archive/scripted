/*global requirejs require $*/
/*jslint isBroswer:true*/

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

// paths not right
require(["servlets/jsdepend-client", "jquery"], function (jsdepend) {

	function doit() {
		var file = $("#filename").val();
		var res = $("#result");
		res.text("");
		res.append("File for dependencies: " + file);
		var start = Date.now();
		jsdepend.getTransitiveDependencies(file, function (deps) {
			var end = Date.now();
			res.append("<br/>Time: " + (end-start) + "ms<br/>"); 
			res.append('<table id="new_table" border="10">');
			res = $("#new_table");
			for (var i = 0; i < deps.length; i++) {
				res.append("<tr><td>" + (i+1) + "</td><td>" + deps[i].name + "</td><td>" + deps[i].path + "</td></tr>");
			}
		});
	}
	
	$("#doit").click(doit);
});
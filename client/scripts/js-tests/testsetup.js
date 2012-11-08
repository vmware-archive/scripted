/*global requirejs */
requirejs.config({
		baseUrl: '../..',
		packages:	[{ name: 'dojo', location: 'lib/dojo', main:'lib/main-browser', lib:'.'},
					{ name: 'dijit',location: 'lib/dijit',main:'lib/main',lib: '.'}], 
		paths: {
			'orion/assert' : 'js-tests/assert',
			'esprima/esprima' : 'lib/esprima/esprima',
			'doctrine/doctrine' : 'lib/doctrine/doctrine',
			i18n: 'lib/requirejs/i18n',
			text: 'lib/requirejs/text',
			jquery_ui: 'lib/jquery-ui-custom',
			jsbeautify: 'lib/beautify',
			jsrender: 'lib/jsrender',
			jquery: 'lib/jquery-1.7.2.min',
			sockjs:'lib/sockjs-592774a-0.3.1.min',
			fileapi: 'scripted/fileapi',
			testutils: 'js-tests/common/testutils',
			qunit: 'lib/qunit/qunit-1.10.0'
		}
	});

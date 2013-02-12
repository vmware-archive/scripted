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

/*global require exports __dirname console */

//To run this test do this on the commandline:

//1) install nodeunit:
// 'cd ~'
// 'npm install nodeunit'
//2) run the tests
// 'cd <this-directory>'
// 'nodeunit <this-filename>'

// Good read about unit testing in node.js:
//
// http://caolanmcmahon.com/posts/unit_testing_in_node_js

// A way to run in debug mode (not tried yet)?
// node --debug `which nodeunit` test/run.js

var toCompareString = require('../../server/jsdepend/utils').toCompareString;

function makeApi(relativeBaseDir, options) {
	var baseDir = __dirname+'/test-resources/'+relativeBaseDir;
	var conf = require('../../server/utils/filesystem').withBaseDir(baseDir, options);
	return conf;
}

//exports.baseDirTest = function (test) {
//	var api = makeApi('simple-web');
//	test.equals(__dirname+'/test-resources/simple-web/bork.js', api.handle2file('bork.js'));
//	test.done();
//};

exports.isDirectory = function(test) {
	var api = makeApi('nested-web-with-scripts-folder');
	api.isDirectory('web-app/scripts', function (result) {
		test.equals(true, result);
		test.done();
	});
};

exports.isDirectoryFalse = function(test) {
	var api = makeApi('nested-web-with-scripts-folder');
	api.isDirectory('web-app/page.html', function (result) {
		test.equals(false, result);
		test.done();
	});
};

exports.isDirectoryNoExist = function(test) {
	var api = makeApi('nested-web-with-scripts-folder');
	api.isDirectory('web-app/bogus.what', function (result) {
		test.equals(false, result);
		test.done();
	});
};

exports.userHome = function (test) {
	var api = makeApi('nested-web', {
		userHome: 'HOME',
		scriptedHome: 'SCRIPTED'
	});
	test.equals('HOME', api.getUserHome());
	test.equals('SCRIPTED', api.getScriptedHome());
	test.done();
};
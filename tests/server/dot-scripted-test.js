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


//Hack Alert! so we can see where a log message is from:
//console.log = console.trace;
//This hack seriously messes up the log output. don't keep it on all the time!

var toCompareString = require('../../server/jsdepend/utils').toCompareString;
var map = require('../../server/jsdepend/utils').map;
var mapk = require('../../server/jsdepend/utils').mapk;
var filesystem = require('../../server/utils/filesystem');

function makeApi(relativeBaseDir) {
	var baseDir = __dirname+'/test-resources/'+relativeBaseDir;
	var testfs = filesystem.withBaseDir(baseDir, {
		userHome: 'user.home',
		scriptedHome: 'scripted.home'
	});
	var api = require('../../server/jsdepend/dot-scripted').configure(testfs);
	//We are in test mode so the 'private' apis are ok to use:
	for (var p in api.forTesting) {
		if (api.forTesting.hasOwnProperty(p)) {
			api[p] = api.forTesting[p];
		}
	}
	return api;
}

exports.readDotScripted = function (test) {
	var api = makeApi('like-scripted');
	api.getConfiguration('client/scripts/editor.js', function (conf) {
		test.equals(
			toCompareString({
				"lint": {
					"exclude_dirs": ["node_modules", "components"]
				},
				"search": {
					"exclude": "**/require.js",
					"deemphasize": ["**/test*", "**/.*", ["**/node_modules", "**/components"]]
				},
				"exec": {
					"onKeys": {
						"ctrl+alt+c": "node releng/copycheck.js"
					}
				},
				"ui": {
					"font_size": 11
				},
				"fsroot": "."
			}),
			toCompareString(conf)
		);
		test.done();
	});
};

exports.readScriptedRc = function (test) {
	var api = makeApi('with-scriptedrc');
	api.getConfiguration('bork/foo.js', function (conf) {
		test.equals(
			toCompareString({
				"lint": {
					"exclude_dirs": ["node_modules", "components"]
				},
				"search": {
					"exclude": "**/require.js",
					"deemphasize": ["**/test*", "**/.*", ["**/node_modules", "**/components"]]
				},
				"ui": {
					"font_size": 99
				},
				"fsroot": "bork"
			}),
			toCompareString(conf)
		);
		test.done();
	});
};

exports.combineScriptedRcAndDotScripted = function (test) {
	var api = makeApi('with-scriptedrc-and-dotscripted');
	api.getConfiguration('bork/foo.js', function (conf) {
		test.equals(
			toCompareString({
				"lint": {
					"exclude_dirs": ["node_modules", "components"]
				},
				"search": {
					"exclude": "**/require.js",
					"deemphasize": ["**/test*", "**/.*", ["**/node_modules", "**/components"]]
				},
				"readScriptedRc" : true,
			    "ui": {
					"font_size": 5
				},
			    "readDotScripted" : true,
				"fsroot" : "."
			}),
			toCompareString(conf)
		);
		test.done();
	});
};

exports.scriptedRcDir = function (test) {
	var api = makeApi('with-scriptedrc-dir');
	api.getConfiguration('bork/foo.js', function (conf) {
		test.equals(
			toCompareString({
				"lint": {
					"exclude_dirs": ["node_modules", "components"]
				},
				"search": {
					"exclude": "**/require.js",
					"deemphasize": ["**/test*", "**/.*", ["**/node_modules", "**/components"]]
				},
			    "ui": {
					"font_size": 99
				},
				"fsroot" : "bork"
			}),
			toCompareString(conf)
		);
		test.done();
	});
};

exports.getScriptedRcFile = function (test) {
	var api = makeApi('with-scriptedrc-dir');
	api.getScriptedRcFile('foo').then(function (conf) {
		test.equals(
			toCompareString({
				'hello' : 'from foo'
			}),
			toCompareString(conf)
		);
	}).then(function () {
		return api.getScriptedRcFile('bar').then(function (conf) {
			test.equals(
				toCompareString({
					'hello' : 'from bar'
				}),
				toCompareString(conf)
			);
		});
	}).then(function () {
		return api.getScriptedRcFile('no-exist').then(function (conf) {
			test.equals(
				toCompareString({}),
				toCompareString(conf)
			);
			test.done();
		});
	});
};

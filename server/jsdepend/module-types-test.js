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

var toCompareString = require('./utils').toCompareString;
var getModuleType = require("./module-types").getModuleType;
var esprima = require('./parser');
var configuration = require('./configuration');

var walk = require('./tree-walker').walk;

function dumpTree(parseTree) {
	console.log(JSON.stringify(parseTree, null, "  "));
}

function makeApi(relativeBaseDir) {
	var baseDir = __dirname+'/test-resources/'+relativeBaseDir;
	var conf = configuration.withBaseDir(baseDir);
	conf.sloppy = false;
	var api = require("./api").configure(conf);
	return api;
}

exports.nodeModuleWithAmdDefine = function (test) {
	var api = makeApi('node-with-amd-defines');
	api.getContents("utils.js", function (contents) {
		var parseTree = esprima.parse(contents);
		//dumpTree(parseTree);
		test.equals('commonjs', getModuleType(parseTree));
		test.done();
	});
};

exports.nodeModuleWithRequireCallsAndNoDefine = function (test) {
	var api = makeApi('node-plain');
	api.getContents("main.js", function (contents) {
		var parseTree = esprima.parse(contents);
		//dumpTree(parseTree);
		test.equals('commonjs', getModuleType(parseTree));
		test.done();
	});	
};

exports.nodeModuleWithExports = function (test) {
	var api = makeApi('node-plain');
	api.getContents("utils.js", function (contents) {
		var parseTree = esprima.parse(contents);
		//dumpTree(parseTree);
		test.equals('commonjs', getModuleType(parseTree));
		test.done();
	});	
};

exports.bigFile = function (test) {
	var api = makeApi('big-stuff');
	api.getContents("tree-matcher.js", function (contents) {
		var parseTree = esprima.parse(contents);
		//dumpTree(parseTree);
		test.equals('commonjs', getModuleType(parseTree));
		test.done();
	});	
};

exports.amdModuleWithoutADefine = function (test) {
	var api = makeApi('like-scripted');
	api.getContents("client/scripts/setup.js", function (contents) {
		var parseTree = esprima.parse(contents);
		//dumpTree(parseTree);
		test.equals('AMD', getModuleType(parseTree));
		test.done();
	});
};

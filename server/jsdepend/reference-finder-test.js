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
var findReferences = require("./reference-finder").findReferences;
var esprima = require('./parser');
var configuration = require('./configuration');

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

exports.borkTest = function (test) {
	var api = makeApi('simple-web');
	api.getContents("bork.js", function (contents) {
		var parseTree = esprima.parse(contents);
		//dumpTree(parseTree);
		findReferences(parseTree, function (references) {
			test.equals(toCompareString(references), toCompareString([
				{kind: 'AMD', name: 'foo'}
			]));
			test.done();
		});
	});
};

exports.requireCallAsRef = function (test) {
	var api = makeApi('simple-web');
	api.getContents("with-require-calls.js", function (contents) {
		var parseTree = esprima.parse(contents);
		//dumpTree(parseTree);
		findReferences(parseTree, function (references) {
			test.equals(toCompareString(references), toCompareString([
				{kind: 'AMD', name: 'bork'},
				{kind: 'AMD', name: 'foo'}
			]));
			test.done();
		});	
	});
};

exports.asynchRequireCallRefs = function (test) {
	var api = makeApi('simple-web');
	api.getContents("with-asynch-require-calls.js", function (contents) {
		var parseTree = esprima.parse(contents);
		//dumpTree(parseTree);
		findReferences(parseTree, function (references) {
			test.equals(toCompareString(references), toCompareString([
				{kind: 'AMD', name: 'require'},
				{kind: 'AMD', name: 'bork'},
				{kind: 'AMD', name: 'foo'},
				{kind: 'AMD', name: 'with-require-calls'}
			]));
			test.done();
		});	
	});
};

exports.commonjsRefs = function (test) {
	var api = makeApi('node-with-amd-defines');
	api.getContents("main.js", function (contents) {
		var parseTree = esprima.parse(contents);
		//dumpTree(parseTree);
		findReferences(parseTree, function (references) {
			test.equals(toCompareString(references), toCompareString([
				{kind: 'commonjs', name: 'amdefine'}, //TODO: perhaps we should filter this out.
				{kind: 'commonjs', name: './utils'}
			]));
			test.done();
		});	
	});
};

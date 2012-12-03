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
var _jsonMerge = require('../../server/jsdepend/json-merge');

function jsonMerge() {
	var m = _jsonMerge.apply(this, arguments);
	//makes it easier to see what we are actually testing:
	//console.log(toCompareString({args: arguments, "==>" : m}));
	return m;
}

exports.mergeWithNonObjectRight = function (test) {

	function doit(l, r) {
		//If the 'r' value is a non-object value but not undefined then the result should always
		// be the 'r' value.
		test.equals(r, jsonMerge(l, r));
	}

	var lefts = [undefined, "bar", 25, 0, "", {a: 'foo'}, [1,2]];
	var rights = ["foo", "", false, true, 25, 0, [1,2]]; // include some falsy values for good measure!
	for (var i = 0; i < lefts.length; i++) {
		var l = lefts[i];
		for (var j = 0; j < lefts.length; j++) {
			var r = rights[j];
			doit(l, r);
		}
	}
	test.done();
};

exports.mergeWithUndefined = function (test) {

	function doit(x) {
		//If one value is undefined the other value always 'wins'
		test.equals(x, jsonMerge(x, undefined));
		test.equals(x, jsonMerge(undefined, x));
	}

	var others = [undefined, "bar", 25, 0, "", {a: 'foo'}, [1,2]];
	
	for (var i = 0; i < others.length; i++) {
		var x = others[i];
		doit(x);
	}
	test.done();
};

exports.mergeObjects = function (test) {

	function doit(t) {
		test.equals(toCompareString(t),
			toCompareString({
				l: t.l, r: t.r,
				"==>":jsonMerge(t.l, t.r)
			})
		);
	}

	var tests = [
		//Empty objects
		{
			l: {},
			r: {},
			"==>" : {}
		},
		//Disjoint objects
		{
			l: { a: 1 },
			r: { b: 2 },
			"==>" : { a: 1, b:2 }
		},
		//Shared props
		{
			l: { a: 1, b:2 },
			r: { a: 100, b: 200 },
			"==>" : { a: 100, b:200 }
		},
		//l has more props than r
		{
			l: { a: 1, b:2 },
			r: { a: 100},
			"==>" : { a: 100, b:2 }
		},
		//r has more props than l
		{
			l: {},
			r: { a: 100, b:200},
			"==>" : { a: 100, b:200 }
		},
		//nested objects
		{
			l: { a: 1, b: {y: {x: 2 }}},
			r: { a: 100, b: { x: { y: 200 }}},
			"==>" : { a: 100, b: {y: {x: 2}, x: {y: 200} }}
		}
	];
	for (var i = 0; i < tests.length; i++) {
		var t = tests[i];
		doit(t);
	}
	test.done();
};

exports.mergeVarArguments = function (test) {
	function doit(t) {
		var result = jsonMerge.apply(null, t.args);
		test.equals(toCompareString(t),
			toCompareString({
				args  : t.args,
				'==>' : result
			})
		);
	}
	
	var tests = [
		{ //0 args
			args: [],
			'==>' : {}
		},
		{ //2 args
			args: [{a:1}],
			'==>' : {a:1}
		},
		{ //3 args
			args: [{a:1, c:1}, {a:2, b:3}],
			'==>' : {a:2, c:1, b:3}
		},
		{
			args: [{a:1, b:1}, {a:2, c:2}, {a:3, d:3}],
			'==>' : {a:3, b:1, c:2, d:3}
		}
	];
	for (var i = 0; i < tests.length; i++) {
		var t = tests[i];
		doit(t);
	}
	test.done();
};
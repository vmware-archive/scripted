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
 
/*global require exports */
var utils = require('./utils');
var toCompareString = toCompareString;
var orMap = utils.orMap;

exports.mapTest1 = function (test) {
	test.equals(toCompareString([10, 20, 30]),
		toCompareString([1, 2, 3].map(function (x) {return x*10; }))
	);
	test.done();
};

function toCompareString(obj) {
	return JSON.stringify(obj, null, '  ');
}

exports.orMapK = function (test) {
	var f = function (x, k) {
		k(x>2 && x*10); 
	};
	orMap([1, 2, 3, 4], f, function (result) {
		test.equals(result, 30);
		test.done();
	});
};

exports.orMapKfalse = function (test) {
	var f = function (x, k) {
		k(x>20 && x*10); 
	};
	orMap([1, 2, 3, 4], f, function (result) {
		test.equals(result, false);
		test.done();
	});
};

exports.orMapKempty = function (test) {
	var f = function (x, k) {
		k(x>2 && x*10); 
	};
	orMap([], f, function (result) {
		test.equals(result, false);
		test.done();
	});
};

exports.pathNormalize = function (test) {
	var normalize = require('./utils').pathNormalize;
	test.equals('a/b/c', normalize('a/b/c'));
	test.equals('.', normalize('.'));
	test.equals('a/d', normalize('a/b/c/../../d'));
	test.equals('../../foo', normalize('a/b/../../../../foo'));
	test.equals('/a/b', normalize('/a/b'));
//	test.equals('/a/b', normalize('/a/b/')); Trailing slahses aren't handled properly
//  test.equals('/a/b', normalize('/a//b')); Double slashes aren't handled properly
	test.done();
};

exports.getFileName = function (test) {
	var f = require('./utils').getFileName;
	test.equals(f("foo.txt"), "foo.txt");
	test.equals(f("/ho/ha/hi/foo.txt"), "foo.txt");
	test.done();
};
/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *   Kris De Volder
 ******************************************************************************/

var Fs = require('fake-fs');
var compose = require('../../../server/plugable-fs/composite-fs').compose;
var each = require('when');
var mapk = require('../../../server/jsdepend/utils').mapk;
var toCompareString = require('../../../server/jsdepend/utils').toCompareString;

exports.statLeftFsWins = function (test) {

	var fs1 = new Fs();
	fs1.dir('/foo');

	var fs2 = new Fs();
	fs2.file('/foo');

	var cfs = compose(fs1, fs2);
	cfs.stat('/foo', function (err, stats) {
		test.ok(!err);
		test.ok(stats);
		test.equals(true, stats.isDirectory() /*should get stats from fs1, not fs2!*/);
		test.done();
	});
};

exports.statLeftFailsThenUseRight = function (test) {

	var fs1 = new Fs();
//	fs1.dir('foo');

	var fs2 = new Fs();
	fs2.file('/foo');

	var cfs = compose(fs1, fs2);
	cfs.stat('/foo', function (err, stats) {
		test.equals(true, stats.isFile() /*should get stats from fs1 */);
		test.done();
	});
};

exports.statNeitherLeftOrRightHas = function (test) {
	var fs1 = new Fs();
//	fs1.dir('foo');

	var fs2 = new Fs();
//	fs2.file('/foo');

	var cfs = compose(fs1, fs2);
	cfs.stat('/foo', function (err, stats) {
		test.equals('ENOENT', err.code);
		test.done();
	});
};

exports.statCompositeOfThree = function (test) {

	var fs1 = new Fs();
	fs1.file('/foo');

	var fs2 = new Fs();
	fs2.file('/bar');

	var fs3 = new Fs();
	fs3.file('/zor');

	var cfs = compose(fs1, fs2, fs3);

	var names = ['/foo', '/bar', '/zor', '/bogus'];

	mapk(names,
		function (name, k) {
			cfs.stat(name, function (err, stats) {
				k(!err && stats.isFile());
			});
		},
		function (results) {
			test.equals(toCompareString(results), toCompareString([
				true, true, true, false
			]));
			test.done();
		}
	);


};
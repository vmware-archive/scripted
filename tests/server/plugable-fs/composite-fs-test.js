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

//readFile case where rightFs has the file and leftFs has a dir instead
exports.readFileCaseFileDir = function (test) {
	var fs1 = new Fs();
	fs1.file('/foo', 'This is foo on fs1');

	var fs2 = new Fs();
	fs2.dir('/foo');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(!err, ""+err);
		if (err && err.stack) {
			console.log(err.stack);
		}
		test.equals('This is foo on fs1', data);
		test.done();
	});
};

//readFile case where rightFs has the file and leftFs also has a file
exports.readFileCaseFileFile = function (test) {
	var fs1 = new Fs();
	fs1.file('/foo', 'This is foo on fs1');

	var fs2 = new Fs();
	fs2.file('/foo', 'foo on fs2 should be ignored');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(!err, ""+err);
		test.equals('This is foo on fs1', data);
		test.done();
	});
};

//readFile case where rightFs has the file and leftFs has not
exports.readFileCaseFileNothing = function (test) {
	var fs1 = new Fs();
	fs1.file('/foo', 'This is foo on fs1');

	var fs2 = new Fs();
	//nothing on fs2

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(!err, ""+err);
		test.equals('This is foo on fs1', data);
		test.done();
	});
};

//readFile case where rightFs has a dir file and leftFs has a file
exports.readFileCaseDirFile = function (test) {
	var fs1 = new Fs();
	fs1.dir('/foo');

	var fs2 = new Fs();
	fs2.file('/foo', 'foo on fs2 should be ignored');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(err); //There should be an error
		test.equals('EISDIR', err.code);
		test.ok(!data); //There shouldn't be data
		test.done();
	});
};

//readFile case where rightFs has a dir file and leftFs also has a dir
exports.readFileCaseDirDir = function (test) {
	var fs1 = new Fs();
	fs1.dir('/foo');

	var fs2 = new Fs();
	fs2.dir('/foo');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(err); //There should be an error
		test.equals('EISDIR', err.code);
		test.ok(!data); //There shouldn't be data
		test.done();
	});
};

//readFile case where rightFs has a dir file and leftFs has nothing
exports.readFileCaseDirNothing = function (test) {
	var fs1 = new Fs();
	fs1.dir('/foo');

	var fs2 = new Fs();
	//fs2 nothing

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(err); //There should be an error
		test.equals('EISDIR', err.code);
		test.ok(!data); //There shouldn't be data
		test.done();
	});
};

//readFile case where rightFs has nothing and leftFs has a file
exports.readFileCaseNothingFile = function (test) {
	var fs1 = new Fs();
	// nothing

	var fs2 = new Fs();
	fs2.file('/foo', 'foo on fs2 should be found');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(!err, ""+err);
		test.equals('foo on fs2 should be found', data);
		test.done();
	});
};

//readFile case where rightFs has nothing and leftFs has a file
exports.readFileCaseNothingDir = function (test) {
	var fs1 = new Fs();
	// nothing

	var fs2 = new Fs();
	fs2.dir('/foo');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(err); //There should be an error
		test.equals('EISDIR', err.code);
		test.ok(!data); //There shouldn't be data
		test.done();
	});
};

//readFile case where rightFs has nothing and leftFs also has nothing
exports.readFileCaseNothingNothing = function (test) {
	var fs1 = new Fs();
	// nothing

	var fs2 = new Fs();
	// nothing

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
//		console.log(err);
//		if (err && err.stack) {
//			console.log(err.stack);
//		}
		test.ok(err); //There should be an error
		test.equals('ENOENT', err.code);
		test.ok(!data); //There shouldn't be data
		test.done();
	});
};

//writeFile test with thre disjoint fss try to write to each of the
// three different fss and check that it worked out!
exports.writeFileThreeDisjointFss = function (test) {



};


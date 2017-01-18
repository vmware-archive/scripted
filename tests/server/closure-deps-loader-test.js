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
 *     Anh-Kiet Ngo
 ******************************************************************************/

//To run this test do this on the commandline:

var goog = require('../../server/jsdepend/closure-deps-loader');

exports.testRaceCondition = function (test) {
	goog.setDepsFile(__dirname + '/test-resources/closure-deps/deps1.js');
	var count = 0, tries = 4;
	function isFinished() {
		if (++count === tries) {
			test.done();
		}
	}
	function result(file) {
		isFinished();
		test.equals(file, './play-area/p/code.js');
	}

	for (var i = 0; i < tries; i++) {
		goog.getFile('foo.Bar', result);
	}
};

exports.testIfDepsAreReloaded = function (test) {
	goog.setDepsFile(__dirname + '/test-resources/closure-deps/deps1.js');
	
	goog.getFile('foo.Bar', function(file) {
		test.equals(file, './play-area/p/code.js');

		goog.setDepsFile(__dirname + '/test-resources/closure-deps/deps2.js');
		goog.getFile('foo.Bar', function(file) {
			test.equals(file, './play-area/p/bazzzzzzzzzzzzzzz.js');

			test.done();
		});
	});

};

exports.testBadDepsFile = function (test) {
	goog.setDepsFile(__dirname + '/test-resources/closure-deps/deps3.js');
	goog.getFile('foo.Bar', function() {});
	test.done();
};

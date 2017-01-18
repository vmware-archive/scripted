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

var toCompareString = require('../../server/jsdepend/utils').toCompareString;
var filesystem = require('../../server/utils/filesystem');
var closureResolver = require('../../server/jsdepend/closure-resolver');

function makeApi(baseDir) {
	var testfs = filesystem.withBaseDir(baseDir, {
		userHome: 'user.home',
		scriptedHome: 'scripted.home'
	});
	var api = require('../../server/jsdepend/dot-scripted').configure(testfs);
	return api;
}

exports.testFileResolutionWithoutPrefix = function (test) {
	var baseDir = __dirname+'/test-resources/closure-deps/without-prefix';
	var api = makeApi(baseDir);

	api.getConfiguration('', function(conf) {
		conf.rootDir = baseDir;
		var r = closureResolver.configure(null, conf);

		r.resolver('context', {name: 'foo.Bar'}, function(dep) {
			test.equals(dep.path, './play-area/p/code.js');
			test.done();
		});
	});
};

exports.testFileResolutionWithPrefix = function (test) {
	var baseDir = __dirname+'/test-resources/closure-deps/with-prefix';
	var api = makeApi(baseDir);

	api.getConfiguration('', function(conf) {
		conf.rootDir = baseDir;
		var r = closureResolver.configure(null, conf);

		r.resolver('context', {name: 'foo.Bar'}, function(dep) {
			test.equals(dep.path, '/some/prefix/to/tree/./play-area/p/code.js');
			test.done();
		});
	});
};


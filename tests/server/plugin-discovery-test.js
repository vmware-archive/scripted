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

//var toCompareString = require('../../server/jsdepend/utils').toCompareString;
var pathResolve = require('../../server/jsdepend/utils').pathResolve;
var mFilesystem = require('../../server/jsdepend/filesystem');
var each = require('../../server/utils/promises').each;

function makeApi(relativeBaseDir) {
	var baseDir = __dirname+'/test-resources/'+relativeBaseDir;
	var filesystem = mFilesystem.withBaseDir(baseDir);
	var api = require('../../server/plugin-support/plugin-discovery').configure(filesystem);
	api.parseJsonFile = require('../../server/utils/parse-json-file').configure(filesystem);

	//Also like to get access to the filesystem api in testing
	for (var p in filesystem) {
		if (filesystem.hasOwnProperty(p)) {
			api[p] = filesystem[p];
		}
	}

	return api;
}

function toCompareString(plugins) {
	plugins.sort(function (a, b) {
		if (a.name < b.name) {
			return -1;
		}
		if (a.name > b.name) {
			return +1;
		}
		return 0;
	});
	return JSON.stringify(plugins, null, '  ');
}

function doOneTest(test) {
	return function (name) {
		console.log(' > '+name);
		var api = makeApi('scripted-plugins/'+name);
		return api.parseJsonFile('expected.json').then(function (expected) {
			return api.getPlugins().then(function (plugins) {
				test.equals(toCompareString(expected), toCompareString(plugins));
			});

		});
	};
}

exports.all = function (test) {

	var api = makeApi('scripted-plugins');
	var root = '.';

	var doThemAll = each(api.listFiles(root), doOneTest(test));

	doThemAll.then(function () {
		test.done();
	});

};

//To run a separate test uncomment and use the code below
// ...

//exports.one = function (test) {
//	doOneTest(test)('with-package-json').then(function () {
//		test.done();
//	});
//};
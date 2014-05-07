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
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/

/*global require exports*/

var extend = require('../../server/jsdepend/utils').extend;

//TODO: add tests for 'glob.Or' and 'glob.fromJson'.

/**
 * exports a series of tests with a prefix added to the name
 */
function prefixed(prefix, tests) {
	for (var p in tests) {
		if (tests.hasOwnProperty(p)) {
			exports[prefix+p] = tests[p];
		}
	}
}

function makeApi(isWindows) {
	var baseApi = require('../../server/utils/path-glob').configure(isWindows);
	var extendedApi = extend(baseApi, {
		toRegexp: function (pat) {
			var glob = new baseApi.Glob(pat);
			return glob.regexp.toString();
		},
		matchTest: function (test, pat, path, expect) {
			var glob = new baseApi.Glob(pat);
			var actual = glob.test(path);
			test.equals(expect, actual, pat + " matches " + path + " ? " +actual +
				"\n   regexp = "+glob.regexp);
		}
	});
	return extendedApi;
}

/**
 * Tests specific to non-windows platform.
 */
function nonWindows() {

	var api = makeApi(false);
	var toRegexp = api.toRegexp;
	var matchTest = api.matchTest;

	return {
		toRegexp: function (test) {
			test.equals(toRegexp('/foo/bar.js'),
				'/^/foo/bar\\.js$/'
			);
			test.equals(toRegexp('foo.js'),
				'/^/foo\\.js$/'
			);
			test.equals(toRegexp('**/bar/*.js'),
				'/^/(.*/)?bar/[^/]*\\.js$/'
			);
			test.done();
		},
		match: function (test) {
			matchTest(test, '/foo/bar.js', '/foo/bar.js', true);
			matchTest(test, '/foo/bar.js', '/foo/foo.js', false);

			matchTest(test, '**/*.js', '/foo.js', true);
			matchTest(test, '**/*.js', '/bar/foo.js', true);
			matchTest(test, '**/*.js', '/zor/bar/foo.js', true);
			matchTest(test, '**/*.js', '/foo.css', false);
			matchTest(test, '**/*.js', '/bar/foo.css', false);
			matchTest(test, '**/*.js', '/zor/bar/foo.css', false);

			//Start these patterns with a '/'. Should mean same thing.
			matchTest(test, '/**/*.js', '/foo.js', true);
			matchTest(test, '/**/*.js', '/bar/foo.js', true);
			matchTest(test, '/**/*.js', '/zor/bar/foo.js', true);
			matchTest(test, '/**/*.js', '/foo.css', false);
			matchTest(test, '/**/*.js', '/bar/foo.css', false);
			matchTest(test, '/**/*.js', '/zor/bar/foo.css', false);

			//Verify that '*' doesn't match path separator
			matchTest(test, '**/foo/*.js', '/a/b/foo/bar.js', true);
			matchTest(test, '**/foo/*.js', '/a/b/foo/nested/bar.js', false);

			//Verify that '/**' at the end of a pattern works as desired
			matchTest(test, '/editor/**', '/editor', true);
			matchTest(test, '/editor/**', '/editor/', true);
			matchTest(test, '/editor/**', '/editor/foo/bar', true);
			matchTest(test, '/editor/**', '/editor/foo/bar/', true);
			matchTest(test, '/editor/**', '/editor-add-ons', false);
			matchTest(test, '/editor/**', '/editor-add-ons/', false);
			matchTest(test, '/editor/**', '/editor-add-ons/foo', false);

			test.done();
		}
	};
}

/**
 * Tests specific to windows platform.
 */
function windows() {

	var api = makeApi(true);
	var toRegexp = api.toRegexp;
	var matchTest = api.matchTest;

	return {
		match: function (test) {
			matchTest(test, '/foo/bar.js', 'C:/foo/bar.js', true);
			matchTest(test, '/foo/bar.js', 'D:/foo/bar.js', true);
			matchTest(test, '/foo/bar.js', 'C:/foo/foo.js', false);

			matchTest(test, '**/*.js', 'C:/foo.js', true);
			matchTest(test, '**/*.js', 'D:/bar/foo.js', true);
			matchTest(test, '**/*.js', 'E:/zor/bar/foo.js', true);
			matchTest(test, '**/*.js', 'F:/foo.css', false);
			matchTest(test, '**/*.js', 'G:/bar/foo.css', false);
			matchTest(test, '**/*.js', 'H:/zor/bar/foo.css', false);

			matchTest(test, 'C:/**/foo.js', 'C:/foo.js', true);
			matchTest(test, 'C:/**/foo.js', 'D:/foo.js', false);
			matchTest(test, 'C:/**/foo.js', 'C:/a/foo.js', true);
			matchTest(test, 'C:/**/foo.js', 'D:/a/foo.js', false);
			matchTest(test, 'C:/**/foo.js', 'C:/a/b/foo.js', true);
			matchTest(test, 'C:/**/foo.js', 'D:/a/b/foo.js', false);

			//Ommitting the '/' after device is ok (though somewhat weird).
			matchTest(test, 'C:**/foo.js', 'C:/foo.js', true);
			matchTest(test, 'C:**/foo.js', 'D:/foo.js', false);
			matchTest(test, 'C:**/foo.js', 'C:/a/foo.js', true);
			matchTest(test, 'C:**/foo.js', 'D:/a/foo.js', false);
			matchTest(test, 'C:**/foo.js', 'C:/a/b/foo.js', true);
			matchTest(test, 'C:**/foo.js', 'D:/a/b/foo.js', false);

			//Using backslashes in patterns should work ok on windows.

			matchTest(test, '\\foo\\bar.js', 'C:/foo/bar.js', true);
			matchTest(test, '\\foo\\bar.js', 'D:/foo/bar.js', true);
			matchTest(test, '\\foo\\bar.js', 'C:/foo/foo.js', false);

			matchTest(test, '**\\*.js', 'C:/foo.js', true);
			matchTest(test, '**\\*.js', 'D:/bar/foo.js', true);
			matchTest(test, '**\\*.js', 'E:/zor/bar/foo.js', true);
			matchTest(test, '**\\*.js', 'F:/foo.css', false);
			matchTest(test, '**\\*.js', 'G:/bar/foo.css', false);
			matchTest(test, '**\\*.js', 'H:/zor/bar/foo.css', false);

			matchTest(test, 'C:\\**\\foo.js', 'C:/foo.js', true);
			matchTest(test, 'C:\\**\\foo.js', 'D:/foo.js', false);
			matchTest(test, 'C:\\**\\foo.js', 'C:/a/foo.js', true);
			matchTest(test, 'C:\\**\\foo.js', 'D:/a/foo.js', false);
			matchTest(test, 'C:\\**\\foo.js', 'C:/a/b/foo.js', true);
			matchTest(test, 'C:\\**\\foo.js', 'D:/a/b/foo.js', false);

			matchTest(test, 'C:\\**\\foo.js', 'C:/foo.js', true);
			matchTest(test, 'C:\\**\\foo.js', 'D:/foo.js', false);
			matchTest(test, 'C:\\**\\foo.js', 'C:/a/foo.js', true);
			matchTest(test, 'C:\\**\\foo.js', 'D:/a/foo.js', false);
			matchTest(test, 'C:\\**\\foo.js', 'C:/a/b/foo.js', true);
			matchTest(test, 'C:\\**\\foo.js', 'D:/a/b/foo.js', false);

			//Slashes in patterns should also match '\' in paths
			matchTest(test, 'C:/a/foo.js', 'C:\\a\\foo.js', true);
			matchTest(test, 'C:/a/foo.js', 'D:\\a\\foo.js', false);

			//Verify that '*' doesn't match path separator
			matchTest(test, '**/foo/*.js', 'C:/a/b/foo/bar.js', true);
			matchTest(test, '**/foo/*.js', 'C:/a/b/foo/nested/bar.js', false);
			matchTest(test, '**/foo/*.js', 'C:\\a\\b\\foo\\bar.js', true);
			matchTest(test, '**/foo/*.js', 'C:\\a\\b\\foo\\nested\\bar.js', false);

			test.done();
		}


	};
}

prefixed("nowin_", nonWindows());
prefixed("win_", windows());


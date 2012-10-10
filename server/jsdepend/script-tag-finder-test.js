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
var toCompareString = require('./utils').toCompareString;
var stf = require('./script-tag-finder');
var getScriptTags = stf.getScriptTags;
var getScriptCode = stf.getScriptCode;
var assertContains = require('./test-utils').assertContains;

function makeApi(relativeBaseDir, reducedConfig) {
	var baseDir = __dirname+'/test-resources/'+relativeBaseDir;
	var conf = require('./configuration').withBaseDir(baseDir);
	if (reducedConfig) {
		conf.listFiles = undefined;
	}
	conf.sloppy = false;
	var api = require("./api").configure(conf);
	return api;
}

exports.getScriptTags = function (test) {
	var files = makeApi('simple-web');
	files.getContents('page.html', function (contents) {
		var tags = getScriptTags(contents);
		test.equals(1, tags.length);
		test.equals('bork', tags[0].attribs['data-main']);
		test.done();
	});
};

exports.getScriptCode = function (test) {
	var files = makeApi('requirejs-basedir/web');
	files.getContents('index.html', function (contents) {
		var tags = getScriptTags(contents);
		test.equals(2, tags.length);
		test.equals(!!getScriptCode(tags[0]), false); // First tag has no code. Should find something that counts as a 'false'.
		assertContains(test, "baseUrl: 'scripts'", getScriptCode(tags[1]));
		test.done();
	});
};
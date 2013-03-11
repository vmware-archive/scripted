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

var cache = require('./rest-node-manager').configure({
	limit: 2500 // Limits number of in-memory cached nodes.
});


var fs = require('./github-repo-fs').configure({
	token: require('./secret').token,
	owner: 'kdvolder',
	repo: 'playground',
	cache: cache
});



var fetch = fs.forTesting.fetch;
var rest = fs.forTesting.rest;
//rest({
//	path: 'http://api.github.com/repos/kdvolder/playground/git/trees/76a125ab17535dd744b8c138cf2f2e3f8fa55392'
var scriptedFs = require('../scripted-fs');
var sfs = scriptedFs.configure(fs);

var path = '/README.md';

//fs.readdir('/kdvolder/playground/subdir', function (err, names) {
//	console.dir(names);
//	fs.stat('/kdvolder/playground', function (err, stats) {
//		console.log('2');
//		console.dir(stats);
//	});
//});

sfs.getContents(path).then(function (x) {
	console.log(x);
}).then(function (x) {
	return sfs.getContents(path);
}).then(function (x) {
	console.log(x);
}).otherwise(function (err) {
	console.log(err);
	if (err.stack) {
		console.log(err.stack);
	}
});


//fs.readdir(path, function (err, names) {
//	console.log('Listed files for "'+path+'"');
//	if (err) {
//		console.log('FAILED');
//		console.error(err);
//	} else {
//		console.log(JSON.stringify(names, null, '  '));
//	}
//});

//var fswalk = require('../jsdepend/fswalk').configure(sfs).fswalk;
//
//fswalk('/', function (path) {
//	console.log(path);
//}, function () {
//	console.log('DONE');
//});

//function getType(stats) {
//	if (stats.isDirectory()) {
//		return 'dir';
//	} else if (stats.isFile()) {
//		return 'file';
//	} else {
//		return 'UNKNOWN';
//	}
//}
//
//fs.stat(path, function (err, stats) {
//	if (err) {
//		console.log('FAILED');
//		console.error(err);
//	} else {
//		console.log(getType(stats));
//	}
//});

//fs.githubRateLimit();
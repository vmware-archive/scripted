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

var fs = require('./github-fs').configure({
	token: '4c67f6a0107750cb830bc7bf3dd6438f0a7d7da9'
});

var scriptedFs = require('./scripted-fs');
var sfs = scriptedFs.configure(fs);

var path = '/kdvolder/playground/README.md';

fs.readdir('/kdvolder/playground/subdir', function (err, names) {
	console.dir(names);
	fs.stat('/kdvolder/playground', function (err, stats) {
		console.log('2');
		console.dir(stats);
	});
});

//sfs.getContents(path).then(function (x) {
//	console.log(x);
//}).otherwise(function (err) {
//	console.log(err);
//	if (err.stack) {
//		console.log(err.stack);
//	}
//});
//


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
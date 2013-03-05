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

var nodefs = require('fs');
var pathGlob = require('./path-glob').fromJson;
var filesystem = require('../plugable-fs/scripted-fs').configure(
	nodefs
);
var pathResolve = require('../jsdepend/utils').pathResolve;
var extend = require('../jsdepend/utils').extend;
var delay = require('when/delay');

//var root = pathResolve(__dirname, '../..');
var root = '/home/kdvolder/commandline-dev/new-tools/scripted/node_modules';
var thirdParty = pathGlob([
	'/**/node_modules',
	'/**/components'
]);
var projectLower = pathGlob('/**/test*');
var invisible = pathGlob('/**/.git');

function priority(path) {
	if (projectLower.test(path)) {
		return -1; //lower priority that normal project files.
	} else if (thirdParty.test(path)) {
		return -2; //lower priority than project files
	} else if (invisible.test(path)) {
		return "invisible"; //hidden files, should match stuff like hash/cache directories, source control dirs
		                    // etc... anything you don't really ever want to see or search.
	}
	//return 0;
}

var fswalk = require('./fs-priority-walk').configure(filesystem);

fswalk(root, priority, function (path) {
	console.log('Visit: '+path);
	return delay(undefined, 1);
}).then(function (val) {
	console.log('Done');
}).otherwise(function (err) {
	console.error(err);
});

//var when = require('when');
//
//function fswalk(i, work) {
//	var q = i;
//	function walk() {
//		if (q === 0) {
//			return when.resolve();
//		} else {
//			return when(work(q--)).then(walk);
//		}
//	}
//	return walk();
//}
//
//function work(i) {
//	var d = when.defer();
//	process.nextTick(function() {
//		console.log(i);
//		d.resolve();
//	});
//	return d.promise;
//}
//
//fswalk(100000, work).then(function () {
//	console.log('Done');
//}).otherwise(function (err) {
//	console.error(err);
//});

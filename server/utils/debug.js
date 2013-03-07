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

var whileLoop = require('./promises').whileLoop;
var delay = require('when/delay');

function testLoop(count) {
	return whileLoop(
		function () {
//			if (count===3) {
//				throw new Error('Condition has a bug on 3');
//			}
			return count>0;
		},
		function () {
//			if (count===3) {
//				throw new Error('Body has a bug on 3');
//			}
			console.log(count--);
			return delay(null, 1);
		}
	);
}

testLoop(10000).then(function () {
	console.log('Done');
}).otherwise(function (err) {
	console.log(err);
});


//var each = require('./promises').each;
//var nodefs = require('fs');
//var pathGlob = require('./path-glob').fromJson;
//var filesystem = require('../plugable-fs/scripted-fs').configure(
//	nodefs
//);
//var pathResolve = require('../jsdepend/utils').pathResolve;
//var extend = require('../jsdepend/utils').extend;
//var delay = require('when/delay');
//var timeout = require('when/timeout');
//
////var root = pathResolve(__dirname, '../..');
////var root = '/home/kdvolder/commandline-dev/new-tools/scripted/node_modules';
//
//var thirdParty = pathGlob([
//	'/**/node_modules',
//	'/**/components'
//]);
//var projectLower = pathGlob('/**/test*');
//var invisible = pathGlob('/**/.git');
//
//function priority(path) {
//	if (projectLower.test(path)) {
//		return -1; //lower priority that normal project files.
//	} else if (thirdParty.test(path)) {
//		return -2; //lower priority than project files
//	} else if (invisible.test(path)) {
//		return "invisible"; //hidden files, should match stuff like hash/cache directories, source control dirs
//		                    // etc... anything you don't really ever want to see or search.
//	}
//	//return 0;
//}
//
//var fswalk = require('./fs-priority-walk').configure(filesystem);
//
//var dirs = ['/home/kdvolder/commandline-dev/new-tools/scripted/node_modules'];
//
//each(dirs, function (root) {
//	var result = fswalk(root, priority, function (path) {
////		if (path.indexOf('websocket.io')>=0) {
////			throw new Error('Bad path rejected: '+path);
////		}
//		//console.log('Visit: '+path);
//		return delay(undefined, 1);
//	});
//	return timeout(result, 60000).then(function () {
//		console.log('DONE:  '+root);
//	}).otherwise(function (err) {
//		console.log('BAD: '+root);
//		console.log(err);
//	});
//}).then(function() {
//	console.log('===================================================');
//}).otherwise(function (err) {
//	console.error(err);
//});


//fswalk(root, priority, function (path) {
//	console.log('Visit: '+path);
//	return delay(undefined, 1);
//}).then(function (val) {
//	console.log('Done');
//}).otherwise(function (err) {
//	console.error(err);
//});


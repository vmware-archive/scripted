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

/*global setTimeout console __dirname require exports */

var EVENT_WAIT_TIME = 500;
var fs = require("fs");
var testDir = __dirname+"/tests";
var wrench = require('wrench');
var makeWatcher = require('./dirwatch').makeWatcher;

var dirWatcher = null; //The currently active watcher for the current test.
var events = null; //Where the current test will record events

function isDirectory(path, k) {
	fs.stat(path, function (err, stat) {
		k(!err && stat.isDirectory());
	});
}

function mkDir(path) {
	fs.mkdirSync(path);
}

function createFile(path, contents, k) {
	fs.writeFile(path, contents, function (err) {
		if (err) {
			throw err;
		}
		k();
	});
}

function checkEvent(test, expectType, expectPath, k) {
	setTimeout(
		function () {
			test.ok(events.length>0, "No events, but expected "+expectType+" : "+expectPath);
			test.equals(expectType, events[0].type);
			if (expectPath) {
				test.equals(expectPath, events[0].path);
			}
			events.splice(0,1);
			k();
		},
		EVENT_WAIT_TIME
	);
}

function checkNoEvents(test, k) {
	setTimeout(
		function () {
			test.ok(events.length===0, 'Extra events where fired: '+events[0].type + " : "+events[0].path);
			k();
		},
		EVENT_WAIT_TIME
	);
}

exports.setUp = function (k) {
	console.log('Setting up');
	mkDir(testDir);
	
	function testListener(eventType, path) {
		console.log(eventType+ " : "+path);
		events.push({type: eventType, path:path});
	}
	
	events = [];
	dirWatcher = makeWatcher(testDir, testListener);
	k();
};

exports.tearDown = function (k) {
	console.log('Tearing down');
	wrench.rmdirSyncRecursive(testDir, true);
	dirWatcher.dispose();
	dirWatcher = null;
	k();
};

exports.testSetup = function (test) {
	isDirectory(testDir, function (isDir) {
		test.ok(isDir,  testDir + ' should be a directory');
		test.done();
	});
};

exports.testSeeNewFile = function (test) {
	createFile(testDir+'/foo.txt', 'This is foo', function () {
		checkEvent(test, 'created', testDir+'/foo.txt', function () {
			createFile(testDir+'/bar.txt', 'This is bar', function () {
				checkEvent(test, 'created', testDir+'/bar.txt', function () {
					checkNoEvents(test, function () {
						test.done();
					});
				});
			});
		});
	});
	
//	createFile(testDir+'/bar.txt', 'This is bar');
//	checkEvent(test, 'rename', testDir+'/foo.txt');
//	checkNoEvents(test);
//	
//	createFile(testDir+'/zor.txt', 'This is bar');
//	checkEvent(test, 'rename', testDir+'/foo.txt');
//	checkNoEvents(test);

//	test.done();
};


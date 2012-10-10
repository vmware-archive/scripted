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
 
//
// This is a 'script' to do some manual testing of the 'dirwatch' infrastructure.
// It use the dirwatch to watch the scripted code-tree and prints messages
// when events are triggered.
 
/*global console __dirname require*/
var dirwatch = require('./dirwatch');
var path = require('path');

var dirToWatch = path.normalize(__dirname+"/../..");
//var dirToWatch = "/home/kdvolder"; //Stress test

//var dirToWatch = '/'; //Stress test... see how / if it blows up completely
//=> runs out of memory after a while and crashes (when it is using around 1.7Gb on my machine)

console.log("Watching directory: "+dirToWatch);

var watcher = dirwatch.makeWatcher(dirToWatch, function (type, path) {
	console.log(type + " : "+path);
});

watcher.whenReady(function () {
	console.log("The tree is ready");
});
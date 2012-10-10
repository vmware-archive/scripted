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
// This is a quick-and-dirty 'test' of the asynchwalk function in fswalk module.
// We are simply using it to walk the scripted tree and print out each
// filepath in it.

// run it as follows: 'node run-asynchwalk.js' 

/*global console require __dirname */
var conf = require('./configuration').withBaseDir(null);
var fswalk = require('./fswalk').configure(conf).asynchWalk;
var pathNormalize = require('./utils').pathNormalize;

var dirToWalk = pathNormalize(__dirname+"/../..");

console.log('Walking: '+dirToWalk);

fswalk(dirToWalk, 
	//Called on each file:
	function (path, k) {
		console.log(path);
		k();
	},
	//Called when walk finished:
	function () {
		console.log('DONE');
	}
);

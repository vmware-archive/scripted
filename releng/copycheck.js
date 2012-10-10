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
 *     Kris De Volder (VMWare) - initial API and implementation
 ******************************************************************************/
/*globale console require __dirname */

///////////////////////////////////////////////////////////////////////////////////// 
// Script to run with nodejs for checking that all .js files have copyright headers
//
// Run this script as follows:
//   node copycheck.js

// Config options:

var IGNORED_NAMES = ['lib', 'node_modules', 'test-resources', 'play-area'];
var copyright = new RegExp('@license|\\* Copyright \\(c\\)'); // play with this regexp to define what a 'licence header' looks like

/////////////////////////////////////////////////////////////////////////////////////

function contains(list, el) {
	for (var i = 0; i < list.length; i++) {
		if (list[i]===el) {
			return true;
		}
	}
	return false;
}

var defaultIgnore = require('../server/jsdepend/configuration').ignore;
var extend = require('../server/jsdepend/utils').extend;
var path = require('path');

var jsdependConf = extend(require('../server/jsdepend/configuration').withBaseDir(null), {
	ignore: function ignore(name) {
		//console.log("calling ignore");
		return defaultIgnore(name) || contains(IGNORED_NAMES, name);
	}
});

var fswalk = require('../server/jsdepend/fswalk').configure(jsdependConf).fswalk;
var fs = require('fs');
var endsWith = require('../server/jsdepend/utils').endsWith;

fswalk(path.resolve(__dirname, '..'),
	//Called on each file:
	function (f) {
		if (endsWith(f, ".js")) {
			var contents = fs.readFileSync(f);
			if (copyright.test(contents)) {
				//console.log("OK: "+f);
			} else {
				console.error("BAD: "+f);
			}
		}			
	}, 
	//Called when traversal ends
	function () {
		console.log('DONE: All .js files where analyzed');
	}
);

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

/*global require exports console module process */

var fs = require('fs');
var subfs = require('../plugable-fs/sub-fs');
var scriptedfs = require('../plugable-fs/scripted-fs');
var pathResolve = require('../jsdepend/utils').pathResolve;

function ignore(name) {
	var result = false;
	if (typeof(name)!=='string') {
		result = true;
	} else if (name===".git") {
		result = true;
	} else if (name===".svn") {
		result = true;
	} else if (name==="node_modules") {
		result = true;
	}
	// console.log('ignore? '+name+' => '+result);
	return result;
}

exports.withPrefix = require('../plugable-fs/prefixed-fs').withPrefix;
exports.withBaseDir = function (baseDir, options) {
	var corefs = subfs.withBaseDir(baseDir, fs);
	options = options || {};
	if (!baseDir) {
		//For backwards compatibiltiy and convenience, ensure we configure
		// userHome and scriptedHome
		options.userHome = options.userHome || process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
		options.scriptedHome = options.scriptedHome || pathResolve(__dirname, '../..');
	}
	return scriptedfs.configure(corefs, options);
};
exports.ignore = ignore;

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
var mappedFs = require('../plugable-fs/mapped-fs');
var scriptedfs = require('../plugable-fs/scripted-fs');
var pathResolve = require('../jsdepend/utils').pathResolve;

/**
 * This function filters out file/dir names we probably *never* want to show to users.
 * As such they can't be overriden via scripted config. So be carful adding stuff in here
 * users can not override the behavior.
 */
function ignore(name) {
	//Deprecated: we should not be using this anymore to hardwire
	// certain things to ignore. The ignores are now all configured (or should be)
	// via '.scripted' configs. And defaults should be provided via
	// 'dot-scripted-defaults.js'
	var result = false;
	if (typeof(name)!=='string') {
		result = true;
	} else if (name===".git") {
		result = true;
	} else if (name===".svn") {
		result = true;
	} else if (name===".cvs") {
		result = true;
	}
	// console.log('ignore? '+name+' => '+result);
	return result;
}

exports.withBaseDir = function (baseDir, options) {
	var corefs = mappedFs.withBaseDir(baseDir, fs);
	options = options || {};
	if (!baseDir) {
		//For 'raw' nodejs fs ensure automatically configure
		//userHome and scriptedHome
		options.userHome = options.userHome || process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
		options.scriptedHome = options.scriptedHome || pathResolve(__dirname, '../..');
	}
	return scriptedfs.configure(corefs, options);
};
exports.ignore = ignore;

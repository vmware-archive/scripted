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
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/

//
// This module provides a convenient wrapper around the priority-fswalk module to
// create 'configured' versions of fswalk that filters the tree based on
// exclude and priority patterns in the '.scripted' config file.

var extend = require('../jsdepend/utils').extend;
var glob = require('../utils/path-glob');
var deref = require('../jsdepend/utils').deref;
var pathResolve = require('../jsdepend/utils').pathResolve;

function configure(filesystem) {

	var _fswalk = require('./fs-priority-walk').configure(filesystem);
	var getDotScripted = require('../jsdepend/dot-scripted').configure(filesystem).getConfiguration;

	function makePriorityFun(conf) {
		var ignorePatterns = deref(conf, ['search', 'exclude']);
		var ignoreGlob = glob.fromJson(ignorePatterns, conf.fsroot);
		var deemphasizePatterns = deref(conf, ['search', 'deemphasize']);
		function priority(path) {
		}
		return priority;
	}

	function fswalk(searchRoot, workFun) {
		return getDotScripted(searchRoot).then(
			makePriorityFun
		).then(function (priorityFun) {
			return _fswalk(searchRoot, priorityFun, workFun);
		});
	}

	return fswalk;

}
exports.configure = configure;
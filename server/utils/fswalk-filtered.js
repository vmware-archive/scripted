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
// This module provides a convenient wrapper around the fswalk module to
// create 'configured' versions of fswalk that filters the tree based on
// exclude patterns in the '.scripted' config file.

var filesystem = require('../jsdepend/filesystem').withBaseDir(null);
var extend = require('../jsdepend/utils').extend;
var getDotScripted = require('../jsdepend/dot-scripted').configure(filesystem).getConfiguration;
var glob = require('../utils/path-glob');
var deref = require('../jsdepend/utils').deref;
var pathResolve = require('../jsdepend/utils').pathResolve;
var mFswalk = require('../jsdepend/fswalk'); //fswalk module not yet configured.

/**
 * Create a configured version of fswalk module based on the .scripted configuration
 * info discovered in the context of a given path.
 */
function forPath(searchroot, k) {
	
	var walkerConf = filesystem;
	
	getDotScripted(searchroot, function (conf) {
		var ignorePatterns = deref(conf, ['search', 'exclude']);
		var ignoreGlob = null;
		if (ignorePatterns) {
			ignoreGlob = glob.fromJson(ignorePatterns, conf.fsroot);
			console.log('ignore glob for fswalk: \n'+ignoreGlob);
			walkerConf = extend(filesystem, {
				ignorePath: function (path) {
					var r = ignoreGlob.test(path);
//					if (r) {
//						console.log('fswalk ignored: '+path);
//					}
					return r;
				}
			});
		}

		k(mFswalk.configure(walkerConf));
	});
}

exports.forPath = forPath;
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

/*global resolve require define esprima console module*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

////////////////////////////////////////
// amd-support
//
//   Support for resolving amd references.
/////////////////////////////////////////

var mapPaths = require('./amd-path-mapper').mapPaths;
var startsWith = require('./utils').startsWith;
var pathResolve = require('./utils').pathResolve;
var getDirectory = require('./utils').getDirectory;

function configure(conf) {

	var getAmdConfig = require('./amd-config-finder').configure(conf).getAmdConfig;
	 
	function isRelative(path) {
		return startsWith(path, './') || startsWith(path, '../');
	}
	 
	function amdResolver(context, dep, callback) {
		if (isRelative(dep.name)) {
			//Relative resolution doesn't require the resolverConf so avoid fetching it
			var baseDir = getDirectory(context); //relative to context file, not global config
			dep.path = pathResolve(baseDir, dep.name + ".js"); //TODO: case where already has .js?
			return callback(dep);
		} else {
			getAmdConfig(context, function (resolverConf) {
				//console.log(resolverConf);
				var dir = resolverConf.baseDir || getDirectory(context);
				var searchFor = mapPaths(resolverConf, dep.name);
				searchFor = searchFor + '.js'; //TODO: handle case where amd module
											   //name ends with .js already.
				dep.path = pathResolve(dir, searchFor);
				callback(dep);
			});
		}
	}
	
	//A 'resolver support' module provides a resolver for a particular kind of dependency.
	return {
		kind: 'AMD',
		resolver: amdResolver
	};
	
} //end: function configure

exports.configure = configure;

/////////////////////////////////////////////////////////////////////////
}); //end amd define

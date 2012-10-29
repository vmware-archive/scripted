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
 
/*global resolve require define esprima console module process*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

////////////////////////////////////////
// commonjs-resolver
//
//   Support for resolving commonjs references
/////////////////////////////////////////

var parser = require("./parser");
var treeMatcher = require('./tree-matcher');
var getDirectory = require('./utils').getDirectory;
var pathResolve = require('./utils').pathResolve;

function startsWith(str, pre) {
	return str.lastIndexOf(pre, 0) === 0;
}
function endsWith(str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

var nodeNatives = require('./node-natives');

function configure(conf) {

	//Note: 
	//   conf = the 'global' configuration for the api, provides file system type operations
	//   resolverConf = configuration information for the resolver, varies based on the context
	//                  of where a reference came from.

	var andPat = treeMatcher.andPat;
	var orPat = treeMatcher.orPat;
	
	var getContents = conf.getContents;
	var orMap = require('./utils').orMap;
	var listFiles = conf.listFiles;
	var getScriptTags = require('./script-tag-finder').getScriptTags;
	var getScriptCode = require('./script-tag-finder').getScriptCode;
	var objectPat = treeMatcher.objectPat;
	var successPat = treeMatcher.successPat;
	var containsPat = treeMatcher.containsPat;
	var successMatcher = treeMatcher.successMatcher;
	var variablePat = treeMatcher.variablePat;
	var arrayWithElementPat = treeMatcher.arrayWithElementPat;
	var nodeModulesResolver = require('./node-modules-resolver').configure(conf);
	
//	function getNodeConfig(context, callback) {
//		callback({}); 
//		//For now don't need any config, we only support resolving of './' references.
//		//and that only require access to the location of the current file.
//	}
	
	function resolver(context, dep, callback) {
		if (startsWith(dep.name, './') || startsWith(dep.name, '../')) {
			//can handle without determining some resolution base path etc.
			//since it simply resolves relative to current file
			var dir = getDirectory(context);
			var searchFor = dep.name + '.js';
			dep.path = pathResolve(dir, searchFor);
			callback(dep);
		} else if (nodeNatives.isNativeNodeModule(dep.name)) {
			dep.path = nodeNatives.MAGIC_PATH_PREFIX + dep.name;
			callback(dep);
		} else {
			var nodeResolver = nodeModulesResolver.getResolver(context);
			nodeResolver(dep.name, function (path) {
				if (path) {
					dep.path = path;
				}
				callback(dep);
			});
		}
	}
	
	//A 'resolver support' module provides a resolver for a particular kind of dependency.
	return {
		kind: 'commonjs',
		resolver: resolver
	};
	
} //end: function configure

exports.configure = configure;

/////////////////////////////////////////////////////////////////////////
}); //end amd define

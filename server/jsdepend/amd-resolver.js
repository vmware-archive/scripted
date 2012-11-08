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

var mPathMapper = require('./amd-path-mapper');
var startsWith = require('./utils').startsWith;
var pathResolve = require('./utils').pathResolve;
var getDirectory = require('./utils').getDirectory;
var when = require('when');

function configure(conf) {

	var getAmdConfig = require('./amd-config-finder').configure(conf).getAmdConfig;
	
	/**
	 * @param {string}
	 * @return {Promise}
	 */
	function getPathMapper(context) {
		var deferred = when.defer();
		getAmdConfig(context, function (resolverConf) {
			deferred.resolve(mPathMapper.configure(resolverConf));
		});
		return deferred;
	}
	 
	function isRelative(path) {
		return startsWith(path, './') || startsWith(path, '../');
	}
	
	function parseName(dep) {
		//in requirejs the way plugins work is that there's a split at the first !
		//the piece before the ! determines the plugin and the rest is passed to
		//that plugin for loading, optimizing, resolving etc.
		var name = dep.name;
		var pos = name.indexOf('!');
		if (pos>=0) {
			var pieces = name.split('!');
			dep.resource = pieces[1];
			dep.plugin = pieces[0];
		}
		//We could put dep.resource = dep.name in the else case to make
		//code simpler / more uniform, but can save some space if we don't.
	}

	//dep must be parsed before calling this!	
	function getResource(dep) {
		return dep.resource || dep.name;
	}
	
	function getExtension(dep) {
		if (dep.plugin) {
			return ""; //TODO: This is a flaky assumption. It really depends on the plugin how
						// resolution works. But lacking an implementation of a resolve
						// for every possible plugin, we'll assume it just resolves 
						// with the same rules but without expecting an extra extension.
						// This is how the the 'text!' plugin works.
		} else {
			return ".js"; //We'll be trying to load a js file.
		}
	}
	
	function amdResolver(context, dep, callback) {
		parseName(dep);
		//TODO: special case where resource already has a .js extension. This is
		// treated specially in requirejs.
		var resource = getResource(dep);
		var ext = getExtension(dep);
		if (isRelative(resource)) {
			//Relative resolution doesn't require the resolverConf so avoid fetching it
			var baseDir = getDirectory(context); //relative to context file, not amd config
			dep.path = pathResolve(baseDir, resource) + ext;
			return callback(dep);
		} else {
			when(getPathMapper(context), function (mapper) {
				//console.log(resolverConf);
				dep.path = mapper(resource) + ext;
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

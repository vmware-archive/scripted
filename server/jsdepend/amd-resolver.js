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

/*global resolve require define:true esprima console module*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

////////////////////////////////////////
// amd-support
//
//   Support for resolving amd references.
/////////////////////////////////////////

/**
 * Currently we provide support for any plugin names listed below.
 * References with these plugins are handled by adding an extension to
 * the resource path and resolving that using the same logic as
 * other references.
 *
 * Plugins not listed in here are not currently supported and references
 * containing them will be marked as 'ignored' which suppresses any
 * errors indicating resolution problems.
 */
var PLUGIN_EXTENSIONS = {
	'text' : '',
	'i18n' : '.js'
};

var mPathMapper = require('./amd-path-mapper');
var startsWith = require('./utils').startsWith;
var endsWith = require('./utils').endsWith;
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

	function getPluginName(dep) {
		if (dep.plugin) {
			var pieces = dep.plugin.split('/');
			return pieces[pieces.length-1];
		}
	}

	//dep must be parsed before calling this!
	function getResource(dep) {
		return dep.hasOwnProperty('plugin') ? dep.resource : dep.name;
	}

	/**
	 * Get the file extension to be added after resolving a reference to a path.
	 * If the reference is based on an unsupported plugin this will return 'null'.
	 *
	 * Note that the extension may be the empty string so be careul when testing the
	 * result since empty strings are 'falsy' in javascript.
	 */
	function getExtension(dep) {
		var pluginName = getPluginName(dep);
		if (pluginName) {
			if (PLUGIN_EXTENSIONS.hasOwnProperty(pluginName)) {
				return PLUGIN_EXTENSIONS[pluginName];
			} else {
				return null; //Makes the reference be ignored (rather reported as 'missing').
			}
		}
		return '.js'; //Default extension added by typical amd loader.
	}

	function logBack(msg, callback) {
		return function (result) {
			console.log(msg);
			return callback(result);
		};
	}


	function amdResolver(context, dep, callback) {
		console.log('>>> amdResolver: '+JSON.stringify(dep));
		callback = logBack("<<< amdResolver "+JSON.stringify(dep), callback);
		parseName(dep);
		//TODO: special case where resource already has a .js extension. This is
		// treated specially in requirejs.
		var resource = getResource(dep);
		var ext = getExtension(dep);
		if (!resource || ext===null) {
			//This is a case like 'domReady!' or an unsupported plugin
			//There's nothing to resolve. Let client know not to report this as an error.
			dep.ignore = true;
			return callback(dep);
		} else if ('require'===resource) {
			dep.ignore = true;
			return callback(dep); //TODO: add a regression test!
		} else if (isRelative(resource)) {
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

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

	var enhancedResolver = require('./enhanced-resolve').configure(conf);

//	var handle2file = conf.handle2file;
//	var file2handle = conf.file2handle;

	function idf(x) { return x; }

	var handle2file = idf;
	var file2handle = idf;

	//Note:
	//   conf = the 'global' configuration for the api, provides file system type operations

	function resolver(context, dep, callback) {
		if (nodeNatives.isNativeNodeModule(dep.name)) {
			dep.path = nodeNatives.MAGIC_PATH_PREFIX + dep.name + '.js';
			callback(dep);
		} else {
			//Notes:
			//1: The enhanced resolver is a node module so it uses 'real' file system paths.
			//Therefore we must make sure to translate back and forth between our own internal file handles.
			//TODO: plugable fs : enhanced-resolve library, as used right now is not compatible with making
			//                     the filesystem plugable!

			//2: enhanced resolver expects a directory as the 'context' not a file.
			enhancedResolver(getDirectory(handle2file(context)), dep.name, function (err, result) {
				if (err) {
//					console.log(err);
//					if (err.stack) {
//						console.log(err.stack);
//					}
					dep.error = err;
					dep.errorAsString = ""+err;
				} else {
					dep.path = file2handle(result);
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

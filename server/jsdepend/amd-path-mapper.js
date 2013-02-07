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

/*global exports resolve require define esprima console module*/

var pathResolve = require('./utils').pathResolve;
var startsWith = require('./utils').startsWith;
var pathNormalize = require('path').normalize;

function configure(resolverConf) {

	/**
	 * Dummy map function. It maps nothing. (i.e. it returns undefined regardless of
	 * what is passed into it.
	 */
	function nullMap() {}

	function getPackageMap(resolverConf) {
		var packages = resolverConf && resolverConf.packages;

		function map(name) {
			//TODO: cache this function?
			for (var i=0; i<packages.length; i++) {
				var p = packages[i];
				var location = p.location || '.';
				if (p.name === name) {
					if (typeof(location)==='string') {
						var main = p.main || 'main';
						return pathResolve(
							pathResolve(resolverConf.baseDir, location),
							main
						);
					}
				} else {
					var nameSlashed = p.name + '/';
					if (startsWith(name, nameSlashed)) {
						var nameRest = name.substring(nameSlashed.length);
						if (nameRest) {
							return pathResolve(
								pathResolve(resolverConf.baseDir, p.location),
								nameRest
							);
						}
					}
				}
			}
		}

		if (packages && packages.length > 0) {
			return map;
		}
		return nullMap; //dummy mapper doesn't map anything.
	}

	/**
	 * Create a function that maps paths based on the 'paths' section of
	 * a resolverConf
	 */
	function getPathMap(resolverConf) {
		//TODO: code structure is illogical and leads to bugs:
		// this code also takes into account baseDir... but
		// it would be nicer to treat that as an extra path mapping function.

		var pathBlock = resolverConf && resolverConf.paths;
		if (pathBlock) {
			return function (name) {
				var exactMatch = pathBlock[name];
				if (typeof(exactMatch)==='string') {
					return pathResolve(resolverConf.baseDir, exactMatch);
				}
				for (var prefix in pathBlock) {
					if (pathBlock.hasOwnProperty(prefix)) {
						if (startsWith(name, prefix+'/')) {
							return pathResolve(resolverConf.baseDir,
								pathBlock[prefix]+name.substring(prefix.length));
						}
					}
				}
			};
		}
		return nullMap;
	}

	var pathMap = getPathMap(resolverConf);
	var packageMap = getPackageMap(resolverConf);

	function mapPaths(depName) {
		return packageMap(depName) ||
			pathMap(depName) ||
			pathResolve(resolverConf.baseDir, depName);
	}

	return mapPaths;

}

exports.configure = configure;
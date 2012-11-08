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

function configure(resolverConf) {

	/**
	 * Dummy map function. It maps nothing. (i.e. it returns undefined regardless of
	 * what is passed into it.
	 */ 
	function nullMap() {}

	function getPackageMap(resolverConf) {
		var packages = resolverConf && resolverConf.packages;
		
		function map(name) {
			for (var i=0; i<packages.length; i++) {
				var p = packages[i];
				if (p.name === name) {
					var location = p.location || '.';
					if (typeof(location)==='string') {
						var main = p.main || 'main';
						return pathResolve(
							pathResolve(resolverConf.baseDir, location), 
							main
						);
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
		var pathBlock = resolverConf && resolverConf.paths;
		if (pathBlock) {
			return function (name) {
				//TODO: For now we only support if module names are listed exactly in the
				//path's block. We don't handle nested path blocks or remapping directories
				return pathResolve(resolverConf.baseDir, pathBlock[name]);
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
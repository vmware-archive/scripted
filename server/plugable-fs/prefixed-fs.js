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
 *   Kris De Volder
 ******************************************************************************/

//
// Provides a plugable-fs wrapper that so that prefixes all the
// files / dirs in the filesystem with a given path prefix.
//

var pathJoin = require('../jsdepend/utils').pathJoin;
var pathIsPrefixOf = require('../jsdepend/utils').pathIsPrefixOf;

function withPrefix(pathPrefix, wrappee) {

//	//Remove trailing slashes from the prefix.
//	while (pathPrefix[pathPrefix.length-1]==='/') {
//		pathPrefix = pathPrefix.substring(0, pathPrefix.length-1);
//	}
//
//	function homeConvert(getter) {
//		//If the wrapped filesystem contains a 'home' path than
//		// the prefixed filesystem contains it as well but with an added prefix.
//		return function () {
//			var result = getter();
//			return result && pathJoin(pathPrefix, result);
//		};
//	}
//
//	/**
//	 * Convert an 'external' handle to a handle on the wrapped file system.
//	 * This may return an undefined value if the handle does not represent
//	 * a location on this file system
//	 */
//	function handle2file(handle) {
//		if (pathIsPrefixOf(pathPrefix, handle)) {
//			//This code is ok because we ensured there's no trailing
//			// '/' at the end of pathPrefix.
//			return handle.substring(pathPrefix.length);
//		}
//		//else {
//		//  not a path on this file system
//		//	return undefined;
//		//}
//	}
//
//	function convertFirstArg(fun) {
//		return function () {
//			var args = Array.prototype.slice.call(arguments);
//
//			var converted = handle2wrappee(arguments[0]);
//			if (args[0]) {
//				var error = new Error('Handle not on this file system: '+args);
//			}
//		}
//	}
//
//	function rename() {
//		throw new Error('Rename not yet implemented on prefixed file system');
//	}
//
//	return {
//		getUserHome: homeConvert(wrappee.getUserHome), //TODO: does this really belong in here?
//		getScriptedHome: homeConvert(wrappee.getScriptedHome), //TODO: does this really belong in here?
////		handle2file:  handle2file, //These handle <-> file mapping functions shouldn't really be
////		file2handle:  file2handle, //exported... any place that uses them our abstraction is leaking out!
//		getContents:  convertFirstArg(wrappee.getContents),
//		putContents:  convertFirstArg(wrappee.putContents),
//		listFiles:	  convertFirstArg(wrappee.listFiles),
//		isDirectory:  convertFirstArg(wrappee.isDirectory),
//		isFile:		  convertFirstArg(wrappee.isFile),
//		rename:       rename, //TODO
//		stat:         stat,
//		mkdir:        mkdir,
//		deleteResource: deleteResource,
//		createReadStream: createReadStream
//	};

}

exports.withPrefix = withPrefix;
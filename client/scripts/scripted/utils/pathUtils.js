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

/*global require define console window */
/*jslint browser:true devel:true*/

define([], function() {

	/////////////////////////////////////////////////////////////
	//TODO: the getDirectory function below is copied from jsdepend/utils.js
	//  Can we somehow share this code between client and server.
	//  Also, there's probably other inlined bits of code on the client side
	//  that do the same thing.

	//Get the parent directory of a given handle (which could be a file or a dir name).
	function getDirectory(handle) {
		if (handle.length===3 && handle.substring(1)===':/') {
			//Special case for windows path like "C:/"
			//We should return null for the parent.
			return null;
		}
		var segments = handle.split('/');
		if (segments.length===1) {
			if (handle==='.') {
				//When using relative file names as handles... we aren't supposed to
				//walk up above the baseDir.
				return null;
			} else {
				return '.';
			}
		} else {
			segments.splice(-1, 1);
			var result = segments.join('/');
			if (result.length==='2' && result[1]===':') {
				//Special case for windows: we get this 'C:' as parent of 'C:/something'
				//What we want instead is 'C:/'
				return result+'/';
			} else {
				return result || '/';
			}
		}
	}

	function getLastSegmentFromPath(handle) {
		if (typeof handle === 'string') {

			var lastIndexPath = handle.lastIndexOf('/');

			if (lastIndexPath >= 0 && lastIndexPath < handle.length - 1) {
				var file = handle.substr(lastIndexPath + 1, handle.length);
				return file;
			}
		}
		return null;
	}

	function getPathSeparator() {
	   return '/';
	}

	return {
		getDirectory: getDirectory,
		getLastSegmentFromPath: getLastSegmentFromPath,
		getPathSeparator: getPathSeparator
	};

});

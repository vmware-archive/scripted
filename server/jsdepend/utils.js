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

/*global require define console module*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {
///////////////////////////////////////////
// utils
//////////////////////////////////////////

function checkUndefined(msg, value) {
	if (value) {
		throw msg + ' is already defined';
	}
}

function endsWith(str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function map(array, f, keepfalse) {
	var result = [];

	for (var i = 0; i < array.length; i++) {
		var fx = f(array[i]);
		if (keepfalse || fx) {
			result.push(fx);
		}
	}
	return result;
}

Array.prototype.map = function (f, keepFalse) {
	return map(this, f, keepFalse);
};

/**
 * Convert a pattern that uses '*' into a regexp. 
 *
 * @param String
 * @return RegExp
 */
function toRegexp(pat) {
	//TODO: dirty hack and not really correct. It doesn't do correct escaping
	//of chars that would be special inside of regexps.
	return new RegExp('^' + pat.replace('*', '.*'), 'i');
}

function toCompareString(obj) {
	return JSON.stringify(obj, null, '  ');
}

function orMapK(list, f, k) {

	var len = list.length;

	function loop(i, k) {
		if (i<len) {
			f(list[i], function (fi) {
				if (fi) {
					k(fi);
				} else {
					loop(i+1, k);
				}
			});
		} else {
			k(false);
		}
	}

	loop(0, k);
}

//orMap : ([a], (a -> b)) -> (b|false)
//orMap : ([a], ((a, Callback<b>) -> Void), Callback<b|false>) -> Void
// apply a function to successive elements of an array until the
// function returns a true then return this value.
// If the end of the array is reached without finding a true value,
// then false is returned.
function orMap(array, f, callback) {
	if (callback) {
		return orMapK(array, f, callback);
	} else {
		//non-callback form, returns result directly.
		for (var i = 0; i < array.length; i++) {
			var result = f(array[i]);
			if (result) {
				return result;
			}
		}
		return false;
	}
}

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
			return result;
		}
	}
}

function getFileName(handle) {
	var segments = handle.split('/');
	return segments[segments.length-1];
}

function pathNormalize(path) {

	var segments = path.split('/');
	var normalized = [];
	var i = 0;
	while (i < segments.length) {
		var segment = segments[i++];
		if (segment==='.') {
			//skip
		} else if (segment==='..') {
			if (normalized.length>0) {
				var prevSeg = normalized[normalized.length-1];
				if (prevSeg==='..') {
					normalized.push(segment);
				} else {
					normalized.splice(-1, 1);
				}
			} else {
				normalized.push(segment);
			}
		} else {
			normalized.push(segment);
		}
	}
	return normalized.join('/') || '.'; 
	   //Note: || '.' is to avoid returning '' because it counts as false!
	   //so always use '.' as the normalized form of the 'current dir'.
}

function pathResolve(basePath, resolvePath) {
	if (typeof(basePath) === 'string' && typeof(resolvePath) === 'string') {
		if (basePath === '.' || resolvePath[0] === '/') {
			return pathNormalize(resolvePath);
		} else {
			return pathNormalize(basePath + '/' + resolvePath);
		}
	}
}

//Map a function onto an array in callback (continuation passing) style:
function mapk(array, f, k) {
	if (array.length===0) {
		//Special case for zero length, otherwise k won't get called. 
		return k([]);
	}
	var remaining = array.length;
	var newArray = [];
	function makeCallback(i) {
		return function (r) {
			newArray[i] = r;
			remaining--;
			if (remaining===0) {
				//All results received!
				k(newArray);
			}
		};
	}
	for (var i=0; i<array.length; i++) {
		f(array[i], makeCallback(i));
	}

}

//eachk :: ([a], (a, Continuation<Void>) -> Void, Coninuation<Void>) -> Void
// This is a 'foreach' on an array, where the function that needs to be called on the
// elements of the array is callback style. I.e. the function calls some other function when its
// work is done. Since this is a 'each' rather than a 'map', we don't care about the 'return values'
// of the functions (and in callback style, this means, the parameters of the callbacks).
function eachk(array, f, callback) {
	function loop(i) {
		if (i < array.length) {
			f(array[i], function() {
				loop(i + 1);
			});
		} else {
			callback();
		}
	}
	loop(0);
}
	

function filter(array, pred) {
	var results = [];
	for (var i = 0; i < array.length; i++) {
		var el = array[i];
		if (pred(el)) {
			results.push(el);
		}
	}
	return results;
}

/**
 * Create a new object using another object as a prototype 'proto'.
 * If 'addProps' is provided, then all the 'own' properties of 'addProps' are 
 * copied onto the new object. 
 *
 * @param Object proto
 * @param Object addProps
 * @return Object
 */
function extend(proto, addProps) {
	//console.log('extending proto: '+JSON.stringify(proto));
	var obj = Object.create(proto);
	if (addProps) {
		for (var p in addProps) {
			if (addProps.hasOwnProperty(p)) {
				obj[p] = addProps[p];
			}
		}
	}
	return obj;
}
	
exports.toCompareString = toCompareString;
exports.orMap = orMap;
exports.pathResolve = pathResolve;
exports.getDirectory = getDirectory;
exports.getFileName = getFileName;
exports.pathNormalize = pathNormalize;
exports.endsWith = endsWith;
exports.map = map;
exports.mapk = mapk;
exports.filter = filter;
exports.eachk = eachk;
exports.extend = extend;
exports.toRegexp = toRegexp;

//////////////////////////////////////////
});
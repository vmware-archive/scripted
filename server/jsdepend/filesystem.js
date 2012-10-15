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

//TODO: a better name for this module. It's really an abstraction of the file system. 
//      so the name ought to reflect that.

//////////////////////////////////////
// Configuration
//
//   A configuration object provides a number of functions and pieces of info that
//   the api implementation depends on. The implementation of these functions
//   may differ depending on where we are using the API (e.g. file access is different 
//   in server or browser environments).
///////////////////////////////////////////

var nodeNatives = require('./node-natives');

function ignore(name) {
	var result = (
		typeof(name)!=='string' || 
		name.length<=1 || 
		name[0]==='.'
	) && !(
		name==='.scripted' || 
		name ==='.project'
	);
	result = result || name==='scripted.log';
	//console.log('ignore? '+name+' => '+result);
	return result;
}

function withBaseDir(baseDir) {
	var fs = require('fs');
	var path = require('path');
	var encoding = 'UTF-8';
	
	function isNativeNodeModulePath(handle) {
		return handle.lastIndexOf(nodeNatives.MAGIC_PATH_PREFIX, 0)===0;
	}
	
	function nativeNodeModuleName(handle) {
		return handle.substring(nodeNatives.MAGIC_PATH_PREFIX.length);
	}
	
	function handle2file(handle) {
		if (baseDir) {
			return path.normalize(baseDir + '/' + handle);
		} else {
			return handle;
		}
	}
	
	function file2handle(file) {
		if (baseDir) {
			var h = file.substring(baseDir.length+1);
			if (!h) {
				h = '.'; //Always use '.' instead of "", it causes trouble because it counts as 'false'.
			}
			return h;
		} else {
			return file;
		}
	}
	
	function isFile(handle, callback) {
		if (typeof(handle)!=='string') {
			callback(false);
		} else if (isNativeNodeModulePath(handle)) {
	        callback(true);
	    } else {
		    fs.stat(handle2file(handle), function (err, stats) {
			    if (err) {
				    //console.log(err);
				    callback(false);
			    } else {
				    callback(stats.isFile());
			    }
		    });
		}
	}

	function isDirectory(handle, callback) {
		fs.stat(handle2file(handle), function (err, stats) {
			if (err) {
				//console.log(err);
				callback(false);
			} else {
				callback(stats.isDirectory());
			}
		});
	}
	
	function getContents(handle, callback, errback) {
		if (isNativeNodeModulePath(handle)) {
			var contents = nodeNatives.getCode(nativeNodeModuleName(handle));
			if (contents) {
				return callback(contents);
			}
		} 
		fs.readFile(handle2file(handle), encoding, function(err, data) {
			if (err) {
				if (typeof(errback) === 'function') {
					errback(err);
				} else {
					console.error(err);
				}
			} else {
				callback(data);
			}
		});
	}
	getContents.remoteType = ['JSON', 'callback', 'errback'];
	
	function listFiles(handle, callback, errback) {
		errback = errback || function (err) {
			//console.log(err);
			callback([]); //a reasonable substitute that most clients will be able to deal with.
		};
		fs.readdir(handle2file(handle), function (err, files) {
			if (err) {
				errback(err);
			} else {
				callback(files);
			}
		});
	}
	
	return {
		baseDir:      baseDir, 
		handle2file:  handle2file,
		file2handle:  file2handle,
		getContents:  getContents,
		listFiles:	  listFiles,
		isDirectory:  isDirectory,
		isFile:		  isFile
	};
}

exports.withBaseDir = withBaseDir;
exports.ignore = ignore;

});


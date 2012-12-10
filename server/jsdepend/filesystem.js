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
 
/*global require exports console module process */

//////////////////////////////////////
// Configuration
//
//   A configuration object provides a number of functions and pieces of info that
//   the api implementation depends on. The implementation of these functions
//   may differ depending on where we are using the API (e.g. file access is different
//   in server or browser environments).
///////////////////////////////////////////

var nodeNatives = require('./node-natives');
var when = require('when');

function ignore(name) {
	var result = false;
	if (typeof(name)!=='string') {
		result = true;
	} else if (name.length<=1) {
		result = true;
	} else if (name===".git") {
		result = true;
	} else if (name===".svn") {
		result = true;
	} else if (name === "scripted.log") {
		result = true;
	}
	// console.log('ignore? '+name+' => '+result);
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
		//handle looks like: '/NODE_NATVE/<name>.js'
		return handle.substring(nodeNatives.MAGIC_PATH_PREFIX.length, handle.length-3);
	}
	
	function getUserHome() {
		if (baseDir) {
			//We are testing with a 'mini test file system' can't use the
			// regular user home dir here. So use a special "user.home" dir under the
			// baseDir
			return "user.home";
		} else {
			//Note: this code from here
			// http://stackoverflow.com/questions/9080085/node-js-find-home-directory-in-platform-agnostic-way
			return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
		}
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

	/**
	 * Now useable both in callback or promise form... if no callback is
	 * passed then a promise is returned. Eventually the callack form
	 * should go away... but we will need to update all uses of this method
	 * first.
	 * @return {Promise.boolean}
	 */
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
	
	function rename(handleOriginal, handleRename) {
		var original = handle2file(handleOriginal);
		var newname = handle2file(handleRename);
		console.log("Requesting resource rename for: " + original + " into " + newname);
		var deferred = when.defer();
		if (original && newname) {

			fs.rename(original, newname, function(err) {
				if (err) {
					deferred.reject(err);
				} else {
					deferred.resolve();
				}
			});

		} else {
			var message = !original ? "No resource specified to rename" : "No new name specified when renaming " + original;
			deferred.reject(message);
		}
		return deferred.promise;
	}

	/**
	 * 
	 * @param handle file or directory name and path
	 * @returns promise
	 */
	function deleteResource(handle) {
		var resourcePath = handle2file(handle);
		console.log("Requesting resource delete for: " + resourcePath);
		var deferred = when.defer();
		if (resourcePath) {
			fs.unlink(resourcePath, function(err) {
				if (err) {
					deferred.reject(err);
				} else {
					deferred.resolve();
				}
			});
		} else {
			var message = "No resource specified to delete";
			deferred.reject(message);
		}
		return deferred.promise;
	}
	
	function getContents(handle, callback, errback) {
		var d = when.defer();
		if (!callback) {
			callback = function (v) {
				d.resolve(v);
			};
			errback = function (err) {
				d.reject(err);
			};
		}
		errback = errback || function (err) {
			console.error(err);
			callback(null, err);
		};
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
					callback("");
				}
			} else {
				callback(data);
			}
		});
		return d;
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

	/**
	 * @return Promise
	 */
	function putContents(handle, contents) {
		console.log('putContents: '+handle);
		var d = when.defer();
		var file = handle2file(handle);
		fs.writeFile(file, contents, function (err) {
			if (err) {
				console.error(err);
				d.reject(err);
			} else {
				d.resolve();
			}
		});
		return d;
	}

	/**
	 * @return Promise
	 */
	function mkdir(handle) {
		var d = when.defer();
		fs.mkdir(handle2file(handle), function (err) {
			if (err) {
				d.reject(err);
			} else {
				d.resolve();
			}
		});
		return d;
	}

	/**
	 * simplified version of nodejs fs.stat. Only returns a data object with two flags
	 * isDirectory and isFile.
	 *
	 * We don't return the 'naked' result from fs.stat here because it can't easily be
	 * JSON.stringified and sent over to the client.
	 *
	 * @return Promise
	 */
	function stat(handle) {
		console.log('statting: '+handle);
		var d = when.defer();
		fs.stat(file2handle(handle), function (err, statObj) {
			if (err) {
				d.reject(err);
			} else {
				d.resolve({
					isDirectory: statObj.isDirectory(),
					isFile: statObj.isFile()
				});
			}
		});
		return d;
	}
	
	return {
		getUserHome:  getUserHome,
		baseDir:      baseDir,
		handle2file:  handle2file,
		file2handle:  file2handle,
		getContents:  getContents,
		putContents:  putContents,
		listFiles:	  listFiles,
		isDirectory:  isDirectory,
		isFile:		  isFile,
		rename:       rename,
		stat:         stat,
		mkdir:        mkdir,
		deleteResource: deleteResource
	};
}

exports.withBaseDir = withBaseDir;
exports.ignore = ignore;

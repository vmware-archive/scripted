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

var nodeNatives = require('../jsdepend/node-natives');
var when = require('when');
var oneCache = require('../jsdepend/one-cache');
var utils = require('../jsdepend/utils');

var pathNormalize = utils.pathNormalize;
var pathResolve = utils.pathResolve;
var startsWith = utils.startsWith;

var isNativeNodeModulePath = nodeNatives.isNativeNodeModulePath;
var nativeNodeModuleName = nodeNatives.nativeNodeModuleName;

function ignore(name) {
	var result = false;
	if (typeof(name)!=='string') {
		result = true;
	} else if (name===".git") {
		result = true;
	} else if (name===".svn") {
		result = true;
	} else if (name==="node_modules") {
		result = true;
	}
	// console.log('ignore? '+name+' => '+result);
	return result;
}

function withBaseDir(baseDir) {
	var fs = require('fs');
	var encoding = 'UTF-8';

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

	/**
	 * Fetches the location where this instance of scripted is installed.
	 * This info is used to find stuff inside of scripted itself.
	 *
	 * TODO: pluggable fs : check all references to __dirname outside of this function
	 *        they are suspect.
	 */
	function getScriptedHome() {
		if (baseDir) {
			//We are testing with a 'mini test file system' can't use the
			// regular scripted home dir here. So use a special "scripted.home" dir under the
			// baseDir
			return "scripted.home";
		} else {
			return pathResolve(__dirname, '../..');
		}
	}

	function handle2file(handle) {
		if (baseDir) {
			return pathNormalize(baseDir + '/' + handle);
		} else {
			return handle;
		}
	}

	function file2handle(file) {
		var h;
		if (baseDir) {
			h = file.substring(baseDir.length+1);
			if (!h) {
				h = '.'; //Always use '.' instead of "", it causes trouble because it counts as 'false'.
			}
		} else {
			h = file;
		}
		return h.replace(/\\/g, '/'); //Always use slashes even on Windows. Fewer problems with bad code that
									// assumes slashes are used.
									// TODO: in the long run the right thing to do is properly use
									// libraries like 'path' in node to do all path manipulation.
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
		var d, p;
		if (!callback) {
			//Switch to using promises.
			d = when.defer();
			p = d.promise;
			callback = function (isDir) {
				d.resolve(isDir);
			};
		}
		fs.stat(handle2file(handle), function (err, stats) {
			if (err) {
				//console.log(err);
				callback(false);
			} else {
				callback(stats.isDirectory());
			}
		});
		return p;
	}

	function rename(handleOriginal, handleRename) {
		var original = handle2file(handleOriginal);
		var newname = handle2file(handleRename);
		console.log("Requesting resource rename for: " + original + " into " + newname);
		var deferred = when.defer();
		if (original === newname) {
			deferred.reject("Both original and new names are the same. Please enter a different name.");
		} else if (original && newname) {
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
		deferred.promise.then(function() {
			console.log("Successfully renamed: " + original + " into " + newname);
		}, function(err) {
			console.log("Failed to rename: " + original + " due to " + err);
		});
		return deferred.promise;
	}

	/**
	 *
	 * @param handle file or directory name and path
	 * @returns promise
	 */
	function deleteResource(handle) {
		console.log("Requesting resource delete for: " + handle);
		return stat(handle).then(function (stats) {
//			console.log("stat => "+JSON.stringify(stats));
			if (stats.isDirectory) {
				var deleteChildren = when.map(listFiles(handle), function (name) {
//					console.log('mapped: '+name);
					return deleteResource(pathResolve(handle, name));
				});
				return deleteChildren.then(function () {
					return rmDir(handle);
				});
			} else if (stats.isFile) {
				return deleteFile(handle);
			} else {
				return when.reject("Neither file nor dir: "+handle);
			}
		});
	}

	function deleteFile(_handle) {
		var file = handle2file(_handle);
		var deferred = when.defer();
		fs.unlink(file, function(err) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve();
			}
		});

		deferred.promise.then(function() {
			console.log('delete: ' + file);
		});

		return deferred;
	}

	function rmDir(_handle) {
		var file = handle2file(_handle);
		var deferred = when.defer();
		fs.rmdir(file, function(err) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve();
			}
		});

		deferred.promise.then(function() {
			console.log('rmdir: ' + file);
		});
		return deferred;
	}

	function getContents(handle, callback, errback) {
		var d;
		if (!callback) {
			d = when.defer();
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

	/**
	 * wraps a callback function so that is logs the value passed to the callback
	 * in JSON.stringified form.
	 */
	function logBack(msg, callback) {
		return function(result) {
			console.log(msg);
			console.log(JSON.stringify(result, null, "  "));
			callback(result);
		};
	}


	function listFiles(handle, callback, errback) {
		var d;
		if (!callback) {
			d = when.defer();
			callback = function (files) {
				d.resolve(files);
			};
		}
		//callback = logBack("listFiles("+handle+") => ", callback);
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
		return d;
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
	 * isDirectory and isFile; and a size field.
	 *
	 * We don't return the 'naked' result from fs.stat here because it can't easily be
	 * JSON.stringified and sent over to the client.
	 *
	 * @return Promise
	 */
	function stat(handle) {
//		console.log('statting: '+handle);

		var d = when.defer();
		fs.stat(file2handle(handle), function (err, statObj) {
			if (err) {
				d.reject(err);
			} else {
				d.resolve({
					size: statObj.size,
					isDirectory: statObj.isDirectory(),
					isFile: statObj.isFile()
				});
			}
		});
		return d.promise;
	}

	/**
	 * Like node fs.createReadStream but automatically assumes encoding utf8.
	 */
	function createReadStream(handle) {
		var file = handle2file(handle);
		return fs.createReadStream(file, { encoding: 'utf8'});
	}

	/**
	 * Like node fs.readFile
	 */
	function readFile(handle, callback) {
		var file = handle2file(handle);
		fs.readFile(file, callback);
	}

	return {
		getUserHome:  getUserHome,
		getScriptedHome: getScriptedHome,
		baseDir:      baseDir,
		handle2file:  handle2file, //These handle <-> file mapping functions shouldn't really be
		file2handle:  file2handle, //exported... any place that uses them our abstraction is leaking out!
		getContents:  getContents,
		putContents:  putContents,
		listFiles:	  listFiles,
		isDirectory:  isDirectory,
		isFile:		  isFile,
		rename:       rename,
		stat:         stat,
		mkdir:        mkdir,
		deleteResource: deleteResource,
		createReadStream: createReadStream,
		readFile: readFile
	};
}

exports.withBaseDir = oneCache.makeCached(withBaseDir);
exports.ignore = ignore;

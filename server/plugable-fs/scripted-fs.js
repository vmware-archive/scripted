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

//
// Scripted fs module is an adapter that wraps around a module that provides
// a simpler fs interface implementation and converts/extends it to provide
// all the hairy warts of the interface scripted expects.
//
// (E.g. supporting both callback as well as promised forms of function)
// The 'hairy warts' are there to avoid having to convert a lot of
// code to the cleaner interface.
//
// But with the hairy warts it is harder to make the modules composable
// and transformable.
//
// This adapter is supposed to be the last wrapper applied to a filesystem
// so that we can do filesystem composition itself with the simpler interface.

var nodeNatives = require('../jsdepend/node-natives');
		//TODO: filesystem shouldn't have dependency on node natives module
		//  handle this in a different way. (if fs is 'plugable' should be
		//  able to easily add 'mock' files like this as an add-on content
		//  provider.

var when = require('when');
var utils = require('../jsdepend/utils');

var pathNormalize = utils.pathNormalize;
var pathResolve = utils.pathResolve;
var startsWith = utils.startsWith;

var isNativeNodeModulePath = nodeNatives.isNativeNodeModulePath;
var nativeNodeModuleName = nodeNatives.nativeNodeModuleName;

function configure(fs, options) {

	options = options || {};

//	function logit(f) {
//		return function () {
//			console.log('>>> '+f.name + ' ' + JSON.stringify(arguments));
//			var r = f.apply(this, arguments);
//			console.log('<<< '+f.name + ' ' + JSON.stringify(r));
//			return r;
//		};
//	}
//
//	handle2file = logit(handle2file);
//	file2handle = logit(file2handle);

	function idFun(x) { return x; }

	var handle2file = idFun; //TODO: might remove?
	var file2handle = idFun; //TODO: might remove?
	var encoding = options.encoding || 'UTF-8';

	function getUserHome() {
		if (options.userHome) {
			return options.userHome;
//		} else if (!baseDir) {
//			//Note: this code from here
//			// http://stackoverflow.com/questions/9080085/node-js-find-home-directory-in-platform-agnostic-way
//			return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
		}
	}

	/**
	 * Fetches the location where this instance of scripted is installed.
	 * This info is used to find stuff inside of scripted itself.
	 *
	 * TODO: pluggable fs : check all references to __dirname outside of this function
	 *        they are suspect and should use filesystem.getScriptedHome() instead.
	 */
	function getScriptedHome() {
		if (options.scriptedHome) {
			return options.scriptedHome;
//		} else {
//			return pathResolve(__dirname, '../..');
		}
	}

	function isFile(handle, callback) {
		var d;
		if (!callback) {
			d = when.defer();
			callback = function (r) { d.resolve(r); };
		}
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
		return d && d.promise;
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
				callback(contents);
			}
		} else {
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
		}
		return d && d.promise;
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
		return d && d.promise;
	}

	/**
	 * @return Promise
	 */
	function putContents(handle, contents) {
		var d = when.defer();
		var file = handle2file(handle);
		fs.writeFile(file, contents, function (err) {
			if (err) {
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
		fs.stat(handle2file(handle), function (err, statObj) {
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
	 * Like node fs.createReadStream but automatically assumes our default encoding.
	 */
	function createReadStream(handle) {
		var file = handle2file(handle);
		return fs.createReadStream(file, { encoding: encoding});
	}

	return {
		getUserHome:  getUserHome, //TODO: does this really belong in here?
		getScriptedHome: getScriptedHome, //TODO: does this really belong in here?
		handle2file:  fs.handle2file, //These handle <-> file mapping functions shouldn't really be
		file2handle:  fs.file2handle, //exported... any place that uses them our abstraction is leaking out!
		getContents:  getContents,
		putContents:  putContents,
		listFiles:	  listFiles,
		isDirectory:  isDirectory,
		isFile:		  isFile,
		rename:       rename,
		stat:         stat,
		mkdir:        mkdir,
		deleteResource: deleteResource,
		createReadStream: createReadStream
	};
}

exports.configure = configure;

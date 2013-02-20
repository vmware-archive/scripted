/****************************************************0***************************
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
// A composite fs puts together a number of other filesystems in a kind of
// pipe-line.
//
// For directory listing requests the results of each child system
// are combined into a single list of results.
//
// For file-based request the filesystems are considered left-to-right
// so that the first file system from the left that 'has the file' takes
// priority.

var when = require('when');
var promiseUtils = require('../utils/promises');

var until = promiseUtils.until;
var each = promiseUtils.each;
var findFirst = promiseUtils.findFirst;
var findFirstIndex = promiseUtils.findFirstIndex;
var noExistError = require('./fs-errors').noExistError;

//TODO: All the functions in this module need unit testing of some kind.

function compose() {

	var subsystems = Array.prototype.slice.call(arguments);

	/**
	 * Convert a node-style function with a single callback as the last argument
	 * into a promised form function. The signature of the original
	 * nodefs function is modified as follows.
	 *   - fs parameter added as first argument.
	 *   - callback parameter removed.
	 *   - returns a promise instead.
	 */
	function promisedFunction(fname) {
		var pf = function (fs) {

			//Fetch remaining args into an array
			var args = Array.prototype.slice.call(arguments, 1);

			//console.log('>>> '+fname + ' : ' +handle);
			var d = when.defer();
			var f = fs[fname];
			if (!f) {
				throw new Error("No function "+fname+" on filesystem "+fs);
			}

			function callback(err, result) {
				if (err) {
					d.reject(err);
				} else {
					d.resolve(result);
				}
			}
			args.push(callback); //Add the callback function as the last argument.
			f.apply(fs, args);  // raw node doesn't need fs to be passed for 'this' but
								// some libraries like fake-fs do. Without
								// it they will have the wrong 'this' object when
								// we are calling their fs operations.

//			d.then(function (result) {
//				console.log('<<< '+fname + ' : ' +handle + ' = '+result);
//			}, function (err) {
//				console.log('<<< '+fname + ' : ' +handle + ' ERROR '+err);
//				console.log(err.stack);
//			});
			return d.promise;
		};
		pf.name = fname;
		return pf;
	}


	// We define version of fs calbacky functions that return promises... because they
	// are much easier to compose.

	var stat = promisedFunction('stat');
	var unlink = promisedFunction('unlink');
	var readFile = promisedFunction('readFile');
	var readdir = promisedFunction('readdir');
	var writeFile = promisedFunction('writeFile');
	var mkdir = promisedFunction('mkdir');
	var rmdir = promisedFunction('rmdir');

	//TODO: var rename //Careful: // Not a 'one arg' function!
	//TODO: var createReadStream // Careful: not a callbacky function!
	//TODO: var writeFile //Careful: Not a 'one arg' function!
	//TODO: var handle2file: ??? get the 'file' on the leftmost filesystem where it exists.
	//TODO:	var file2handle: ??? get the 'handle' on the leftmost filesystem where it exists.

	/**
	 * Returns a promise that resolves to true or false depending on
	 * whether a given path exists on a given filesystem.
	 *
	 * @return {Promise.Boolean}
	 */
	function exists(fs, handle) {
		return stat(fs, handle).then(
			function /*ok*/() { return true; },
			function /*error*/() { return false; }
		);
	}

	/**
	 * Pass a promise result or err to a nodejs style callback function.
	 */
	function nodeCallback(promise, callback) {
		promise.then(
			function (result) {
//				console.log('nodeCallback ' +callback);
				callback(/*noerror*/null, result);
			},
			function (error) {
				callback(error);
			}
		).otherwise(function (err) {
			//Add an otherwise here to make it easier to diagnose broken code.
			//Without this errors thrown by the calls to the callback above are likely to
			//be swallowed without a trace by the when library.
			//Since when library will swallow (convert to a reject) anything thrown in here as well
			//the only way to make sure there's a trace of this error is to log it here.
			console.log(err);
			if (err.stack) {
				console.log(err.stack);
			}
			return when.reject(err); //Stay rejected although this is probably swallowed anyway.
		});
	}

	/**
	 * Determine which subsystems are 'ok to write'. This means that they are
	 * candidates for trying to perform a write operation in left to right order
	 * until one of the fss accepts the write operation as valid.
	 */
	function okToWrite(handle) {
		//Rationale for the algorithm used below:

		//a) Starting from the leftmost filesystem, we can try to write on
		//   any of the filesystems where the handle does not yet exist.
		//b) When we hit a filesystem where the handle does exist, we can
		//   try that one as well.
		//c) Any systems beyond the one found in b should not be tried
		//   the effect to writing to that subsystem will not be
		//   visable on the composite fs since it will be 'shadowed'
		//   by whatever is on the filesystem from b.

		return findFirstIndex(subsystems, function (fs) {
			return exists(fs, handle);
		}).then(
			//The handle EXISTS on one of the subsystems
			function (i) {
				//All the subsystems upto and including the first system
				//where the handle exists.
				return subsystems.slice(0, i+1);
			},
			//The handle does NOT exist on any subsystem
			function () {
				//Ok to try all of them.
				return subsystems;
			}
		);
	}

	/**
	 * Create a composite deletion operation. Both rmdir and unlink follow the
	 * same pattern, which is to attempt deletion on every subsystem on which
	 * the target file or directory exists.
	 *
	 * Deletion is succesful only if both of these conditions apply:
	 *   a) the target exists on at least one sub filesystem.
	 *   b) deletion was succesful on all sub filesystems.
	 *
	 * If deletion was not succesful then in case
	 *   a) no sub system has a file or directory corresponding to the path
	 *      In this case we pass a 'ENOENT' error to the callback.
	 *   b) there was an error on at least one subsystem. This error will
	 *      be passed to the callback function.
	 *
	 * Rationale:
	 *
	 *   a) To be consistent with node fs, trying to delete something that doesn't
	 *      exists should result in an error.
	 *
	 *   b) calling a deletion operation on a composite fs, a caller
	 *      will expect that on a succeful completion, the file/dir no longer exists
	 *      on the composite filesystem. For this to be true it will have to be
	 *      removed from all subfilesystems.
	 *
	 */
	function compositeDeletion(deleteOp) {
		return function (handle, callback) {
			var fss = when.filter(subsystems, function (fs) {
				//A filesystem is only interesting to 'unlink' operation
				//if the handle we are trying to unlink exists on that
				//filesystem.
				return exists(fs, handle);
			}).then(function (fss) {
				if (fss.length>=1) {
					//Got at least one interesting fs... so ok to try and unlink
					return fss;
				} else {
					//There's no fs that contains the requested handle, so we can't unlink!
					return when.reject(noExistError(deleteOp.name, handle));
				}
			});
			//Try to delete from all 'interesting' file systems
			var deleteAll = each(fss, function (fs) {
				deleteOp(fs, handle);
			});
			//Leave promises world and return back to node style callbacks.
			nodeCallback(deleteAll, callback);
		};
	}

	return {
		stat: function (handle, callback) {
			//console.log('>>> composite stat : '+handle);
			//TODO: merging ctime, atime etc across composite fs if we care about
			//     these attributes.
			nodeCallback(
				//Take the leftmost fs.stat result that doesn't reject.
				until(subsystems, function (fs) {
					return stat(fs, handle);
				}),
				callback
			);
		},
		readFile: function (handle /*, [encoding], callback*/) {
			var args = Array.prototype.slice.call(arguments);
//			console.log('>>> composite readFile: '+JSON.stringify(args));
			var callback = args.pop(); //callback is always last argument no matter how many args
			                           //are passed.
//			console.log('>>> callback: '+callback);
			nodeCallback(
				//Perform the readFile on the leftMost fs where the handle exists.
				findFirst(subsystems, function (fs) {
					return exists(fs, handle);
				}).then(
					//handle exist on at least one fs
					function (fs) {
						//OK to use and mutate args here. This function only
						//called once!
						args.unshift(fs);
	//					console.log('>>> readFile: '+fs+ ', '+JSON.stringify(args));
						return readFile.apply(fs, args);
					},
					//handle doesn't exist on any fs
					function () {
						return when.reject(noExistError('readFile', handle));
					}
				),
				callback
			);
		},
		writeFile: function (handle, contents /*, [encoding], [callback]*/) {
			var args = Array.prototype.slice.call(arguments);
			var callback = args[args.length-1];
			if (typeof(callback)!=='function') {
				//Watch out the callback is optional in node api!
				callback = function () {};
			} else {
				//Remove the callback arg
				args.pop();
			}

			nodeCallback(
				findFirstIndex(subsystems, function (fs) {
					return exists(fs, handle);
				}).otherwise(function () {
					//Handle doesn't exist on any of the subsystems so ok to try all of them
					return subsystems;
				}).then(function (subsystems) {
					//We now only have the subsystems that are ok to try from left to right.
					return until(subsystems, function (fs) {
						var subArgs = args.slice(); //Watch out, called more than once
													// don't mutate the original!
						subArgs.unshift(fs);
						return writeFile.apply(fs, subArgs);
					});
				}),
				callback
			);
		},
		unlink: compositeDeletion(unlink),
		rmdir: compositeDeletion(rmdir)
//		rmdir: convertArg(fs.rmdir, 0),
//		readdir: convertArg(fs.readdir, 0),
//		mkdir: convertArg(fs.mkdir, 0),
//		createReadStream: convertArg(fs.createReadStream, 0),
//		rename: convertArg(convertArg(fs.rename, 0), 1),
//		handle2file: compose(fs_handle2file, handle2file),
//		file2handle: compose(file2handle, fs_file2handle)

	};


} // function compose

exports.compose = compose;



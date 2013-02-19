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
var noExistError = require('./fs-errors').noExistError;

//TODO: All the functions in this module need unit testing of some kind.

function compose() {

	var subsystems = Array.prototype.slice.call(arguments);

	/**
	 * Convert a node-style one-arg fs function with callback to promised form function
	 * that accepts both a fs and an argument and returns a promise.
	 */
	function promisedOneArgFunction(fname) {
		var pf = function (fs, handle) {
			//console.log('>>> '+fname + ' : ' +handle);
			var d = when.defer();
			var f = fs[fname].bind(fs); // raw node fs doesn't need the bind, but
										// some libraries like fake-fs do. Without
										// it they will have the wrong 'this' object when
										// we are calling their fs operations.
			f(handle, function (err, result) {
				if (err) {
					d.reject(err);
				} else {
					d.resolve(result);
				}
			});
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

	var stat = promisedOneArgFunction('stat');
	var unlink = promisedOneArgFunction('unlink');
	var readFile = promisedOneArgFunction('readFile');
	var readdir = promisedOneArgFunction('readdir');
	var mkdir = promisedOneArgFunction('mkdir');
	var rmdir = promisedOneArgFunction('rmdir');

	//TODO: var rename //Careful: // Not a 'one arg' function!
	//TODO: var createReadStream // Careful: not a callbacky function!
	//TODO: var writeFile //Careful: Not a 'one arg' function!
	//TODO: var handle2file: ??? get the 'file' on the leftmost filesystem where it exists.
	//TODO:	var file2handle: ??? get the 'handle' on the leftmost filesystem where it exists.

	/**
	 * Returns a promise that resolves to true or false depending on
	 * whether a given path exists on a given filesystem.
	 *
	 * @{Promise.Boolean}
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
				callback(/*noerror*/null, result);
			},
			function (error) {
				callback(error);
			}
		).otherwise(function (err) {
			//Add an otherwise here to make it easier to diagnose broken test code.
			//Without this errors thrown by the callback will be swallowed without a trace by the
			//when library.
			console.log(err);
			if (err.stack) {
				console.log(err.stack);
			}
		});
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
	 *   b)calling a deletion operation on a composite fs, a caller
	 * will expect that on a succeful completion, the file/dir no longer exists
	 * on the composite filesystem. For this to be true it will have to be
	 * removed from all subfilesystems.
	 *
	 *  a) To be consistent with node fs, trying to delete something that doesn't
	 *     exists should result in an error.
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
			nodeCallback(
				until(subsystems, function (fs) {
					return stat(fs, handle);
				}),
				function (err, stats) {
					//console.log('<<< composite stat : '+err + ', '+stats);
					callback(err, stats);
				}
			);
		},
		unlink: compositeDeletion(unlink),
		rmdir: compositeDeletion(rmdir)
//		rmdir: convertArg(fs.rmdir, 0),
//		readFile: convertArg(fs.readFile, 0),
//		readdir: convertArg(fs.readdir, 0),
//		writeFile: convertArg(fs.writeFile, 0),
//		mkdir: convertArg(fs.mkdir, 0),
//		createReadStream: convertArg(fs.createReadStream, 0),
//		rename: convertArg(convertArg(fs.rename, 0), 1),
//		handle2file: compose(fs_handle2file, handle2file),
//		file2handle: compose(file2handle, fs_file2handle)

	};


} // function compose

exports.compose = compose;



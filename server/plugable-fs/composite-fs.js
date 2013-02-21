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

var filter = promiseUtils.filter;
var until = promiseUtils.until;
var each = promiseUtils.each;
var findFirst = promiseUtils.findFirst;
var findFirstIndex = promiseUtils.findFirstIndex;
var noExistError = require('./fs-errors').noExistError;
var isDirError = require('./fs-errors').isDirError;

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
	 * @return {Promise} that resolves to true if the handle exists and is a directory, false otherwise.
	 */
	function isDirectory(fs, handle) {
		return stat(fs, handle).then(
			function /*ok*/(stats) { return stats.isDirectory(); },
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
//				console.log('nodeCallback result = ' +result);
				callback(/*noerror*/null, result);
			},
			function (error) {
//				console.log('nodeCallback error = ' +error);
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
	 *
	 * IMPORTANT: this function doesn't check whether the handle on the final
	 *    filesystem, if it exists, is in fact ok to write. E.g. if it is
	 *    a directory entry then it shouldn't be allowed to overwrite it
	 *    with a file (not even implicitly by shadowing it on a sibling fs)
	 *    It is the responsibility of the caller to check for this case.
	 */
	function okToWrite(handle) {
		//console.log('>>> okToWrite '+handle);

		//Rationale for the algorithm used below:

		//a) Starting from the leftmost filesystem, we can try to write on
		//   any of the filesystems where the handle does not yet exist.
		//b) When we hit a filesystem where the handle does exist, we can
		//   try that one as well.
		//c) Any systems beyond the one found in b should not be tried
		//   the effect to writing to that subsystem will not be
		//   visable on the composite fs since it will be 'shadowed'
		//   by whatever is on the filesystem from b.

		var result = findFirstIndex(subsystems, function (fs) {
			return exists(fs, handle);
		}).then(
			//The handle EXISTS on one of the subsystems
			function (i) {
				//console.log('okToWrite '+handle+' found index = '+i);
				//All the subsystems upto and including the first system
				//where the handle exists.
				return subsystems.slice(0, i+1);
			},
			//The handle does NOT exist on any subsystem
			function () {
				//console.log('okToWrite '+handle+' NOT found index');
				//Ok to try all of them.
				return subsystems;
			}
		);

//		result.then(function (result) {
//				console.log('okToWrite '+ handle+ ' => '+result.map(function (x) {
//					return x.toString();
//				}));
//			},
//			function (err) {
//				console.log('okToWrite '+ handle+ ' ERROR => '+err);
//			}
//		);

		return result;
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
			var fss = filter(subsystems, function (fs) {
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
				okToWrite(handle).then(function (subsystems) {
					//We now only have the subsystems that are ok to try from left to right.
					//BUT... if the handle currently represents a directory then we
					//shouldn't be allowed to write a file to it!

					//TODO: similar case for readonly file on last fs?
					//But it may just make sense to allow overwriting the file by writing to
					//'shadow' fs that is composed in front of it.
					//Tricky with scenario would be that stating the cfs may make it appear
					//as if the file is read-only while it is actually not.

					return isDirectory(subsystems[subsystems.length-1], handle).then(function (isDir) {
						if (isDir) {
							return when.reject(isDirError('writeFile', handle));
						} else {
							return until(subsystems, function (fs) {
								var subArgs = args.slice(); //Watch out, called more than once
															// don't mutate the original args!
								subArgs.unshift(fs);
								//console.log('>>> writeFile '+fs+', '+JSON.stringify(subArgs.slice(1)));
								var result = writeFile.apply(fs, subArgs);
//								result.then(
//									function () {
//										console.log('<<< writeFile '+fs+', '+JSON.stringify(subArgs.slice(1)) + ' => OK');
//									},
//									function (err) {
//										console.log('<<< writeFile '+fs+', '+JSON.stringify(subArgs.slice(1)) + ' ERROR = '+err);
//									}
//								);
								return result;
							});// END until
						}//END if isDir else
					});
				}),
				callback
			);//END nodeCallback
		},
		readdir: function (handle, callback) {

			function readdirHelper(subsystems) {
				//When we get here, we know that:
				//  - have at least one subsystem where the handle exists
				//  - subsystems already filtered to only those fss where the handle exists.
				var entries = {};
				var done = false;
				return each(subsystems, function (fs, index) {
					//console.log('reading dir on '+fs.toString());
					return readdir(fs, handle).then(
						function (names) {
							//console.log('reading dir on '+fs.toString() + ' => '+JSON.stringify(names));
							names.forEach(function (name) {
								entries[name] = true;
							});
						},
						function (err) {
							//console.log('reading dir on '+fs.toString() + ' => ERROR: '+err);
							if (err && err.code === 'ENOTDIR') {
								//This entry will shadow later ones so should stop
								//acumulating entries now.
								if (index===0) {
									//If this is the first entry, then the
									// 'composite' handle looks like 'not a dir' from
									// the outside. So we should keep the error.
									return when.reject(err);
								} else {
									//not first one. So at least one real dir before this.
									//Stop now to return what we got so far.
									return when.reject('done'); //Hack to 'escape' out of 'each' loop.
								}
							} else {
								//Propagate unexpected error
								return when.reject(err);
							}
						}
					);
				}).otherwise(function (err) {
					// 'done' is not a real error but a hack to jump out of the loop above
					if (err !== 'done') {
						return when.reject(err);
					}
				}).then(function () {
					//console.log('composed entries: '+JSON.stringify(entries, null, '  '));
					return entries;
				});
			}

			nodeCallback(
				filter(subsystems, function (fs) {
					//The only subystems that matter are those where the handle exists.
					return exists(fs, handle);
				}).then(function (subsystems) {
//					console.log('readdir filtered fss: '+subsystems.map(function (fs) {
//						return fs.toString();
//					}));
					if (subsystems.length===0) {
						//Ensure correct error is produced when no subfs has the handle.
						return when.reject(noExistError('readdir', handle));
					} else {
						return readdirHelper(subsystems).then(function (entriesMap) {
//							console.log('composed entries received: '+JSON.stringify(
//								entriesMap, null, '  '
//							));
							var entries = []; //Need results as an array
							for (var name in entriesMap) {
								if (entriesMap.hasOwnProperty(name)) {
									entries.push(name);
								}
							}
//							console.log('composed entries as array: '+JSON.stringify(
//								entries, null, '  '
//							));
							return entries;
						});
					}
				}),
				callback
			);
		}
//		unlink: compositeDeletion(unlink), Commented out because not tested probably not working
//		rmdir: compositeDeletion(rmdir) Commented out because not tested probably not working
//		mkdir: convertArg(fs.mkdir, 0),
//		createReadStream: convertArg(fs.createReadStream, 0),
//		rename: convertArg(convertArg(fs.rename, 0), 1),
//		handle2file: compose(fs_handle2file, handle2file),
//		file2handle: compose(file2handle, fs_file2handle)

	};


} // function compose

exports.compose = compose;


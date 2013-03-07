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
//
// When subsystems define a mix of files / dirs for a given handle
// the siutation is amibguous. We try to resolve these conflicts logically
// as much as possible by assuming left-most filesystem has priority.
// The semantics of composition and particularly mutation operations
// like writeFile, unlink, rmdir are not always clear however
// and it is probably best to avoid these situations by only composing file
// systems that are mostly disjoint.

var when = require('when');
var promiseUtils = require('../utils/promises');

var filter = promiseUtils.filter;
var until = promiseUtils.until;
var each = promiseUtils.each;
var not = promiseUtils.not;
var findFirst = promiseUtils.findFirst;
var findFirstIndex = promiseUtils.findFirstIndex;
var noExistError = require('./fs-errors').noExistError;
var isDirError = require('./fs-errors').isDirError;
var isNotDirError = require('./fs-errors').isNotDirError;
var accessPermisssionError = require('./fs-errors').accessPermisssionError;
var existsError = require('./fs-errors').existsError;
var crossFSError = require('./fs-errors').crossFSError;
var nodeCallback = require('../utils/promises').nodeCallback;

var getDirectory = require('../jsdepend/utils').getDirectory;

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
	var rename = promisedFunction('rename');

	//TODO: var rename //Careful: // Not a 'one arg' function!
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
	 * @param permCheck Additional permission checker function that is
	 *    given access to the 'interesting' filesystems before actually doing any
	 *    deletions.
	 *
	 *    The permsission check function may reject if it deems that the
	 *    operation should not proceed.
	 */
	function compositeDeletion(deleteOp, permCheck) {
		return function (handle, callback) {
//			console.log('>>> unlink '+handle);
			var fss = filter(subsystems, function (fs) {
				//A filesystem is only interesting to 'unlink' operation
				//if the handle we are trying to unlink exists on that
				//filesystem.
				return exists(fs, handle);
			}).then(function (fss) {
				return permCheck(fss, handle).then(function () {
	//				console.log('>>> unlink interesting fss = '+fss.map(function (fs) {
	//					return fs.toString();
	//				}));
					if (fss.length>=1) {
	//					console.log('>>> unlink OK to try');
						//Got at least one interesting fs... so ok to try and unlink
						return fss;
					} else {
						//There's no fs that contains the requested handle, so we can't unlink!
						return when.reject(noExistError(deleteOp.name, handle));
					}
				});
			});
			//Try to delete from all 'interesting' file systems
			var deleteAll = each(fss, function (fs) {
				return deleteOp(fs, handle);
			});
			//Leave promises world and return back to node style callbacks.
			nodeCallback(deleteAll, callback);
		};
	}

	var cfs = {
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
		},
		createReadStream: undefined, //TODO: scripted-fs defines a 'fake version' of this if
								     // it is not defined. We should be able to provide
									 // a real implementation here if the sub-fss implement it.

		unlink: compositeDeletion(unlink, function /*permChecker*/(fss, handle) {
			//We have to produce special case errors if one of the subfss defines the handle
			//as a directory.
			return findFirst(fss, function (fs) {
				return isDirectory(fs, handle);
			}).then(
				function (dirFs) {
					//At least one of the fss, dirFs, defines handle as a dir
					//This means the operation should be disallowed.
					return when.reject(fss[0]===dirFs
						? isDirError('unlink', handle)
						: accessPermisssionError('unlink', handle)
					);
				},
				function () {
					//None of the fss is a directory... proceed!
				}
			);
		}),
		rmdir: compositeDeletion(rmdir, function /*permChecker*/(fss, handle) {
			//We have to produce special case errors if one of the subfss does not
			//define the handle as a directory.
			return findFirst(fss, function (fs) {
				return not(isDirectory(fs, handle));
			}).then(
				function (fs) {
					//At least one of the fss, dirFs, defines handle as a not a dir
					return when.reject(fss[0]===fs
						? isNotDirError('rmdir', handle)
						: accessPermisssionError('rmdir', handle)
					);
				},
				function () {
					//All of the fss are indeed directories => proceed!
				}
			);
		}),
		mkdir: function (handle /*, [options], callback */) {
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
				exists(cfs, handle).then(function (isExist) {
					if (isExist) {
						return when.reject(existsError('mkdir', handle));
					}
				}).then(function () {
					return until(subsystems, function (fs) {
						//May be called multiple times so do NOT mutate original args.
						var subargs = args.slice();
						subargs.unshift(fs);
						return mkdir.apply(fs, subargs);
					});
				}),
				callback
			);
		},
		rename: function (source, target, callback) {
			nodeCallback(
				exists(cfs, target).then(function (targetExists) {
					if (targetExists) {
						//Note: standard nodefs actually happily overwrites target file if
						//it already exists! That's not so great so we change that
						//behavior here!
						return when.reject(existsError('rename '+source, target));
					}
				}).then(function () {
					//A rename, from the point of view of the 'source' file/dir
					//should behave much like a delete. I.e. to be succeed, it should
					//succeed on all subfs where the source exists.
					return filter(subsystems, function (fs) {
						return exists(fs, source);
					}).then(function (fss) {
						if (!fss.length) {
							return when.reject(noExistError('rename', source));
						}
						return each(fss, function (fs) {
							return rename(fs, source, target);
						}).otherwise(function (err) {
							//Need some special handling to detect error caused by 'crossFS rename'
							//and transform the error to what is expected.
							if (err && err.code === 'ENOENT') {
								var parent = getDirectory(target);
								//if there's no parent, we were trying to rename '/'.
								//That seems a very strange thing to do... so probably can't
								//reach here with that kind of error but better safe than sorry!
								if (parent) {
									return exists(cfs, parent).then(function (parentExists) {
										if (parentExists) {
											//If parent exists we can only get ENOENT because
											//it does not exist on the same subfs. So the
											//rename is in fact trying to move something to another
											//fs.
											return when.reject(crossFSError('rename '+source, target));
										}
										return when.reject(err);
									});
								}
							}
							return when.reject(err);
						});
					});
				}),
				callback
			);
		}
//		handle2file: compose(fs_handle2file, handle2file),
//		file2handle: compose(file2handle, fs_file2handle)

	};

	return cfs;

} // function compose

exports.compose = compose;


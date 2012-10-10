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
 
/*global exports require*/
var eachk = require('./utils').eachk;
var pathResolve = require('./utils').pathResolve;
var getFileName = require('./utils').getFileName;

function configure(conf) {

	var ignore = conf.ignore || require('./configuration').ignore;
	var listFiles = conf.listFiles;
	var isDirectory = conf.isDirectory;

	// Walk the FILESYSTEM
	//A walk function written in callback style. Calls the function f on each file (excluding directories)
	//The function f is a non-callbacky function. 
	//After all files have been walked, then orginal callback function passed to the toplevel walk
	//call will be called.
	function fswalk(node, f, k, exit) {
		exit = exit || k; //Grabs the 'toplevel' k
		isDirectory(node, function(isDir) {
			if (isDir) {
				listFiles(node,

				function(names) {
					eachk(names,

					function(name, k) {
						if (ignore(name)) {
							k();
						} else {
							var file = pathResolve(node, name);
							fswalk(file, f, k, exit);
						}
					},
					k);
				},

				function(err) {
					//ignore error and proceed.
					k();
				});
			} else {
				var abort = f(node); // The f function ain't callback style.
				if (abort) {
					exit();
				} else {
					k();
				}
			}
		});
	}

	/**
	 * A version of fswalk where the function 'f' is callbacky as well.
	 * This is for use cases where the work that needs to be done on
	 * each file may also need to read stuff from the file system (or do
	 * other kinds of work that need a callbacky programming style).
	 * <p>
	 * Just like in the regular fswalk, the function f can return a boolean
	 * value of true to indicate that it wants to abort the walk.
	 * However since the function is 'callbacky' the boolean must be
	 * passed to the callback instead.
	 * <p>
	 * This function is written in 'continuation passing style'. This means
	 * that the the entire state of the computation is always represented by
	 * any of the 'k' functions passed around. Thus it is possible for the function
	 * 'f' to pause the search, simply by refraining from calling it's k 
	 * and store it somewhere instead. To resume the search it just needs to
	 * call the stored function.
	 */
	function asynchWalk(node, f, k, exit) {
		exit = exit || k; //Grabs the 'toplevel' k
		isDirectory(node, function(isDir) {
			if (isDir) {
				listFiles(node,

				function(names) {
					eachk(names, 
						function(name, k) {
							if (ignore(name)) {
								k();
							} else {
								var file = pathResolve(node, name);
								asynchWalk(file, f, k, exit);
							}
						},
						k
					);
				},

				function(err) {
					//ignore error and proceed.
					k();
				});
			} else {
				f(node, function(abort) {
					if (abort) {
						exit();
					} else {
						k();
					}
				});
			}
		});
	}
	
	return {
		fswalk: function (path, f, k) {
			fswalk(path, f, k);
		},
		asynchWalk: function (path, f, k) {
			asynchWalk(path, f, k);
		}
	};

}

exports.configure = configure;

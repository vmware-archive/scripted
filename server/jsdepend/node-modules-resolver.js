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

/*global process require exports console module*/

var ENABLE_FILE_LISTENER = true; //This flag controlls whether the infrastructure
                                  // to refresh node module maps will be enabled. 
                                  // We are disabling for 0.1 because the code is fairly complex and has not been
                                  // tested much yet. So it is risky code that could hang / crash the server.
                                  // A consequence of this is that scripted will not become aware of changes to
                                  // installed node_modules after it has created its node module map.

var oneCache = require('./one-cache');
var getDirectory = require('./utils').getDirectory;
//var dirwatch = require('./dirwatch/dirwatch');
var Ready = require('./ready').Ready;

function configure(conf) {

	//TODO: share data between a parent and child directory search scope (to save memory and 
	// also avoid repeating work analyzing the parent for each child).
	
	//Poor man's coverag analysis. If this is called it throws an exception and prints a
	//a stacktrace. So any calls remaining in the code are not being hit by the tests!
//	function notCovered() {
//		console.trace('This line *is* covered*');
//		throw 'This line *is* covered';
//	}

	//configure = level 1 config
	//   provides 'the file system'.
	//getNodeModuleFinder = level 2 config 
	//   provides a file path. This determines the 'search' scope.
	// implementation caches and reuse module map if the search scope is the same.
	// typically, the search scope for a given source file is determined by the directory
	// this file is in.

	var listFiles = conf.listFiles;
	var isDirectory = conf.isDirectory;
	var isFile = conf.isFile;
	var pathResolve = require('./utils').pathResolve;
//	var getFileName = require('./utils').getFileName;
//	var file2handle = conf.file2handle;
//	var handle2file = conf.handle2file;
	var getContents = conf.getContents;
	var eachk = require('./utils').eachk;
	var endsWith = require('./utils').endsWith;
	var fileIndexer = require('./file-indexer').configure(conf);
	
	//maps a directory path to a moduleFinder.
	var cachedResolvers = {};

	function fileListener(eventType, path) {
		if (typeof(path)==='string' && path.indexOf('node_modules')>=0) {
			for (var property in cachedResolvers) {
				if (cachedResolvers.hasOwnProperty(property)) {
					cachedResolvers[property].makeDirty();
				}
			}
		}
	}
	
	if (ENABLE_FILE_LISTENER) {
		fileIndexer.addListener(fileListener);
	}

	// continuation passing style 'or' operation. Combines two comutations into a single one by combining their values
	// with an or.
	// A 'computation' is a function that accepts just one parameter which is a callback and it passes
	// a value to that callback.
	function ork(comp1, comp2) { 
		//isCovered();
		return function(k) {
			comp1(function (v1) {
				if (v1){ 
					//isCovered();
					k(v1);
				} else {
					//isCovered();
					comp2(k);
				}
			});
		};
	}

	function createResolver(dir) {
	
		var modulesMap = {};
		
		//Dirty and ready together serve to control when the modulesMap
		//needs to be (re)built.
		
		// intially
		//   ready = false and dirty = true;
		// when an attemp is made to access the map.
		//   if dirty => initiates a map build and reset dirty to false
		//   wait for ready to bedome true before using the map.
		// when file system change is detected
		//   map is cleared and states are reset to initial state (dirty and not ready).
		
		// This allows for
		//   - multiple requests to access the map to arrive while it
		//     is in the process of being built, without triggering multiple map builds as a result.
		//   - rapid bursts of file changes to 'dirty' the map without causing
		//     multiple map rebuilds as a result.
		
		var ready = new Ready(); //Becomes 'true' upon completion of building the table.
		var dirty = true; // Becomes true when file system changes invalidate the contents of the table.
						  // meaning: the map needs a (re)build to be initiated.
		
		function maybeAddJs(str) {
			if (endsWith(str, '.js')) {
				//isCovered();
				return str;
			} else {
				//isCovered();
				return str + '.js';
			}
		}		
		
		function getPathFromJsonFile(jsonFile, k) {
			getContents(jsonFile, 
				function (text) {
					//isCovered();
					try {
						var json = JSON.parse(text);
						var path = json && json.main;
						if (typeof(path)==='string') {
							//isCovered();
							path = maybeAddJs(pathResolve(getDirectory(jsonFile), path));
							return k(path);
						} else {
							//isCovered(); by putting '"main" : 88 in package.json
							return k();
						}
					} catch (e) {
						//isCovered(); by unparseable package.json
						//Assume its not proper JSON data: ignore and continue
					}
					k();
				},
				function (err) {
					//isCovered(); // by module dir that has neither index.js nor package.json
					//console.log(err);
					k();
				}
			);
		}

		function addModule(name, path) {
			if (!modulesMap.hasOwnProperty(name)) {
				modulesMap[name] = path;
			} else {
				//isCovered();
			}
		}

		function scanNodeModules(modulesDir, k) {
			listFiles(modulesDir, function (names) {
				//isCovered();
				eachk(names, function (fileName, k) {
					//isCovered();
					var path = pathResolve(modulesDir, fileName);
					if (endsWith(fileName, '.js')) {
						//isCovered();
						isFile(path, function (is) {
							//isCovered();
							if (is) {
								//isCovered();
								addModule(fileName.substring(0, fileName.length-3/*'.js'.length*/), path);
							}
							//isCovered();
							k();
						});
					} else {
						//isCovered();
						ork(
							function (k) {
								//isCovered();
								var indexjs = pathResolve(path, 'index.js');
								isFile(indexjs, function (is) {
									//isCovered();
									k(is && indexjs);
								});
							},
							function (k) {
								//isCovered();
								var jsonFile = pathResolve(path, 'package.json');
								getPathFromJsonFile(jsonFile, function (path) {
									isFile(path, function (is) {
										//isCovered();
										if (is) {
											//isCovered();
											k(path);
										} else {
											//isCovered(); by mispelled file name in package.json
											k(false);
										}
									});
								});
							}
						)(function (path) {
							//isCovered();
							if (path) {
								//isCovered();
								addModule(fileName, path);
							}
							//isCovered();
							k();
						});
					}
				}, k);
			});
		}
		
		function fillMap(dir, k) {
			if (dirty) {
				//No point continuing at this point, our map is already compromised by
				//file system changes.
				return k();
			}
			isDirectory(dir, function (isDir) {
				if (isDir) {
					scanNodeModules(pathResolve(dir, "node_modules"), function () {
						fillMap(getDirectory(dir), k);
					});
				} else {
					k();
				}
			});
		}
		
		function buildMap() {
			if (dirty) {
				//If the map is not dirty, there's no need to initiate a map build because
				//either
				//  - the map is ready to use, or
				//  - it is currently being built and will become ready when that is done.
				dirty = false; //We set dirty false as soon as buildMap starts.
								// This means that if file events are received during map building,
								// then this will make the map dirty even before it has finished building.
								// This is correct because we really don't have guarantees the
								// map will be up to date if changes happened during its construction.
				fillMap(dir, function() {
					if (!dirty) {
						ready.ready();
					} else {
						//retry: our previous attempt was foiled by file system changes that happened while
						//we where building.
						process.nextTick(buildMap);
					}
				});
			}
		}
		
		function resolveNodeModule(name, k) {
			//There are two stages to ensuring the modulesMap is ready to use
			buildMap(); //Step 1: make sure it is not dirty
			ready.then(function () { //Step 2: make sure map has been fully constructed
				//IMPORTANT: file system changes can make the map 'dirty' and cause it be rebuilt at any time.
				// This not a problem now because code below is very simple and
				//doesn't use any asynch callbacks. Thus nothing can come between when we use the
				//map and when the map became ready.
				return k(modulesMap[name]);
			});
		}
		
		resolveNodeModule.makeDirty = function () {
			dirty = true;
			modulesMap = {}; //Clear the map
			ready.unready(); //switch state back to ready=false
		};
	
		return resolveNodeModule;
	}

	/**
	 * Gets the node module finder for a given source file
	 */
	function getResolver(file) {
		var dir = getDirectory(file); //dir determines the search scope
		var existing = cachedResolvers[dir];
		if (!existing) {
			existing = createResolver(dir);
			cachedResolvers[dir] = existing;
		}
		return existing;
	}

	return {
		getResolver: getResolver
	};
}
	
exports.configure = oneCache.makeCached(configure);

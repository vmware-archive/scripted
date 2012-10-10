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

/*global require exports console module*/

var oneCache = require('./one-cache');
var dirwatch = require('./dirwatch/dirwatch');

var MAX_RESULTS = 15;

var getDirectory = require('./utils').getDirectory;
var orMap = require('./utils').orMap;
var eachk = require('./utils').eachk;

function configure(conf) {

	//console.log("configuring file-indexer for: "+ conf.baseDir);
	
	//configure = level 1 config
	//   provides 'the file system'.
	//getIndexer = level 2 config 
	//   provides a search scope (typically smaller than the file system)
	
	//This two step config is needed because we need the file system to walk around a bit and 
	//determine the search scope. (Currently we walk up, until we find a .scripted, .project or .git file

	var listFiles = conf.listFiles;
	var pathResolve = require('./utils').pathResolve;
	var getFileName = require('./utils').getFileName;
	var file2handle = conf.file2handle;
	var handle2file = conf.handle2file;
	var toRegexp = require('./utils').toRegexp;

	var fileEventListeners = [];
			
	function fileEventHandler(type, path) {
		for (var i = 0; i < fileEventListeners.length; i++) {
			try {
				fileEventListeners[i](type, path);
			} catch (e) {
				console.error(e);
			}
		}
	}

	function isRootMarkerFile(name) {
		if (name==='.scripted' || name==='.project' || name==='.git') {
			return name;
		}
	}

	function getRootMarkerFile(context, callback) {
		var dir = getDirectory(context);
		if (dir) {
			listFiles(dir, 
				function (names) {
					var rootMarkerName = orMap(names, isRootMarkerFile); 
					if (rootMarkerName) { 
						callback(pathResolve(dir, rootMarkerName));
					} else {
						getRootMarkerFile(dir, callback);
					}
				},
				function (err) {

				}
			);
		} else {
			callback(false);
		}
	}
	
	//TODO: This cache should be managed outside of 'configuration specific memory space' because
	// it just directly uses nodejs's fs rather than our own mini local file system.
	//In 'production setting' this doesn't matter as there's only one instance of our fs.
	//But in testing code this is a memory leak.
	var indexerCache = {};
	
	function createIndexer(rootMarkerFile, k) {
		
		var rootDirFile = handle2file(getDirectory(rootMarkerFile));
		var cached = indexerCache[rootDirFile];
		if (cached) {
			//Careful... we enter stuff into the cache before the dirwatcher is fully ready.
			//This is to avoid accidentally creating a second
			//dirwatcher while the first one is still being created.
			//This however means that before passing the cached entry to the our 'k' we must 
			//ensure the dirwatcher is actually ready
			//console.log('found cached indexer for :'+rootDirFile);
			return cached.dirwatcher.whenReady(function () {
				//console.log('return cached indexer for: '+rootDirFile);
				k(cached);
			});
		}

		var dirwatcher = dirwatch.makeWatcher(rootDirFile, fileEventHandler);	

		function walk(f, k) {
//			if (IN_MEMORY_SEARCH) {
				dirwatcher.walk(function (node) {
					//console.log("walking file: "+node.path);
					return f(file2handle(node.path));
				});
				return k();
//			} else {
//				return fswalk(file2handle(dirwatcher.path), f, k);
//			}
		}
		
		/**
		 * Searches for given pattern, return the results incrementally.
		 * Each time we find a match, the add function is called with the matching file path as an argument.
		 * When the search finished the done function is called.
		 * 
		 * The add function may be called any number of times.
		 * The done function is guaranteed to be called exactly once (even when a search is canceled, the done
		 * function will be called when processing stops).
		 *
		 * @param RegExp pat
		 * @param {{
		 *		add:function(path),
		 *		done:function(),
		 *		isCanceled: function():boolean
		 * }}
		 */
		function incrementalSearch(pat, requestor) {
			var isCanceled = requestor.isCanceled;
			var count = 0;
			console.log("requestor.maxResults = "+requestor.maxResults);
			var maxResults = requestor.maxResults || MAX_RESULTS;
			console.log("maxResults = "+maxResults);
			walk(
				/*called on each file*/
				function(file) {
					var name = getFileName(file);
					if (pat.test(name)) {
						requestor.add(file);
						count++;
					}
					return count>= maxResults || isCanceled();
				},
				/*called when done:*/
				function() {
					//console.log("indexer is done");
					requestor.done();
				}
			);
		}
		
		cached = {
			getRootDir: function () {
				return file2handle(rootDirFile);
			},

			dirwatcher: dirwatcher,
			
			incrementalSearch: function (pat, requestor) {
				incrementalSearch(toRegexp(pat), requestor);				
			},
			
			findFileNamesContaining: function (substring, callback) {
				//TODO: this now does regexp search so the name is not so good!
				var pat = toRegexp(substring);
				var results = [];
				incrementalSearch(pat, {
					add: function (e) {
						results.push(e);
					},
					done: function () {
						callback(results);
					},
					isCanceled: function () {
						return results.length>= MAX_RESULTS;
					}
				});

			},
			findFilesWithName: function (findName, callback) {
				var results = [];
				walk(
					/*called on each file*/
					function(file) {
						var name = getFileName(file);
						if (findName === name) {
							results.push(file);
						}
						return results.length >= MAX_RESULTS;
					},
					/*called when done:*/
					function() {
						//console.log("indexer is done");
						callback(results);
					}
				);
			},
			dispose: function () {
				if (this.dirwatcher) {
					this.dirwatcher.dispose();
					delete this.dirwatcher;
				}
			}
			//put the indexer methods in here
		};
		indexerCache[rootDirFile] = cached;
		
//		console.log(">>> cached indexers");
//		for (var prop in indexerCache) {
//			if (indexerCache.hasOwnProperty(prop)) {
//				console.log("cached indexer: '"+prop+"'");
//			}
//		}
//		console.log("<<< cached indexers");
		
		return dirwatcher.whenReady(function () {
			k(cached);
		});
	}
	
	//Determine the indexer to be associated with a given file. 
	//To avoid overly broad searches a indexer must be configured for a given context.
	//The context is somehow determined based on the current file in the editor.
	function getIndexer(file, callback) {
//		if (typeof(errback)!=='function') {
//			errback = function (err) { throw err; };
//		}
		getRootMarkerFile(file, function (rootMarkerFile) {
			if (rootMarkerFile) {
				createIndexer(rootMarkerFile, callback);
			} else {
				//Could not find 'root marker' => treat file itself as the 'root marker'. So we can at least
				//search within the current directory.
				createIndexer(file, callback);
//				errback("No .scripted or .project file found in context of file '"+file+"'");
			}
		});
	}

	return {
		getIndexer: getIndexer,
		addListener: function (listener) {
			fileEventListeners.push(listener);
		}
	};
}
	
exports.configure = oneCache.makeCached(configure);


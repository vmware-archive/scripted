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
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

/*global define require FileReader window Worker XMLHttpRequest ActiveXObject setTimeout localStorage scriptedLogger disableIndexerWorker */
/*jslint browser:true */

//eachk :: ([a], (a, Continuation<Void>) -> Void, Coninuation<Void>) -> Void
// This is a 'foreach' on an array, where the function that needs to be called on the
// elements of the array is callback style. I.e. the function calls some other function when its
// work is done. Since this is a 'each' rather than a 'map', we don't care about the 'return values'
// of the functions (and in callback style, this means, the parameters of the callbacks).
function eachk(array, f, callback) {
	function loop(i) {
		if (i < array.length) {
			f(array[i], function() {
				loop(i + 1);
			});
		} else {
			callback();
		}
	}
	loop(0);
}


/**
 * this module defines the indexing service
 * and provides two operations:
 *   retrieveSummaries(file)  grabs the summaries for files that depend on the file file passed in
 *   performIndex(file)   calculates the dependencies of the file and updates the summaries of all of these dependencies
 */
define(["plugins/esprima/esprimaJsContentAssist", "servlets/jsdepend-client"], function() {
	var mEsprimaContentAssist = require('plugins/esprima/esprimaJsContentAssist');
	var jsdepend = require('servlets/jsdepend-client');
	
	
	// webworkers exist
	var worker;
	if ((this.window && this.window.Worker) && !this.window.isTest) {
		try {
			// comment this line out if you want to run w/o webworkers
			worker = new Worker('scripts/plugins/esprima/indexerWorker.js');
		} catch (e) {
			if (this.console) {
				this.console.error(e);
			} else {
				throw e;
			}
		}
	}

	
	// for each file, there are 4 things put in local storage:
	// <file-name>-deps : direct dependency list for file
	// <file-name>-deps-ts : timestamp for dependency list  (not sure if this is necessary)
	// <file-name>-summary : summary for file
	// <file-name>-summary-ts : timestamp for summary
	// See https://issuetracker.springsource.com/browse/SCRIPTED-160 for a full description of
	// what the dependencies look like
	
	// The dependencies is an associative array where each key is a path to a transitive dependency
	// the values contain the module kind, and an associative array of references.  
	// Each reference has a kind, name, and path
	// dependencies : { path : { kind, refs : { name { kind, name, path } } }

	// TODO FiXADE should be a call to the server to get the server time
	function generateTimeStamp() {
		return new Date().getTime();
	}

	/**
	 * asks server for transitive dependency graph of current file
	 */
	function getDependencies(fileName, statusFn, callback) {
		// ask server for dependencies, but for now, just hard code
		// dependency = { path { path to file }, name { module name }, kind : { global, AMD, commonjs } }
		jsdepend.getDGraph(fileName, callback, 
			function (error) {
				statusFn(error);
				callback([]);
			}
		);
	}	

	/**
	 * Asks server for text of specified dependency.  Then calls the inferencer to summarize the file.
	 * 
	 * @param {{path:String}} dependency a url of the file to summarize
	 * @param {Indexer} indexer 
	 * @param {Function} persistFn function to call for persisting to local storage
	 * @param {Function} statusFn function to call for messages
	 * @param {Function} k the continuation
	 */
	function createSummary(dependency, indexer, persistFn, statusFn, k) {
		var file = dependency.path;
		if (file) {
			jsdepend.getContents(file, function (contents) {
					var oldFile = indexer.getTargetFile();
					indexer.setTargetFile(file);
					var esprimaContentAssistant = new mEsprimaContentAssist.EsprimaJavaScriptContentAssistProvider(indexer, indexer.jslint);
					var structure = esprimaContentAssistant.computeSummary(contents, file);
					var textStructure = JSON.stringify(structure);
					var ts = generateTimeStamp();
					statusFn("Persisting summary of " + file);
					
					persistFn(file + "-summary", textStructure);
					persistFn(file + "-summary-ts", ts);
					indexer.setTargetFile(oldFile);
					k();
				},
				function (err) {
					statusFn("Warning: " + err + " when getting " + file);
					k();
				}
			);
		}
	}
	
	/**
	 * caches the dependencies for current file and its transitive dependencies
	 */
	function cacheDeps(fileName, deps, persistFn) {
		for (var prop in deps) {
			if (deps.hasOwnProperty(prop)) {
				persistFn(prop + "-deps", JSON.stringify(deps[prop]));
				persistFn(prop + "-deps-ts", generateTimeStamp());
			}
		}
	}
	
	/**
	 * checks the dependency list to see which summaries need updating.
	 * TODO FIXADE : this is currently a stub method and always assumes that everything needs updating
	 * tsDep is not being calculated on the server yet
	 */
	function checkCache(deps, retrieveFn) {
		var needsUpdating = [];
		for (var prop in deps) {
			if (deps.hasOwnProperty(prop)) {
				var tsCache = retrieveFn(prop + "-summary-ts");
				var tsDep = deps[prop].timestamp;
				// only update the local cache if it 
				// older than what the server has
				if (!tsCache || !tsDep || tsCache < tsDep) {
					deps[prop].path = prop;
					needsUpdating.push(deps[prop]);
				}
			}
		}
		return needsUpdating;
	}
	
	
	
	// anything over 2 days old is considered stale	
	var twoDays = 1000 * 60 * 60 * 24 * 2;
	function isStale(val, currentTime) {
		var ts = parseInt(val, 10);
		if (ts) {
			return (currentTime - ts) > twoDays;
		} else {
			return true;
		}
	}

	/**
	 * Manages the local storage produced by this class.
	 * OK to access local storage directly since this function will never be called from a webworker
	 * but be careful about the statusFn since scriptedLogger not available from tests
	 */
	var purgeStaleStorage = function(statusFn) {
		var len = localStorage.length;
		var keysToPurge = [];
		var currentTime = generateTimeStamp();
		for (var i = 0; i < len; i++) {
			var key = localStorage.key(i);
			if (key.indexOf('-ts') === key.length - '-ts'.length && isStale(localStorage[key], currentTime)) {
				keysToPurge.push(key);
				var otherKey = key.substring(0, key.length-'-ts'.length);
				if (localStorage[otherKey]) {
					keysToPurge.push(otherKey);
				}
			}
		}
	
		statusFn("Purging from local storage:\n" + keysToPurge, "INDEXER");
		for (i = 0; i < keysToPurge.length; i++) {
			localStorage.removeItem(keysToPurge[i]);
		}
	};
	
	
	
	/**
	 * Creates a new indexer.
	 * Since the indexer can be called as part of a webworker, we cannot access local storage directly
	 * The webworker must use a callback to access the console or local storage. Hence the following parameters:
	 * 
	 * @param persistFn is a function that takes a key and a value as arguments 
	 * and persists them.
	 * @param retreiveFn is a function that takes a key and returns a value from storage
	 * @param statusFn is a function that accepts status messages
	 */
	function Indexer(persistFn, retrieveFn, statusFn) {
	
		if (!persistFn) {
			persistFn = function(key, value) { localStorage[key] = value; };
		}
		if (!retrieveFn) {
			retrieveFn = function(key) { return localStorage[key]; };
		}
		if (!statusFn) {
			statusFn = function(msg) { scriptedLogger.debug(msg, "INDEXER"); };
		}
		
		// private instance variable
		var indexTargetFile;
		
		/**
		 * retrieves the summaries for all dependencies in the global scope
		 */
		this.retrieveGlobalSummaries = function() {
			if (!indexTargetFile) {
				return { };
			}
			// check local storage for file
			var deps = retrieveFn(indexTargetFile + "-deps");
			if (!deps) {
				return { };
			}
			deps = JSON.parse(deps);
			
			// for each dependency that is global, extract the summary
			var summaries = [ ];
			for (var prop in deps.refs) {
				if (deps.refs.hasOwnProperty(prop)) {
					var ref = deps.refs[prop];
					if (ref.kind === "global") {
						var depPath = ref.path;
						var summary = retrieveFn(depPath + "-summary");
						if (summary) {
							// also add the extra dependency information
							summary = JSON.parse(summary);
							summary.name = ref.name;
							summary.kind = ref.kind;
							summaries.push(summary);
						}
					}
				}
			}
			return summaries;
		};
		
		/**
		 * retrieves the summary with the given name if it exists, or null if it doesn't
		 */
		this.retrieveSummary = function(name) {
			if (!indexTargetFile) {
				return null;
			}
			// check local storage for file
			var deps = retrieveFn(indexTargetFile + "-deps");
			if (!deps) {
				return null;
			}
			deps = JSON.parse(deps);
			
			var ref = deps.refs[name];
			if (ref) {
				var summary = retrieveFn(ref.path + "-summary");
				if (summary) {
					// also add the extra dependency information
					summary = JSON.parse(summary);
					summary.name = name;
					summary.kind = ref.kind;
					return summary;
				} else {
					// dependency exists, but cannot be resolved
					return null;
				}
			}
			return null;
		};
		
		this.setTargetFile = function(targetFile){
			indexTargetFile = targetFile;
		};
		
		this.getTargetFile = function(){
			return indexTargetFile;
		};
		
		/**
		 * looks for a dependency with the given module name
		 * returns the path to that dependency
		 */
		this.hasDependency = function(name) {
			if (!indexTargetFile || !name) {
				return null;
			}
			// check local storage for file
			var deps = retrieveFn(indexTargetFile + "-deps");
			if (!deps) {
				return null;
			}
			deps = JSON.parse(deps);
			if (deps && deps.refs[name]) {
				return deps.refs[name].path;
			}
		};
	
		/**
		 * Two kinds of objects are worked with here:
		 *    dependency = { path : { path to file }, name { module name }, kind : { global, AMD }, timestamp : long }
		 *    summary = { provided : { name -> typeName }, types : { typeName -> { name -> typeName }, timestamp : long }
		 * 
		 * Performs the index asynchronously
		 * 
		 * optional callback is called after dependencies are retrieved
		 */
		this.performIndex = function(fileName, callback) {
			indexTargetFile = fileName;

			// first try to do the index as a webworker
			if (worker) {
				// start an indexing operation
				worker.postMessage({op : 'performIndex', filePath : fileName});
				// the worker doesn't have direct access to local storage, so it must be done via a callback
				worker.onmessage = function(event) {
					var obj = event.data;
					switch(obj.op) {
						case 'set':
							localStorage[obj.key] = obj.val;
							break;
						case 'status':
							scriptedLogger.debug(obj.msg, "INDEXER");
							break;
						case 'finished':
							// indexing is complete
							callback();
							purgeStaleStorage(statusFn);
							break;
					}
				};
			} else {
				var that = this;
				setTimeout(function() {	
					that._internalPerformIndex(fileName, callback); 
					purgeStaleStorage(statusFn);
				}, 100);
			}
			
			// since this function is being used as a syntax checker, must return an empty array
			return [];
		};
		
		/**
		 * Does the actual indexing.  Will be performed by a webworker if the current browser supports them.
		 * So, therefore must abstract away from localStorage and from calling the console
		 */
		this._internalPerformIndex = function(fileName, callback) {
			indexTargetFile = fileName;
			var indexer = this;
			// asynchronously ask server for dependencies of fileName
			getDependencies(fileName, statusFn, function(deps) { 
				// cache these dependencies
				cacheDeps(fileName, deps, persistFn);
		
				// for each dependency, check local storage to see if still valid
				var needsUpdating = checkCache(deps, retrieveFn);
				
				// ask server for contents of each stale dependency
				// ensure that this happens in order
				eachk(needsUpdating, 
					// function to call
					function(itemToUpdate, k) {
						createSummary(itemToUpdate, indexer, persistFn, statusFn, k);
					},
					
					// callback when completed
					function() {
						if (callback) {
							callback(deps);
						}
					});
			});
		};
	}
	
	return {
		Indexer : Indexer
	};
});


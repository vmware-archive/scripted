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

/*global define require FileReader window Worker XMLHttpRequest ActiveXObject setTimeout disableIndexerWorker */
/*jslint browser:true */



/**
 * this module defines the indexing service
 * and provides two operations:
 *   retrieveSummaries(file)  grabs the summaries for files that depend on the file file passed in
 *   performIndex(file)   calculates the dependencies of the file and updates the summaries of all of these dependencies
 */
define(["plugins/esprima/esprimaJsContentAssist", "servlets/jsdepend-client", "scripted/utils/storage", "when", "scriptedLogger"],
function(mEsprimaContentAssist, jsdepend, storage, when, scriptedLogger) {

/**
 * Promise aware array iterator. Loops over elements of an array from left to right
 * applying the function to each element in the array. The function gets passed
 * the element and the index in the array.
 */
function each(array, fun) {
	//TODO: move this function to utils/promises
	return when.reduce(array,
		function (ignore, element, i) {
			return fun.call(undefined, element, i);
		},
		null
	);
}

	// webworkers exist
	var worker;
	if ((this.window && this.window.Worker) && !this.window.isTest) {
		try {
			// comment this line out if you want to run w/o webworkers
			worker = new Worker('/scripts/plugins/esprima/indexerWorker.js');
		} catch (e) {
			if (this.console) {
				// TODO temporarily add the popup for debugging on firefox
				this.alert("Webworker not found");
				this.console.error(e);
			} else {
				throw e;
			}
		}
	} else {
		if (this.window) {
			if (this.window.isTest) {
				this.console.warn("Not using webworker since in a test");
			} else {
				// TODO temporarily add the popup for debugging on firefox
				this.alert("Web worker not available for background indexing.  Falling back to in-browser indexing.");
				this.console.warn("Web worker not available for background indexing.  Falling back to in-browser indexing.");
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
	 */
	function createSummary(dependency, indexer, persistFn, statusFn) {
		var file = dependency.path;
		var deferred = when.defer();
		// only index JS files
		if (file && (file.substr(-3, 3) === ".js" || file.substr(-5, 5) === ".node")) {
			jsdepend.getContents(file, function (contents) {
					var oldFile = indexer.getTargetFile();
					indexer.setTargetFile(file);
					var esprimaContentAssistant = new mEsprimaContentAssist.EsprimaJavaScriptContentAssistProvider(indexer, indexer.lintConfig);
					var structure = esprimaContentAssistant.computeSummary(contents, file);
					if (structure) {
						var textStructure = JSON.stringify(structure);
						var ts = generateTimeStamp();
						statusFn("Persisting summary of " + file);

						persistFn(file + "-summary", textStructure);
						persistFn(file + "-summary-ts", ts);
						indexer.setTargetFile(oldFile);
					} else {
						// couldn't create structure. likely a bad parse
						statusFn("Warning: could not summarize " + file + ". likely there is a problem with the file.");
					}
					deferred.resolve();
				},
				function (err) {
					statusFn("Warning: " + err + " when getting " + file);
					deferred.resolve();
				}
			);
		} else {
			deferred.resolve();
		}
		return deferred.promise;
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
			persistFn = function(key, value) { storage.safeStore(key, value); };
		}
		if (!retrieveFn) {
			retrieveFn = function(key) { return storage.get(key); };
		}
		if (!statusFn) {
			statusFn = function(msg) { scriptedLogger.debug(msg, "INDEXER"); };
		}


		// private instance variable
		var indexTargetFile;

		// private helper method
		function getDeps(name) {
			if (!indexTargetFile || !name) {
				return null;
			}
			// check local storage for file
			var deps = retrieveFn(indexTargetFile + "-deps");
			if (!deps) {
				return null;
			}
			return JSON.parse(deps);
		}

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
					if (ref.kind === "global" || ref.kind === "closure") {
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

		this.hasProblem = function(name) {
			var deps = getDeps(name);
			if (deps) {
				var dep = deps.refs[name];
				return dep && !dep.ignore && !dep.path;
			}
			return true;
		};

		/**
		 * looks for a dependency with the given module name
		 * returns the path to that dependency
		 */
		this.hasDependency = function(name) {
			var deps = getDeps(name);
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
							storage.safeStore(obj.key, obj.val);
							break;
						case 'status':
							scriptedLogger.debug(obj.msg, "INDEXER");
							break;
						case 'finished':
							// indexing is complete
							callback();
							break;
					}
				};
			} else {
				var that = this;
				setTimeout(function() {
					that._internalPerformIndex(fileName, callback);
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

				each(needsUpdating, function(element) {
					return createSummary(element, indexer, persistFn, statusFn);
				}).then(function() {
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


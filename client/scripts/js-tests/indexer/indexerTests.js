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
 
// Tests that the indexing service properly adds and retrieves indexed files.
// must use a stubbed out server

/*global define window console setTimeout */
define(["plugins/esprima/indexerService", "servlets/jsdepend-client", "orion/assert"], 
function(mIndexer, jsdependsStub, assert) {
	var sampleData1 = 
			{ "utils.js": {
				"kind": "commonjs",
				"path": "utils.js",
				"refs": {}
			},
			"sub/other.js": {
				"kind": "commonjs",
				"path": "sub/other.js",
				"refs": {
					"../utils": {
						"kind": "commonjs",
						"name": "../utils",
						"path": "utils.js"
					}
				}
			},
			"main.js": {
				"kind": "commonjs",
				"path": "main.js",
				"refs": {
					"./sub/other": {
						"kind": "commonjs",
						"name": "./sub/other",
						"path": "sub/other.js"
					},
					"./utils": {
						"kind": "commonjs",
						"name": "./utils",
						"path": "utils.js"
					}
				}
			}
		};
				
		
	var sampleContents1 = {
			"utils.js" : "exports.foo = 9;",
			"sub/other.js" : "exports.bar = 9; exports.foo2 = require('../utils');",
			"main.js" : "require('./utils').foo++; require('sub/other').foo2.foo++;"
	};
	
	var sampleSummaries1 = {
		"utils.js": {
			"kind": "commonjs",
			"name": "../utils",
			"provided": {
				"$$proto": {
					"path": "utils.js",
					"typeName": "Object"
				},
				"foo": {
					"path": "utils.js",
					"range": [
					8,
					11],
					"typeName": "Number"
				}
			},
			"types": {}
		},

		"sub/other.js": {
			"kind": "commonjs",
			"name": "./sub/other",
			"provided": {
				"$$proto": {
					"path": "sub/other.js",
					"typeName": "Object"
				},
				"bar": {
					"path": "sub/other.js",
					"range": [
					8,
					11],
					"typeName": "Number"
				},
				"foo2": {
					"path": "sub/other.js",
					"range": [
					25,
					29],
					"typeName": "gen~sub/other.js~2"
				}
			},
			"types": {
				"gen~sub/other.js~2": {
					"$$proto": {
						"path": "utils.js",
						"typeName": "Object"
					},
					"foo": {
						"path": "utils.js",
						"range": [
						8,
						11],
						"typeName": "Number"
					}
				}
			}
		}
	};

	function toCompareString(obj) {
		return JSON.stringify(obj, null, '  ');
	}
	
	var persistedData = {};
	var persistFn = function(key, value) { persistedData[key] = value; };
	var retrieveFn = function(key) { return persistedData[key]; };
	var statusFn = function(msg) { console.log(msg); };
	var indexer = new mIndexer.Indexer(persistFn, retrieveFn, statusFn);
	// TODO FIXADE not tested yet: retrieveGlobalSummaries  

	var setUp = function() {
		persistedData = {};
		jsdependsStub.clear();
		jsdependsStub.populateDGraph({ "main.js" : sampleData1 });
		jsdependsStub.populateContents(sampleContents1);
	};

	var tests = {};
	
	tests.asyncTestPerformIndex1 = function() {
		setUp();
		indexer.performIndex("main.js", function() {
			// check that the proper things are persisted
			for (var file in sampleContents1) {
				if (sampleContents1.hasOwnProperty(file)) {
					assert.ok(persistedData[file + "-summary"], 
						"Expected a summary of " + file + ", instead found:\n" + toCompareString(persistedData));
					assert.ok(persistedData[file + "-summary-ts"], 
						"Expected a timestamp for summary of " + file + ", instead found:\n" + toCompareString(persistedData));
					assert.ok(persistedData[file + "-deps"], 
						"Expected a dependency list for " + file + ", instead found:\n" + toCompareString(persistedData));
					assert.deepEqual(JSON.parse(persistedData[file + "-deps"]), sampleData1[file], 
						"Persisted dependency doesn't match provided");
					assert.ok(persistedData[file + "-deps-ts"], 
						"Expected a timestamp for the dependency list of " + file + ", instead found:\n" + toCompareString(persistedData));
				}
			}
			assert.start();
		});
	};
	
	tests.asyncTestHasDependency1 = function() {
		setUp();
		indexer.performIndex("main.js", function() {
			for (var file in sampleData1) {
				if (sampleData1.hasOwnProperty(file)) {
					indexer.setTargetFile(file);
					var refs = sampleData1[file].refs;
					for (var name in refs) {
						if (refs.hasOwnProperty(name)) {
							var foundDep = indexer.hasDependency(name);
							assert.equal(refs[name].path, foundDep, "Unexpected dendency found");
						}
					}
				}
			}
			assert.start();
		});
	};
	
	tests.asyncTestRetrieveSummary1 = function() {
		setUp();
		indexer.performIndex("main.js", function() {
			for (var file in sampleData1) {
				if (sampleData1.hasOwnProperty(file)) {
					indexer.setTargetFile(file);
					var refs = sampleData1[file].refs;
					for (var name in refs) {
						if (refs.hasOwnProperty(name)) {
							var foundDep = indexer.hasDependency(name);
							assert.equal(refs[name].path, foundDep, "Unexpected dendency found");
							var summary = indexer.retrieveSummary(name);
							sampleSummaries1[foundDep].name = name;
							assert.deepEqual(sampleSummaries1[foundDep], summary, "Summary doesn't match expected for " + name);
						}
					}
				}
			}
			assert.start();
		});
	};
	
	return tests;
});
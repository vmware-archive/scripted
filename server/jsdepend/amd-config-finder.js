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

/////////////////////////////////////
// amd-support
//
//   Implementation of discovery algorithms for finding amd configuration
//   in html or js files.
/////////////////////////////////////

var parser = require("./parser");
var treeMatcher = require('./tree-matcher');
var map = require('./utils').map;
var eachk = require('./utils').eachk;
var deref = require('./utils').deref;
var when = require('when');
var jsonMerge = require('./json-merge');
var getDirectory = require('./utils').getDirectory;
var orMap = require('./utils').orMap;
var ork = require('./utils').ork;
var getScriptTags = require('./script-tag-finder').getScriptTags;
var getScriptCode = require('./script-tag-finder').getScriptCode;
var treeMatcher = require('./tree-matcher');
var andPat = treeMatcher.andPat;
var orPat = treeMatcher.orPat;

function configure(conf) {

	//Note:
	//   conf = the 'global' configuration for the api, provides file system type operations
	//   resolverConf = configuration information for the resolver, varies based on the context
	//                  of where a reference came from.

	//conf.amd may contain additional amd config to add to the found config.
	//Only extra amd path elements are supported at the moment
	var extraPaths = deref(conf, ['amd', 'paths']);

	var parser = require("./parser");

	var getContents = conf.getContents;
	var listFiles = conf.listFiles;
	var pathResolve = require('./utils').pathResolve;
	var objectPat = treeMatcher.objectPat;
	var successPat = treeMatcher.successPat;
	var containsPat = treeMatcher.containsPat;
//	var successMatcher = treeMatcher.successMatcher;
	var variablePat = treeMatcher.variablePat;
	var arrayWithElementPat = treeMatcher.arrayWithElementPat;
	var isHtml = require('./html-utils').isHtml;

	function endsWith(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}

	function objectWithProperty(propName) {
		return objectPat({
			"type": "ObjectExpression",
			"properties": arrayWithElementPat(objectPat({
				"type": "Property",
				"key": {
					"type": "Identifier",
					"name": propName
				},
				"value": successPat
			}))
		});
	}

	var requireIdPat = orPat(["curl", "require", "requirejs"]);

	/**
	 * Matches an expression that refers to the require function to
	 * be called with configuration data.
	 * This is a pattern so that we can more easily allow for
	 * a few different ways to refer to this function.
	 */
	var requireConfigFunctionPat = orPat([
		objectPat({
			"type": "Identifier",
			"name": requireIdPat
		}),
		objectPat({
          "type": "MemberExpression",
          "object": {
            "type": "Identifier",
            "name": requireIdPat
          },
          "property": {
            "type": "Identifier",
            "name": "config"
          }
        })
    ]);

	var configBlockPat = objectWithProperty(orPat(["baseUrl", "paths", "packages"]));

	function findIndirectConfigBlock(tree) {

		var configIdNameVar = variablePat('string');

		var requireCallWithIdentifier = containsPat(objectPat({
			"type": "CallExpression",
			"callee": requireConfigFunctionPat,
			"arguments": [ {
                      "type": "Identifier",
                      "name": configIdNameVar
            }]
		}));
		var configBlock = null;
		requireCallWithIdentifier(tree)(
			//Success
			function () {
				var configIdName = configIdNameVar.value;
				var configDecl = objectPat({
                    "type": "VariableDeclarator",
                    "id": {
                      "type": "Identifier",
                      "name": configIdName
                    }
				});
				var pattern = containsPat(
					andPat([
							configDecl,
							containsPat(configBlockPat)
					])
				);
				pattern(tree)(
					//success
					function (found) {
						configBlock = found;
					},
					//fail
					function () {
					}
				);
			},
			//Fail
			function () {
			}
		);
		return configBlock;
	}

	function findRequireConfigBlock(tree) {
		//configBlockPat.debug = 'configBlockPat';
		var requireCall = objectPat({
			"type": "CallExpression",
			"callee": requireConfigFunctionPat
		});
		var requireAssignment = objectPat({
			"type": "AssignmentExpression",
			"operator": "=",
			"left": {
				"type": "Identifier",
				"name": "require"
			}
		});
		var pattern = containsPat(
				andPat([
					orPat([requireCall, requireAssignment]),
					containsPat(configBlockPat)
				])
		);

		var configBlock = null;
		pattern(tree)(
			//success
			function (found) {
				configBlock = found;
			},
			//fail
			function () {
			}
		);
		return configBlock;
	}

	//tries to determine the value of an expression.
	//if the value can not be statically determined then 'undefined' is returned.
	//Note: this function is essentially a dispatcher that delegates to different
	//analyzer functions depending on the expression type.
	function analyzeExp(exp) {
		var type = exp && exp.type;
		if (type) {
			var analyzerForType = analyzeExp[type];
			if (typeof(analyzerForType)==='function') {
				return analyzerForType(exp);
//			} else {
//				console.log("No analyzer for exp type: " + type);
//				console.log(JSON.stringify(exp, null, "  "));
			}
		}
	}

	var keyVar = variablePat("string");
	var valueVar = variablePat();
	var propPat = objectPat({
		"type": "Property",
	    "key": orPat([
			//It could be either an identifier or a string literal!
			objectPat({
				"type": "Identifier",
				"name": keyVar
			}),
			objectPat({
				"type": "Literal",
				"value": keyVar
			})
	    ]),
	    "value": valueVar
	});

	// given an ast node representing a property in an object exp,
	// analyzes the property and stores what it discovers in the obj as follows:
	//  if both key and value can be statically determined:
	//     - key -> value binding is added to the object
	//  if only key can be determined
	//     - key -> undefined is added to the object
	//  in all other cases nothing is added to the object.
	function analyzeProp(ast, obj) {
		propPat(ast)(
			/*success*/
			function () {
				obj[keyVar.value] = analyzeExp(valueVar.value);
			},
			/*fail*/
			function () {
				console.log('analyze prop failed on ast node:');
				console.log(JSON.stringify(ast, null, '  '));
			}
		);
	}

	//Receives an AST representation of a requirejs config block that defines stuff like
	//baseUrl and path mappings. It analyzes the config block and extracts useful info into
	//an easy to use form.
	function analyzeObjectExp(configBlock) {
		//configBlock looks something like this:
		//{
		//  "type": "ObjectExpression",
		//  "properties": [
		//    {
		//      "type": "Property",
		//      "key": {
		//        "type": "Identifier",
		//        "name": "baseUrl"
		//      },
		//      "value": {
		//        "type": "Literal",
		//        "value": "scripts"
		//      },
		//      "kind": "init"
		//    },
		var properties = configBlock && configBlock.properties;
		var obj;
		if (properties) {
			obj = {};
			for (var i=0; i<properties.length; i++) {
				analyzeProp(properties[i], obj);
			}
		}
		return obj;
	}

	analyzeExp.ObjectExpression = analyzeObjectExp;

	function analyzeArrayExp(exp) {
		//Exp looks something like this:
		//		{
		//		  "type": "ArrayExpression",
		//		  "elements": [ ... ]
		var elements = exp && exp.elements;
		var arr;
		if (elements) {
			arr = [];
			for (var i=0; i<elements.length; i++) {
				arr[i] = analyzeExp(elements[i]);
			}
		}
		return arr;
	}

	analyzeExp.ArrayExpression = analyzeArrayExp;

	var stringVar = variablePat("string");
	var literalPat = objectPat({
       "type": "Literal",
       "value": stringVar
	});

	function analyzeLiteral(exp) {
		var value;
		literalPat(exp)(
			function () {
				value = stringVar.value;
			},
			/*fail*/
			function () {
			}
		);
		return value;
	}

	analyzeExp.Literal = analyzeLiteral;

	function getAmdConfigFromCode(code) {
		if (code) {
			try {
				var tree = parser.parseAndThrow(code);
				//console.log('------------------------------------------------------');
				//console.log(JSON.stringify(tree, null, "  "));
				return analyzeObjectExp(findRequireConfigBlock(tree) ||
					findIndirectConfigBlock(tree)
				);
			} catch (err) {
				//couldn't parse it. Ignore that code.
			}
		}
	}

	function getAmdConfigFromDataMain(htmlFile, scriptTag, callback) {
		var datamain = scriptTag.attribs && scriptTag.attribs['data-main'];
		if (datamain) {
			var conf = {};
			var baseDir = getDirectory(datamain);
			conf.baseDir = baseDir;
			if (!endsWith(datamain, '.js')) {
				//https://github.com/scripted-editor/scripted/issues/132
				datamain = datamain+'.js';
			}
			// the tag points to a js file relative to the html file in which the tag was found.
			var jsFile = pathResolve(getDirectory(htmlFile), datamain);
			getContents(jsFile, function (jsCode) {
				conf = getAmdConfigFromCode(jsCode) || conf;
				conf.baseDir = conf.baseDir || conf.baseUrl || baseDir; //ensure we always have a baseDir set.
				//console.log("conf.baseDir = "+baseDir);
				return callback(conf);
			});
		} else {
			return callback(undefined);
		}
	}

	function getAmdConfigFromScriptTag(scriptTag) {
		var code = getScriptCode(scriptTag);
		//console.log("script-code = "+code);
		return getAmdConfigFromCode(code);
	}

	//file: the file where we extracted the config from
	//rawConfig: the config data not yet adjusted based on the location of the file
	//returns the config but now adjusted based on the file's location.
	function tailorToContext(file, rawConfig) {
		if (rawConfig) {
			var baseDir = rawConfig.baseDir || rawConfig.baseUrl;
			var fileDir = getDirectory(file);
			if (baseDir) {
				rawConfig.baseDir = pathResolve(fileDir, baseDir);
			} else {
				rawConfig.baseDir = fileDir; //if no explicit baseDir is set
									// then it is the same as the hmtl file.
			}
			return rawConfig;
		}
	}

	var REQUIRE_JS = /(.*\/)?(curl|require)\.js$/;

	function find(array, pred) {
		var pos = 0;
		while (pos<array.length) {
			if (pred(array[pos])) {
				return pos;
			}
			pos++;
		}
		return -1;
	}

	/**
	 * Helper to extract amd config out of an html file that loads the require config
	 * from another file via a script tag.
	 */
	function getConfigFromTagIndirectly(htmlFile, scriptTags, callback) {
		//The 'main' html file in a 511 project has two script tags.
		if ((deref(scriptTags, ["length"])||0) > 1) {
			//First find a tag that loads requirejs or curl.
			var pos = find(scriptTags, function (tag) {
				var scriptPath = deref(tag, ["attribs", "src"]);
				return scriptPath && REQUIRE_JS.test(scriptPath);
			});

			if (pos>=0) {
				//a tag loading the loader was found...
				//now look in the remaining tags for a config.
				scriptTags = scriptTags.slice(pos);
				return orMap(scriptTags,
					//Called on each tag, must call 'callback' to pass result
					function (tag, callback) {
						var appJsPath = deref(tag, ["attribs", "src"]);
						if (appJsPath) {
							var appJsFile = pathResolve(getDirectory(htmlFile), appJsPath);
							return getContents(appJsFile, function (jsCode) {
								return callback(getAmdConfigFromCode(jsCode));
							});
						}
						return callback(false);
					},
					callback
				);
			}
		}
		//If we reach here, some condition failed and callback wasn't called yet.
		return callback();
	}


	//determine basedir setting from a given html file by looking for
	// amd config blocks in the html file, or ... in some specific idioms.
	// looking in the .js files that get loaded by the script tags.
	//If the required information isn't found then
	//the result is 'false'.
	function getAmdConfigFromHtmlFile(file, callback) {
		getContents(file, function (contents) {
				var scriptTags = getScriptTags(contents);
				ork(
					function (callback) {
						getConfigFromTagIndirectly(file, scriptTags, callback);
					},
					function (callback) {
						orMap(scriptTags,
							function (scriptTag, callback) {
								getAmdConfigFromDataMain(file, scriptTag, function (config) {
									callback(config || getAmdConfigFromScriptTag(scriptTag));
								});
							},
							callback
						);
					}
				)(function (config) {
					callback(tailorToContext(file, config));
				});
			},
			function (err) {
				callback(false);
			}
		);
	}

	var logLine = 0;

	/**
	 * wraps a callback function so that is logs the value passed to the callback
	 * in JSON.stringified form.
	 */
	function logBack(msg, callback) {
		return function (result) {
			console.log(++logLine + " : " + msg);
			console.log(JSON.stringify(result, null, "  "));
			callback(result);
		};
	}

	var cacheCounter = 0;

	function makeCached(f, timeout) {
		//console.log("Instance of amd-config-finder created: "+(++cacheCounter));
		var cache = {};
		var touchedAt = Date.now();
		function cachedFun(param, callback) {
			touchedAt = Date.now();
			var d = cache[param];
			if (!d) {
				//Not yet in the cache
				d = when.defer();
				cache[param] = d;
				f(param, function (r) {
					return d.resolve(r);
				});
			}
			return d.promise.then(callback);
		}
		if (timeout) {
			setInterval(function() {
				var inactive = Date.now() - touchedAt;
				if (inactive>timeout) {
					//console.log('amd-config-finder-cache CLEARED');
					cache = {};
				}
			}, timeout);
		}
		return cachedFun;
	}

	/**
	 * To resolve a reference that was found in a given context, we need to
	 * determine some configuration information associated with that context.
	 * This function is responsible for fetching, computing or searching for
	 * that information. If found the information is passed to the callback.
	 * If not found, a 'falsy' value is passed to the callback.
	 */
	var getAmdConfig = function(context, callback) {
		//callback = logBack("amd-config '"+context+"' => ", callback);
		var dir = getDirectory(context);
		if (dir) {
			listFiles(dir,
				function (names) {
					var files = map(names, function (name) {
						return isHtml(name) && pathResolve(dir, name);
					});
					orMap(files, getAmdConfigFromHtmlFile,
						function (conf) {
							if (conf) {
								callback(conf);
							} else {
								getAmdConfig(dir, callback);
							}
						}
					);
				},
				function (err) {
					callback(false);
				}
			);
		} else {
			callback(false);
		}
	};

	/**
	 * Wrap a config getter function to add extra stuff to its result.
	 */
	function addExtraPaths(getter) {
		if (extraPaths) {
			return function (context, callback) {
				//callback = logBack("amd-config '"+context+"' => ", callback);
				return getter(context, function (amdConf) {
//					amdConf = amdConf || {
//						//Ensure a basic conf. Needs a 'baseDir' at minimum.
//						baseDir: getDirectory(context)
//					};

					//WARNING: when generalizing to include 'extraPackages'.
					//Be aware that jsonMerge won't do the job correctly because
					//packages are in a list and lists don't get merged but have
					//replacement behavior.
					return callback(jsonMerge(amdConf, {
						paths: extraPaths
					}));
				});
			};
		} else {
			return getter;
		}
	}

	getAmdConfig = makeCached(getAmdConfig, 10000);

	return {
		getAmdConfig: addExtraPaths(getAmdConfig),
			//getAmdConfig,
		forTesting: {
			configBlockPat: configBlockPat
		}
	};

}

exports.configure = configure;
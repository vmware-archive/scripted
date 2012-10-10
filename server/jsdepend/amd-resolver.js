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

/*global resolve require define esprima console module*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

////////////////////////////////////////
// amd-support
//
//   Support for resolving amd references.
/////////////////////////////////////////

function configure(conf) {

	var parser = require("./parser");
	var treeMatcher = require('./tree-matcher');
	//Note: 
	//   conf = the 'global' configuration for the api, provides file system type operations
	//   resolverConf = configuration information for the resolver, varies based on the context
	//                  of where a reference came from.

	var andPat = treeMatcher.andPat;
	var orPat = treeMatcher.orPat;
	
	var getContents = conf.getContents;
	var getDirectory = require('./utils').getDirectory;
	var orMap = require('./utils').orMap;
	var listFiles = conf.listFiles;
	var pathResolve = require('./utils').pathResolve;
	var getScriptTags = require('./script-tag-finder').getScriptTags;
	var getScriptCode = require('./script-tag-finder').getScriptCode;
	var htmlExtensions = ['.html', '.htm', '.HTML', '.HTM' ];
	var objectPat = treeMatcher.objectPat;
	var successPat = treeMatcher.successPat;
	var containsPat = treeMatcher.containsPat;
//	var successMatcher = treeMatcher.successMatcher;
	var variablePat = treeMatcher.variablePat;
	var arrayWithElementPat = treeMatcher.arrayWithElementPat;
	var mapPaths = require('./amd-path-mapper').mapPaths;
	
	function endsWith(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}
	
	//isHtml :: String -> (String | false)
	// if given name is the name of a html file then returns the name.
	// otherwise returns false.
	function isHtml(name) {
		return orMap(htmlExtensions, function (ext) {
			return endsWith(name, ext) && name;
		});
	}
	
	function getBaseDirFromDataMain(scriptTag) {
		var datamain = scriptTag.attribs && scriptTag.attribs['data-main'];
		return datamain && getDirectory(datamain);
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

	var configBlockPat = objectWithProperty(orPat(["baseUrl", "paths"]));
	
	function findConfigBlock(tree) {
		//configBlockPat.debug = 'configBlockPat';
		var requireCall = objectPat({
			"type": "CallExpression",
			"callee": containsPat(objectPat({
				"type": "Identifier",
				"name": orPat(["require", "requirejs"])
			}))
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
				//console.log(JSON.stringify(tree, null, "  "));
				return analyzeObjectExp(findConfigBlock(tree));
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
			if (endsWith(datamain, '.js')) {
				// the tag points to a js file relative to the html file in the tag was found.
				var jsFile = pathResolve(getDirectory(htmlFile), datamain);
				getContents(jsFile, function (jsCode) {
					conf = getAmdConfigFromCode(jsCode) || conf;
					conf.baseDir = conf.baseDir || baseDir; //ensure we always have a baseDir set.
					callback(conf);
				});
			} else {
				callback(conf);
			}
		} else {
			callback(undefined);
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
	
	//determine basedir setting from a given file by:
	//   - fetch contents of file
	//   - find all scripttags in the file 
	//      - if script tag that has a basedir attribute
	//        -  assume basedir points to a file.
	//        => the directory this file is in is the basedir
	//      - if script code has require({... baseDir: "some-string"  })
	//        => determine baseDir from the string value.
	//If the required information isn't found in this file, then
	//the result is 'false'.
	function getAmdConfigFromHtmlFile(file, callback) {
		getContents(file, function (contents) {
				var scriptTags = getScriptTags(contents);
				orMap(scriptTags, 
					function (scriptTag, callback) {
						getAmdConfigFromDataMain(file, scriptTag, function (config) {
							callback(config || getAmdConfigFromScriptTag(scriptTag));
						});
					},
					function (config) {
						callback(tailorToContext(file, config));
					}
				);
			},
			function (err) {
				callback(false);
			}
		);
	}
	
	/**
	 * To resolve a reference that was found in a given context, we need to 
	 * determine some configuration information associated with that context.
	 * This function is responsible for fetching, computing or searching for
	 * that information. If found the information is passed to the callback.
	 * If not found, a 'falsy' value is passed to the callback.
	 */
	function getAmdConfig(context, callback) {
		var dir = getDirectory(context);
		if (dir) {
			listFiles(dir, 
				function (names) {
					var files = names.map(function (name) {
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
	}
	 
	 
//	function getAmdConfig(context, callback, errback) {
//		// Version 2: 
//		//  - looks for a parent directory that has a html file. 
//		//  - assumes that the baseDir is the directory where this file was found.
//		var dir = getDirectory(context);
//		if (dir) {
//			listFiles(dir, 
//				function (names) {
//					var htmlFile = orMap(names, isHtml);
//					if (htmlFile) {
//						callback({baseDir: dir});
//					} else {
//						getAmdConfig(dir, callback, errback);
//					}
//				},
//				function (err) {
//					errback(err);
//				}
//			);
//		}
//	}
	
//	function getAmdConfig(context, callback, errback) {
//		//Version 1: 
//		//Stupid implementation: assumes that requirejs baseDir is the same
//		//directory as the file in which the reference was discovered.
//		
//		callback({
//			baseDir: getDirectory(context)
//		});
//	}
	
	function amdResolver(context, dep, callback) {
		getAmdConfig(context, function (resolverConf) {
			//console.log(resolverConf);
			var dir = resolverConf.baseDir || getDirectory(context);
			var searchFor = mapPaths(resolverConf, dep.name);
			searchFor = searchFor + '.js'; //TODO: handle case where file amd module
												//name ends with .js already.
			dep.path = pathResolve(dir, searchFor);
			callback(dep);
		});
	}
	
	//A 'resolver support' module provides a resolver for a particular kind of dependency.
	return {
		kind: 'AMD',
		resolver: amdResolver,
		forTesting: { //Exported with the only intention to allow unit testing. 
			getAmdConfig: getAmdConfig,
			configBlockPat: configBlockPat
		}
	};
	
} //end: function configure

exports.configure = configure;

/////////////////////////////////////////////////////////////////////////
}); //end amd define

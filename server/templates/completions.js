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
 *     Andrew Eisenberg - initial API and implementation
 ******************************************************************************/
 
/*jslint node:true */
/*global setTimeout exports console*/

/**
 * This module loads up all scripted completions and caches them
 * to be sent to the client.
 * See SCRIPTED-196 for more detail
 * File format of completions http://sublimetext.info/docs/en/extensibility/completions.html
 */

var JSON5 = require('json5');
var when = require('when');
var path = require('path');
var filesystem = require('../jsdepend/filesystem').withBaseDir(null);
var dotscripted = require('../jsdepend/dot-scripted').configure(filesystem);

var EXTENSION = ".scripted-completions";
var EXTENSION_LEN = EXTENSION.length;

exports.CompletionsProcessor = function(completionsFolders) {
	if (completionsFolders) {
		if (!Array.isArray(completionsFolders)) {
			completionsFolders = [ completionsFolders ];
		}
		this.completionsFolders = completionsFolders;
	}
};
exports.CompletionsProcessor.prototype = {
	extractScope : function(rawScope) {
		// looks like this. We care about the html part
		// "text.html - source - meta.tag, punctuation.definition.tag.begin"
		 
		if (!rawScope) {
			return null;
		}
		return rawScope.split(/\s+/)[0].split('.')[1];
	},

	// these are the default folders.
	completionsFolders : [
		path.resolve(__dirname, '../../completions'),
		dotscripted.getScriptedRcDirLocation()
	],

	// determine the file locations where completions are stored
	findCompletionsFiles : function(cb) {
		var realFiles = [];
		
		var processDir = function(deferred, folder) {
			// first go stat the directory to make sure it exists and is a dir
			// were getting problems on windows when trying to list files
			// of a non-existant dir
			filesystem.stat(folder).then(function (stats) {
				if (stats.isDirectory) {
					console.log("listing files for " + folder);
					filesystem.listFiles(folder).then(function(files) {
						for (var i = 0; i < files.length; i++) {
							if (files[i].substr(- EXTENSION_LEN, EXTENSION_LEN) === EXTENSION) {
								console.log("Found " + files[i]);
								realFiles.push(folder + path.sep + files[i]);
							}
						}
						deferred.resolve(realFiles);
					}, function(err) {
						console.log ("Directory " + err.path + " not found");
						deferred.resolve(realFiles);
					});
				} else {
					console.log (folder + " is not a directory");
					deferred.resolve(realFiles);
				}
			}, function(err) {
				console.log(err);
				deferred.resolve(realFiles);
			});
		};
		
		var deferreds = [];
		for (var i = 0; i < this.completionsFolders.length; i++) {
			console.log("About to process " + this.completionsFolders[i]);
			var deferred = when.defer();
			deferreds.push(deferred);
			processDir(deferred, this.completionsFolders[i]);
		}
		when.all(deferreds).then(function() { cb(realFiles); });
	},
	
	
	// finds the associated closing bracket
	findClosingBracket : function(contents, start) {
		var depth = 0;
		var i = start;
		while (i < contents.length) {
			if (contents.charAt(i) === "}") {
				if (depth === 0) {
					return i;
				} else {
					depth--;
				}
			} else if (contents.charAt(i) === "{") {
				depth++;
			}
			i++;
		}
		return -1;
	},

	/**
	 * Converts a template entry into a proposal that can be sent to the client
	 * @return {{ proposal:String, description:String, escapePosition:Number, positions:Array.<{offset:Number,length:Number}>, relevance:Number, style:String, trigger:String}}
	 */
	convertCompletion : function(rawCompletion) {
		if (!rawCompletion.contents) {
			if (typeof rawCompletion === 'string') {
				// just a string
				return {
					proposal : rawCompletion,
					description : rawCompletion + " : " + rawCompletion,
					trigger: rawCompletion,
					positions : null,
					escapePosition : rawCompletion.length
				};
			} else {
				return null;
			}
		}
		/** @type String */
		var rawContents = rawCompletion.contents;
		
		// fix indentation
		rawContents = rawContents.replace(/\n/g, "\n${lineStart}");
		rawContents = rawContents.replace(/\t/g, "${indent}");
		
		var trigger = rawCompletion.trigger;
		var isTemplate = rawCompletion.isTemplate;
		var contents = "";
		var positions = [];
		var escapePosition = null;
		for (var i = 0, j = 0; i < rawContents.length; i++, j++) {
			if (rawContents[i] === '$') {
				i++;
				var isNamed = false;
				if (rawContents[i] === '{') {
					i++;
					isNamed = true;
				}
				var argNum = parseInt(rawContents[i], 10);
				if (!isNaN(argNum)) {
					if (argNum === 0) {
						escapePosition = j;
						j--;
						if (isNamed) {
							// can't have a named escape location
							return null;
						}
					} else {
						var nextNum = parseInt(rawContents[i+1], 10);
						if (!isNaN(nextNum)) {
							// we have a number >= 10
							i++;
							argNum = 10*argNum + nextNum;
						}
						var name;
						if (isNamed) {
							i++;
							if (rawContents[i] !== ':') {
								if (rawContents[i] === '}') {
									name = "arg" + argNum;
								} else {
									return null;
								}
							} else {
								var nameStart = i+1;
								var nameEnd = this.findClosingBracket(rawContents, i);
								if (nameEnd <= nameStart) {
									return null;
								}
								name = rawContents.substring(nameStart, nameEnd);
								i = nameEnd;
							}
						} else {
							name = "arg" + argNum;
						}
						
						var offset = j;
						var length = name.length;
						if (!positions[argNum]) {
							positions[argNum] = [];
						}
						positions[argNum].push({offset : offset, length : length});
						contents += name;
						j += length - 1;
					}
				} else {
					i--;
					j++;
					if (isNamed) {
						contents += rawContents[i-1];
					}
					contents += rawContents[i];
					
				}
			} else {
				contents += rawContents[i];
			}
		}
		
		// first element is empty since it is escape position
		positions.shift();
		
		// check for all position numbers and flatten arrays
		for (i = 0; i < positions.length; i++) {
			if (!positions[i] || positions[i].length === 0) {
				// missing arg number
				return null;
			} else if (positions[i].length === 1) {
				positions[i] = positions[i][0];
			}
		}
		if (!trigger) {
			trigger = contents;
		}
		
		// now remove ugly variables from the description
		var descContents = contents.replace(/\n\$\{lineStart\}/g, "\n");
		descContents = descContents.replace(/\$\{indent\}/g, "\t");
		
		return {
			proposal : contents,
			description : trigger + " : " + descContents,
			trigger: trigger,
			positions : positions.length === 0 ? null : positions,
			escapePosition : escapePosition ? escapePosition : null,
			isTemplate : isTemplate
		};
	},

	findCompletions : function(fName) {
		var deferred = when.defer();
		var self = this;
		
		// Read the completions
		dotscripted.parseJsonFile(fName, function(rawCompletions) {
			console.log("Starting to find completions in " + fName);

			if (rawCompletions.error) {
				deferred.reject(rawCompletions.error);
				return;
			}
			try {
				// 4. Convert from pure JSON into proposals suitable for content assist
				var scope = self.extractScope(rawCompletions.scope);
				if (!scope) {
					deferred.reject("Invalid scope");
					return;
				}
				
				var completionsArr = rawCompletions.completions;
				if (!completionsArr) {
					deferred.reject("No completions array");
					return;
				}
				var realCompletions = [];
				for (var i = 0; i < completionsArr.length; i++) {
					var completion = self.convertCompletion(completionsArr[i]);
					if (completion) {
						realCompletions.push(completion);
					} else {
						console.warn("Invalid completion: " + JSON5.stringify(completionsArr[i]) + " ...ignoring");
					}
				}
				deferred.resolve({scope : scope, completions : realCompletions });
			} catch (e) {
				console.warn("Invalid completions file " + fName + "...ignoring");
				console.trace(e.stack);
				deferred.reject({});
			}
		});
		return deferred.promise;
	}
};

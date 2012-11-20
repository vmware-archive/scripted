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

var fs = require('fs');
var JSON5 = require('json5');
var when = require('when');

var EXTENSION = ".scripted-completions";
var EXTENSION_LEN = EXTENSION.length;

exports.extractScope = function(rawScope) {
	// looks like this. We care about the html part
	// "text.html - source - meta.tag, punctuation.definition.tag.begin"
	 
	if (!rawScope) {
		return null;
	}
	return rawScope.split(/\s+/)[0].split('.')[1];
};

exports.completionsFolder = process.env.HOME + '/' + EXTENSION;

// exported for testing only
exports._setCompletionsFolder = function(folder) {
	exports.completionsFolder = folder;
};


// 1. determine the file locations where completions are stored
// for now assume $HOME/.scripted-completions
exports.findCompletionsFiles = function(cb) {
	if (!process.env.HOME) {
		cb(null);
	} else {
		fs.readdir(exports.completionsFolder,
			function(err, files) {
				if (err) {
					console.log(JSON5.stringify(err));
					cb(null);
					return;
				}
				// only return files we care about
				var realFiles = [];
				for (var i = 0; i < files.length; i++) {
					if (files[i].substr(- EXTENSION_LEN, EXTENSION_LEN) === EXTENSION) {
						realFiles.push(files[i]);
					}
				}
				
				cb(realFiles);
			});
	}
};

/**
 * @return {{ proposal:String, description:String, escapePosition:Number, positions:Array.<{offset:Number,length:Number}>, relevance:Number, style:String , trigger:String}}
 */
exports.convertCompletion = function(rawCompletion) {
	if (!rawCompletion.contents) {
		if (typeof rawCompletion === 'string') {
			// just a string
			return {
				proposal : rawCompletion,
				description : rawCompletion + " : " + rawCompletion,
				trigger: rawCompletion,
				positions : [],
				escapePosition : rawCompletion.length
			};
		} else {
			return null;
		}
	}
	/** @type String */
	var rawContents = rawCompletion.contents;
	var trigger = rawCompletion.trigger;
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
			var argNum = parseInt(rawContents[i]);
			if (!isNaN(argNum)) {
				if (argNum === 0) {
					escapePosition = j;
					j--;
					if (isNamed) {
						// can't have a named escape location
						return null;
					}
				} else {
					var nextNum = parseInt(rawContents[i+1]);
					if (!isNaN(nextNum)) {
						// we have a number >= 10
						i++;
						argNum = 10*argNum + nextNum;
					}
					var name;
					if (isNamed) {
						i++;
						if (rawContents[i] !== ':') {
							return null;
						}
						var nameStart = i+1;
						var nameEnd = rawContents.indexOf('}', i);
						if (nameEnd <= nameStart) {
							return null;
						}
						name = rawContents.substring(nameStart, nameEnd);
						i = nameEnd;
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
					j += length - 1; // TODO why -1?
				}
			} else {
				i--;
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
	
	return {
		proposal : contents,
		description : trigger + " : " + contents,
		trigger: trigger,
		positions : positions,
		escapePosition : escapePosition ? escapePosition : contents.length
	};
};

exports.findCompletions = function(fName) {
	var deferred = when.defer();
	
	// 2. Read the completions
	fs.readFile(fName, "utf-8", function(err,data) {
		console.log("Starting to find completions in " + fName);

		if (err && (err.errno === 28 /*EISDIR directory */ || err.errno === 30 /*EISDIR file not found */)) {
			deferred.reject(err);
			return;
		}
		// 3. Parse to JSON
		try {
			var rawCompletions;
			if (typeof data === 'string') {
				rawCompletions = JSON5.parse(data);
			} else {
				rawCompletions = data;
			}

			// 4. Convert from pure JSON into proposals suitable for content assist
			var scope = exports.extractScope(rawCompletions.scope);
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
				var completion = exports.convertCompletion(completionsArr[i]);
				if (completion) {
					realCompletions.push(completion);
				} else {
					console.warn("Invalid completion: " + JSON5.stringify(completionsArr[i]) + " ...ignoring");
				}
			}
			console.log("Finished finding completions in " + fName);
			deferred.resolve({scope : scope, completions : realCompletions });
		} catch (e) {
			console.warn("Invalid completions file " + fName + " ...ignoring");
			console.trace(e.stack);
			deferred.reject(e);
		}
	});
	return deferred.promise;
};
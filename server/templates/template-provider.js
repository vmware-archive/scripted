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
/*global setTimeout clearTimeout */

/**
 * This module provides templates to the client.
 * Also, caches templates after being calculated by the completions module
 */
 
var completions = require("./completions");
var eachk = require("../jsdepend/utils").eachk;
var when = require('when');

exports.allCompletions = {};
exports.completed = false;

var t;
exports.process = function(root) {
	var deferred = when.defer();

	if (root) {
		if (completions.setCompletionsFolder(root)) {
			exports.allCompletions = {};
			exports.completed = false;
			console.log("Templates root reset");
		}
	}

	if (exports.completed) {
		// don't redo the work
		deferred.resolve(exports.allCompletions);
		return deferred.promise;
	}
		
	console.log("Processing templates");
	// can be called synchronously
	clearTimeout(t);
	/** @param {Array} files */
	completions.findCompletionsFiles(function(files) {
		console.log("found template files: " + files);
		if (!files) {
			exports.completed = true;
			console.warn("Error finding the completions directory.");
			deferred.reject("Error finding the completions directory.");
		} else {
			exports.completed = true;
			var deferreds = [];
			for (var i = 0; i < files.length; i++) {
				console.log("Starting to find completions in " + files[i]);
				deferreds.push(completions.findCompletions(files[i]));
				console.log("Finished finding completions in " + files[i]);
			}
			
			when.all(deferreds).then(
				function(completionsArr) {
					for (var i = 0; i < completionsArr.length; i++) {
						var res = completionsArr[i];
						if (!exports.allCompletions[res.scope]) {
							exports.allCompletions[res.scope] = res.completions;
						} else {
							exports.allCompletions[res.scope] = 
								exports.allCompletions[res.scope].concat(res.completions);
						}
					}
					deferred.resolve(exports.allCompletions);
				},
				function(err) {
					console.warn("Error processing completions: " + err);
					console.warn(err);
				}
			);
		}
	});
	return deferred.promise;
};
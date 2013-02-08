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

var when = require('when');

function configure(filesystem) {

var exports = {};

var completions = require('./completions').configure(filesystem);

exports.completed = false;

var defaultCompletionsProcessor = new completions.CompletionsProcessor();

var t;
exports.processTemplates = function(root) {
	var deferred = when.defer();
	var thisCompletionsProcessor;
	if (root) {
		thisCompletionsProcessor = new completions.CompletionsProcessor(root);
	} else {
		thisCompletionsProcessor = defaultCompletionsProcessor;
	}
	if (thisCompletionsProcessor.allCompletions) {
		// don't redo the work
		deferred.resolve(thisCompletionsProcessor.allCompletions);
		return deferred.promise;
	}

	thisCompletionsProcessor.allCompletions = {};

	console.log("Processing templates");
	// can be called synchronously
	clearTimeout(t);
	/** @param {Array.<String>} files */
	thisCompletionsProcessor.findCompletionsFiles(function(files) {
		console.log("found template files: " + files);
		if (!files) {
			console.warn("Error finding the completions directory.");
			deferred.reject("Error finding the completions directory.");
		} else {
			var deferreds = [];
			for (var i = 0; i < files.length; i++) {
				console.log("Starting to find completions in " + files[i]);
				deferreds.push(thisCompletionsProcessor.findCompletions(files[i]));
				console.log("Queued finding completions in " + files[i]);
			}

			console.log("Waiting for " + files.length + " queued completions file calculations to finish.");
			if (files.length > 0) {
				when.all(deferreds).then(
					function(completionsArr) {
						for (var i = 0; i < completionsArr.length; i++) {
							var res = completionsArr[i];
							if (!thisCompletionsProcessor.allCompletions[res.scope]) {
								thisCompletionsProcessor.allCompletions[res.scope] = res.completions;
							} else {
								thisCompletionsProcessor.allCompletions[res.scope] =
									thisCompletionsProcessor.allCompletions[res.scope].concat(res.completions);
							}
						}
						deferred.resolve(thisCompletionsProcessor.allCompletions);
					},
					function(err) {
						console.warn("Error processing completions: " + err);
						console.warn(err);
						deferred.reject("Error finding the completions directory.");
					}
				);
			} else {
				console.log("No completions file. Nothing to do.");
				deferred.resolve(thisCompletionsProcessor.allCompletions);
			}
		}
	});
	return deferred.promise;
};

return exports;
} //function configure

exports.configure = configure;
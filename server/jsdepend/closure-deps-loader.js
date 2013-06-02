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
 *     Anh-Kiet Ngo
 ******************************************************************************/

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

	var fs = require('fs'),
		when = require('when'),
		inProgress = null,
		depsTimestamp = 0,
		depsFile = '',
		deps = {},
		filesystem;

	function addDependency(file, provides, requires) {
		provides.forEach(function(provide) {
			deps[provide] = file;
		});
	}

	function clear() {
		deps = {};
	}

	function parseDependencies(depsContent) {
		var deps = /goog\.addDependency\((.*?)\);/g,
			match,
			args;

		try {
			while (match = deps.exec(depsContent)) {
				// Replacing single quotes with double to make it into valid JSON
				args = ('[' + match[1] + ']').replace(/'/g, '"');
				args = JSON.parse(args);
				if (args && args.length > 0) {
					addDependency.apply(this, args);
				}
			}
		} catch (e) {
			// Assume no dependencies, but log the error
			console.log('Cannot load deps file: ', e);
		}
	}

	function getFile(lookupName, callback) {
		var deferred;

		// The first request of a burst of requests will not have the inProgress
		// promise. So we set it and proceed to look at the deps file modification
		// time. Subsequent requests will wait for the deferred to be resolved.
		// This minimizes disk access and prevents race condition.
		if (!inProgress) {
			deferred = when.defer();
			inProgress = deferred.promise;

			// When the deferred is resolved, we reset inProgress
			inProgress.always(function() {
				inProgress = null;
			});

			fs.stat(depsFile, function(err, stats) {
				if (err) {
					// Something happened, let's just resolve so that we can fallback
					// to our cached data
					deferred.resolver.resolve();
				} else {
					if (stats.mtime > depsTimestamp) {
						// Preserve the file's timestamp for future checks
						depsTimestamp = stats.mtime;

						// Load new file and get the results
						fs.readFile(depsFile, 'utf8', function(err, data) {
							clear();
							parseDependencies(data);
							deferred.resolver.resolve();
						});
					} else {
						// The old file is still valid, let's just return its results
						deferred.resolver.resolve();
					}
				}
			});
		}

		// Register our lookup callback here
		inProgress.then(function() {
			callback(deps[lookupName]);
		});
	}

	exports.setDepsFile = function(file, fs) {
		depsTimestamp = 0;
		depsFile = file;
		filesystem = fs;
	};

	exports.getFile = getFile;
});

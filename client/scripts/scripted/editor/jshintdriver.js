/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM, VMware and others
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Derivative of Orions jslintdriver
 *     Andy Clement - changed to invoke jshint
 *******************************************************************************/
 
/*jshint browser:true*/
/*global JSHINT define */
define(["jshint"], function () {

	var localConfig, defaults, defaultIndent, bogus, warnings, errors, forEachChar;

	localConfig = {};

	defaults = [ "undef", "newcap", "smarttabs" ];
	defaultIndent = 3;

	bogus = ["Dangerous comment"];
	// TODO: i18n

	warnings = [
		["Expected '{'", "Statement body should be inside '{ }' braces."]
	];
	
	errors = [
		"Missing semicolon",
		"Extra comma",
		"Missing property name",
		"Unmatched ",
		" and instead saw",
		" is not defined",
		"Unclosed string",
		"Stopping, unable to continue"
	];

	forEachChar = Array.prototype.forEach.call.bind(Array.prototype.forEach);

	/**
	 * Merge the jshintrc file into any values loaded from .scripted, together with the defaults we want for jshint.
	 */
	function resolveConfiguration(jshintrc, config) {
		// defaults, these will be ON unless turned off in .scripted or .jshintrc
		//   undef: true, // Require all non-global variables be declared before they are used.
		//   newcap: true // Require capitalization of all constructor functions
		//   smarttabs: true // Suppresses warnings about mixed tabs and spaces when the latter are used for alignment only

		// These were the default for jslint:
		//		{white: false, onevar: false, undef: true, nomen: false, eqeqeq: true, plusplus: false,
		//		bitwise: false, regexp: true, newcap: true, immed: true, strict: false, indent: 1};
		var options;

		if (config) {
			options = config.options;
			if (!options) {
				config.options = options = {};
			}
		} else {
			options = {};
			config = { options: options };
		}

		Object.keys(jshintrc).forEach(function(key) {
			options[key] = jshintrc[key];
		});

		// Cache the config
		localConfig = config;

		// The globals can be defined in three places. jshint.options.predef
		// jshint.global and as a comment in the file.
		// This code will merge jshint.options.predef and
		// jshint.global - jshint.global wins on clashes
		if (config.global) {
			// For now let jshint.global splat over any jshint.options.predef
			config.options.predef = config.global;
		}
		// Here we have merged the jshintrc with anything loaded from .scripted.
		// Now set our defaults if values haven't already been set for these
		// config options.
		defaults.forEach(function(option) {
			if(!options.hasOwnProperty(option)) {
				options[option] = true;
			}
		});
	}
	
	function jshint(contents) {
		JSHINT(contents, localConfig.options, localConfig.options.predef);
		return JSHINT.data();
	}

	function cleanup(error) {
		// All problems are warnings by default
		fixWith(error, warnings, "warning", true);
		fixWith(error, errors, "error");

		return isBogus(error) ? null : error;
	}

	function fixWith(error, fixes, severity, force) {
		var description, fix, find, replace, found;

		description = error.description;

		for (var i = 0; i < fixes.length; i++) {
			fix = fixes[i];
			find = (typeof fix === "string" ? fix : fix[0]);
			replace = (typeof fix === "string" ? null : fix[1]);
			found = description.indexOf(find) !== -1;

			if (force || found) {
				error.severity = severity;
			}
			if (found && replace) {
				error.description = replace;
			}
		}
	}

	function isBogus(error) {
		var description = error.description;
		for (var i = 0; i < bogus.length; i++) {
			if (description.indexOf(bogus[i]) !== -1) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Entry point to this module, runs the linter over the 'contents' and returns a list
	 * of problems.
	 */
	function checkSyntax(title, contents) {
		var result, problems, positionalAdjustment, lines;

		result = jshint(contents);
		problems = [];
		// default (reduce 4 spaces to one tab means losing 3 chars)
		positionalAdjustment = localConfig.indent
			? (localConfig.indent - 1) : defaultIndent;

		if (result.errors) {
			parseErrors(result.errors, positionalAdjustment, problems);
		}

		if (result.functions) {
			parseFunctions(result.functions, lines, problems);
		}
		return { problems: problems };
	}

	function parseErrors(errors, positionalAdjustment, problems) {
		return errors.reduce(reduceErrors, problems);

		function reduceErrors(problems, error) {
			if(error) {
				var linetabpositions, index;

				linetabpositions = [];

				// This next block is to fix a problem in jshint. Jshint replaces
				// all tabs with spaces then performs some checks. The error
				// positions (character/space) are then reported incorrectly,
				// not taking the replacement step into account.  Here we look
				// at the evidence line and try to adjust the character position
				// to the correct value.
				if (error.evidence) {
					// Tab positions are computed once per line and cached
					var tabpositions = linetabpositions[error.line];
					if (!tabpositions) {
						var evidence = error.evidence;
						tabpositions = [];
						forEachChar(evidence, function(item, index) {
							if (item === '\t') {
								// First col is 1 (not 0) to match error positions
								tabpositions.push(index+1);
							}
						});
						linetabpositions[error.line]=tabpositions;
					}
					if (tabpositions.length>0) {
						var pos = error.character;
						tabpositions.forEach(function(tabposition) {
							if (pos>tabposition) {
								pos-=positionalAdjustment;
							}
						});
						error.character = pos;
					}
				}

				var start = error.character - 1,
					end = start + 1;
				if (error.evidence) {
					index = error.evidence.substring(start).search(/.\b/);
					if (index > -1) {
						end += index;
					}
				}
				// Convert to format expected by validation service
				error.description = error.reason;// + "(jshint)";
				error.start = error.character;
				error.end = end;
				error = cleanup(error);

				if (error) {
					problems.push(error);
				}
			}

			return problems;
		}
	}

	function parseFunctions(functions, contents, problems) {
		// Cache the per-line contents if necessary, see below.
		var lines;

		return functions.reduce(reduceFunctions, problems);

		function reduceFunctions(problems, func) {
			var unused = func.unused;

			if(unused && unused.length) {

				// Delay the split until here so that we don't do it until we know it's
				// absolutely necessary.
				if(!lines) {
					lines = contents.split(/\r?\n/);
				}

				var nameGuessed = func.name[0] === '"';
				var name = nameGuessed ? func.name.substring(1, func.name.length - 1) : func.name;
				var line = lines[func.line - 1];

				unused.forEach(function(unused) {
					// Find "function" token in line based on where fName appears.
					// nameGuessed implies "foo:function()" or "foo = function()",
					// and !nameGuessed implies "function foo()"
					var nameIndex = line.indexOf(name);
					var funcIndex = nameGuessed ? line.indexOf("function", nameIndex) : line.lastIndexOf("function", nameIndex);
					if (funcIndex !== -1) {
						problems.push({
							description: "Function declares unused variable '" + unused + "'.",
							line: func.line,
							character: funcIndex + 1,
							start: funcIndex+1,
							end: funcIndex + "function".length,
							severity: "warning"
						});
					}
				});
			}

			return problems;
		}
	}

	return {
		checkSyntax: checkSyntax,
		resolveConfiguration: resolveConfiguration
	};
});


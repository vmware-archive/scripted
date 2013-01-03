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
/*global JSHINT define window */
define(["jshint"], function () {

	/**
	 * Merge the jshintrc file into any values loaded from .scripted, together with the defaults we want for jshint.
	 */
	function resolveConfiguration(jshintrc) {
		// defaults, these will be ON unless turned off in .scripted or .jshintrc
		//   undef: true, // Require all non-global variables be declared before they are used.
		//   newcap: true // Require capitalization of all constructor functions
		//   smarttabs: true // Suppresses warnings about mixed tabs and spaces when the latter are used for alignment only
		
		// These were the default for jslint:
		//		{white: false, onevar: false, undef: true, nomen: false, eqeqeq: true, plusplus: false,
		//		bitwise: false, regexp: true, newcap: true, immed: true, strict: false, indent: 1};
		var options;
		if (window.scripted.config.jshint) {
			options = window.scripted.config.jshint.options;
			if (!options) {
				options = {};
				window.scripted.config.jshint = { "options": options };
			}
			for (var key in jshintrc) {
				options[key] = jshintrc[key];
			}
		} else {
			window.scripted.config.jshint = { "options": jshintrc };
		}
		// The globals can be defined in three places. jshint.options.predef jshint.global and as a comment in the file.
		// This code will merge jshint.options.predef and jshint.global - jshint.global wins on clashes
		if (window.scripted.config.jshint.global) {
			// For now let jshint.global splat over any jshint.options.predef
			window.scripted.config.jshint.options.predef = window.scripted.config.jshint.global;
		}
		// Here we have merged the jshintrc with anything loaded from .scripted. Now set our
		// defaults if values haven't already been set for these config options.
		var defaults = [ "undef", "newcap", "smarttabs" ];
		options = window.scripted.config.jshint.options;
		for (var d=0;d<defaults.length;d++) {
			if (!options.hasOwnProperty(defaults[d])) {
				options[defaults[d]]=true;
			}
		}
	}
	
	function jshint(contents) {
		JSHINT(contents, window.scripted.config.jshint.options, window.scripted.config.jshint.options.predef);
		return JSHINT.data();
	}

	function cleanup(error) {
		function fixWith(fixes, severity, force) {
			var description = error.description;
			for (var i = 0; i < fixes.length; i++) {
				var fix = fixes[i],
					find = (typeof fix === "string" ? fix : fix[0]),
					replace = (typeof fix === "string" ? null : fix[1]),
					found = description.indexOf(find) !== -1;
				if (force || found) {
					error.severity = severity;
				}
				if (found && replace) {
					error.description = replace;
				}
			}
		}
		function isBogus() {
			var bogus = ["Dangerous comment"], description = error.description;
			for (var i = 0; i < bogus.length; i++) {
				if (description.indexOf(bogus[i]) !== -1) {
					return true;
				}
			}
			return false;
		}
		var warnings = [
			["Expected '{'", "Statement body should be inside '{ }' braces."]
		];
		var errors = [
			"Missing semicolon",
			"Extra comma",
			"Missing property name",
			"Unmatched ",
			" and instead saw",
			" is not defined",
			"Unclosed string",
			"Stopping, unable to continue"
		];
		// All problems are warnings by default
		fixWith(warnings, "warning", true);
		fixWith(errors, "error");
		return isBogus(error) ? null : error;
	}

	/**
	 * Entry point to this module, runs the linter over the 'contents' and returns a list
	 * of problems.
	 */
	function checkSyntax(title, contents) {
		var result = jshint(contents);
		var problems = [];
		var i;
		var linetabpositions = [];
		var positionalAdjustment = 3; // default (reduce 4 spaces to one tab means losing 3 chars)
		if (window.scripted && window.scripted.config && window.scripted.config.jshint) {
			if (window.scripted.config.jshint.indent) {
				positionalAdjustment = window.scripted.config.jshint.indent - 1;
			}
		}
//		console.log("positionaladj = "+positionalAdjustment);
				
		if (result.errors) {
			var errors = result.errors;
			for (i=0; i < errors.length; i++) {
				var error = errors[i];
				if (error) {
				
					// This next block is to fix a problem in jshint. Jshint replaces all tabs with
					// spaces then performs some checks. The error positions (character/space) are
					// then reported incorrectly, not taking the replacement step into account.
					// Here we look at the evidence line and try to adjust the character position
					// to the correct value.
					if (error.evidence) {
						// Tab positions are computed once per line and cached
						var tabpositions = linetabpositions[error.line];
						if (!tabpositions) {
							var evidence = error.evidence;
							tabpositions = [];
							var len = evidence.length;
							for (var index=0;index<len;index++) {
								if (evidence[index]==='\t') {
									tabpositions.push(index+1); // First col is 1 (not 0) to match error positions
								}
							}
							linetabpositions[error.line]=tabpositions;
						}
						if (tabpositions.length>0) {
							var pos = error.character;
							for (var index=0;index<tabpositions.length;index++) {
								if (pos>tabpositions[index]) {
									pos-=positionalAdjustment;
								}
							}
//							console.log("Line:"+error.line+": position adjusted, was "+error.character+" now "+
//										pos+"   message:"+error.reason);
							error.character = pos;
						}
					}


					var start = error.character - 1,
						end = start + 1;
					if (error.evidence) {
						var index = error.evidence.substring(start).search(/.\b/);
						if (index > -1) {
							end += index;
						}
					}
					// Convert to format expected by validation service
					error.description = error.reason;// + "(jshint)";
					error.start = error.character;
					error.end = end;
					error = cleanup(error);
					if (error) { problems.push(error); }
				}
			}
		}
		if (result.functions) {
			var functions = result.functions;
			var lines;
			for (i=0; i < functions.length; i++) {
				var func = functions[i];
				var unused = func.unused;
				if (!unused || unused.length === 0) {
					continue;
				}
				if (!lines) {
					lines = contents.split(/\r?\n/);
				}
				var nameGuessed = func.name[0] === '"';
				var name = nameGuessed ? func.name.substring(1, func.name.length - 1) : func.name;
				var line = lines[func.line - 1];
				for (var j=0; j < unused.length; j++) {
					// Find "function" token in line based on where fName appears.
					// nameGuessed implies "foo:function()" or "foo = function()", and !nameGuessed implies "function foo()"
					var nameIndex = line.indexOf(name);
					var funcIndex = nameGuessed ? line.indexOf("function", nameIndex) : line.lastIndexOf("function", nameIndex);
					if (funcIndex !== -1) {
						problems.push({
							description: "Function declares unused variable '" + unused[j] + "'.",
							line: func.line,
							character: funcIndex + 1,
							start: funcIndex+1,
							end: funcIndex + "function".length,
							severity: "warning"
						});
					}
				}
			}
		}
		return { problems: problems };
	}
 
	return {
		checkSyntax: checkSyntax,
		resolveConfiguration: resolveConfiguration
	};
});


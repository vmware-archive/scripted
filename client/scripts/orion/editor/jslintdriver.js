
/*jslint browser: true*/

define("orion/editor/jslintdriver", [], function() {
//'examples/textview/textStyler', 'orion/editor/textMateStyler', 'orion/editor/asyncStyler', 'examples/textview/textStylerOptions'

	// from orion jslintplugin.js
	function jslint(contents) {
	    var options = {white: false, onevar: false, undef: true, nomen: false, eqeqeq: true, plusplus: false, bitwise: false, regexp: true, newcap: true, immed: true, strict: false, indent: 1};
		if (window.scripted && window.scripted.config && window.scripted.config.jslint) {
			if (window.scripted.config.jslint.global) {
				options.predef = window.scripted.config.jslint.global;
			}
			if (window.scripted.config.jslint.options) {
				var configOptions = window.scripted.config.jslint.options;
				for (var key in configOptions) {
					options[key] = configOptions[key];
				}
			}
		}
		JSLINT(contents, options);
		return JSLINT.data();
	}

	function cleanup(error) {
		function fixWith(fixes, severity, force) {
			var description = error.description;
			for (var i=0; i < fixes.length; i++) {
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
			for (var i=0; i < bogus.length; i++) {
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

	function checkSyntax(title, contents) {
				var result = jslint(contents);
				//this.dispatchEvent("syntaxChecked", {title: title, result: result});
				var problems = [];
				var i;
				if (result.errors) {
					var errors = result.errors;
					for (i=0; i < errors.length; i++) {
						var error = errors[i];
						if (error) {
							var start = error.character - 1,
							    end = start + 1;
							if (error.evidence) {
								var index = error.evidence.substring(start).search(/.\b/);
								if (index > -1) {
									end += index;
								}
							}
							// Convert to format expected by validation service
							error.description = error.reason;
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
    checkSyntax: checkSyntax
  };
});


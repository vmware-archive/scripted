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

/*global require module process */

//
// path-glob: simple 'glob' pattern matching utility to match path strings
// against ant-like path patterns using '**' and '*'.
//

// IMPORTANT: 
// It is assumed that patterns are always being matched against absolute
// path strings. Any 'relative' patterns will be interpreted as matching
// from the file system root.

// TODO: It could make sense to make the 'root dir' to which relative paths
// should be made relative a configuration option or parameter.

var pathResolve = require('../jsdepend/utils').pathResolve;

function configure(isWindows) {

	var BACKSLASH = /\\/g;

	var SPECIAL = ".$^()[]{}+|?"; //TODO: other things in need of escaping?

	function mustEscape(c) {
		for (var i = 0; i < SPECIAL.length; i++) {
			if (SPECIAL[i]===c) {
				return true;
			}
		}
		return false;
	}
	
	/**
	 * Regexp snippet to match a '/' depending on the platform.
	 */
	var SLASH = isWindows ? '[\\\\/]' : '/';
	
	/**
	 * Regexp snippet to match a 'non slash' depending on the platform.
	 */
	var NOT_SLASH = isWindows ? '[^\\\\/]' : '[^/]';

	/**
	 * Convert a pattern using '**' and '*' into a equivalent RegExp
	 * "**" surrounded by '/' will match any sequence of 'path segments',
	 * including a sequence of length 0. Using ** without surrounding '/'
	 * is not legal and results in an error.
	 * "*" will match any sequence of chars excluding '/'
	 */
	function pat2regexp(pat) {
		//TODO: something like this also exists in client-side code to
		// support 'afterSave' exec action triggering.
		
		//TODO: is all this string concatenation slow?
		var re = "^";
		if (isWindows) {
			pat = pat.replace(BACKSLASH, '/');
			//It's just easier only to have to deal with slashes in the pattern
			//But beware... we still need to handle both types of slashes in
			//path strings.
		}
		if (isWindows) {
			//Add a device portion to the regexp.
			var patHasDevice = /^[a-zA-z]:/.test(pat);
			if (patHasDevice) {
				re = re + pat.substring(0,2); //device portion -> re
				pat = pat.substring(2); //remove device portion from pat
			} else {
				re = re + '[a-zA-Z]:';
			}
		}
		
		//At this point there should be no more differences between win or nowin since
		//we already dealt with the device portion of the pattern.
		
		//Ensure patterns always start with a '/'
		if (pat[0]!=='/') {
			pat = '/' + pat;
		}
		
		var i = 0;
		while (i<pat.length) {
			if ("/**/"===pat.substring(i,i+4)) {
				re += SLASH+"(.*"+SLASH+")?";
				i+=4;
			} else if ("**"===pat.substring(i,i+2)) {
				throw "Bad glob pattern: "+pat+"\n '**' only allowed as follows '.../**/...' or '**/...";
			} else if ("/"===pat[i]) {
				re += SLASH;
				i++;
			} else {
				var c = pat[i++];
				if (c==='*') {
					re += NOT_SLASH+"*"; //Sequence of chars not including a 'slash'
				} else if (mustEscape(c)) {
					re += "\\"+c;
				} else {
					re += c;
				}
			}
		}
		re += "$";
		return new RegExp(re);
	}

	/**
	 * Constructor that takes a pattern string and returns a 'Glob' object capable of
	 * matching the pattern against a path string.
	 */
	function Glob(pat) {
		this.pat = pat;
		this.regexp = pat2regexp(pat);
	}

	Glob.prototype.toString = function () {
		return "Glob("+this.pat+")";
	};
	Glob.prototype.test = function (path) {
		return this.regexp.test(path);
	};

	function toGlob(globOrString) {
//		console.log('toGlob called '+globOrString);
		if (typeof(globOrString) === 'string') {
//			console.log('Creating Glob from string');
			return new Glob(globOrString);
		} else {
//			console.log('Already a glob I suppose?');
			return globOrString;
		}
	}

	function Or(args) {
		if (!Array.isArray(args)) {
			args = Array.prototype.slice.apply(arguments);
		}
		this.pats = args.map(toGlob);
	}
	Or.prototype.test = function (path) {
		for (var i = 0; i < this.pats.length; i++) {
			var pat = this.pats[i];
			if (pat.test(path)) {
				return true;
			}
		}
		return false;
	};
	Or.prototype.toString = function () {
		var str = 'Or( ';
		for (var i = 0; i < this.pats.length; i++) {
			if (i>0) {
				str += ', ';
			}
			str += this.pats[i].toString();
		}
		str += ' )';
		return str;
	};

	/**
	 * Given an Json object (already parsed from a Json string), turn it into a glob matcher.
	 * An array is turned into an 'Or' matcher and a String is turned into a
	 * individual Glob matcher.
	 *
	 * If an optional 'baseDir' argument is provided then all glob pattern strings will be
	 * made absolute by pathResolving them relative to baseDir.
	 */
	function fromJson(obj, baseDir) {
		if (Array.isArray(obj)) {
			var globs = obj.map(function (sub) {
				return fromJson(sub, baseDir);
			});
			return new Or(globs);
		} else if (typeof(obj)==='string') {
			return new Glob(baseDir ? pathResolve(baseDir, obj) : obj);
		} else {
			throw 'Glob matcher spec must be an array or a String: \n'+
				JSON.stringify(obj, null, '  ');
		}
	}

	return {
		fromJson: fromJson,
		Glob: Glob,
		Or: Or,
		isWindows: isWindows,
		configure: configure // provide the ability to create a manually configured module for
							// unit testing windows functionality on non-windows platforms.
	};
} // end function configure

module.exports = configure(process.platform === 'win32'); // configure for actual host platform.
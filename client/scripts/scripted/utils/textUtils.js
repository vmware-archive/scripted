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
/*jslint browser:true devel:true*/
/*global define window scripted */

// utilities for messing around with text
define([], function() {

	var indentText;

	return {
		/**
		 * @return {String} indentation preferences for current project
		 */
		indent : function() {

			if (!indentText) {
				var formatterPrefs = scripted && scripted.config && scripted.config.editor;
				if (!formatterPrefs) {
					return '\t';
				}

				var expandtab = formatterPrefs.expandtab;
				var tabsize = formatterPrefs.tabsize ? formatterPrefs.tabsize : 4;

				indentText = '';
				if (expandtab) {
					for (var i = 0; i < tabsize; i++) {
						indentText += " ";
					}
				} else {
					indentText = '\t';
				}
			}
			return indentText;
		},
		/**
		 * Returns a string of all the whitespace at the start of the current line.
		 * @param {String} buffer The document
		 * @param {Integer} offset The current selection offset
		 */
		leadingWhitespace : function(buffer, offset) {
			var whitespace = "";
			offset = offset-1;
			while (offset >= 0) {
				var c = buffer.charAt(offset--);
				if (c === '\n' || c === '\r') {
					//we hit the start of the line so we are done
					break;
				}
				if (this.isWhitespace(c)) {
					//we found whitespace to add it to our result
					whitespace = c.concat(whitespace);
				} else {
					//we found non-whitespace, so reset our result
					whitespace = "";
				}
			}
			return whitespace;
		},

		isWhitespace : function(c) {
			return (/\s/).test(c);
		},

		/** for testing only */
		_flushCache : function() {
			indentText = null;
		},

		/**
		 * @param {String} text the jsdoc text to format
		 * @return {String} html formatted version of the jsdoc
		 */
		formatJSdoc : function (text) {
			var splits = text.split("\n");
			var newSplits = [];
			splits.forEach(function(line, i) {
				// first strip out all line prefixes
				var lineLength = line.length, lineStart = 0, lineEnd = lineLength;
				if (i === 0) {
					if (line.charAt(0) && line.charAt(1) === '*') {
						lineStart += 2;
						if (line.charAt(2) === '*') {
							lineStart++;
						}
					}
				} else {
					while (lineStart < lineLength) {
						if (this.isWhitespace(line.charAt(lineStart))) {
							lineStart++;
						} else if ('*' === line.charAt(lineStart)) {
							if (' ' === line.charAt(lineStart+1)) {
								lineStart++;
							}
							lineStart++;
							break;
						} else {
							lineStart = 0;
							break;
						}
					}

				}

				// now remove the comment close
				if (i === splits.length -1) {
					if (line.substr(-2, 2) === '*/') {
						lineEnd -=2;
						lineEnd = Math.max(lineStart, lineEnd);
					}
				}

				// tags should be emboldened
				var newLine = line.substring(lineStart, lineEnd);
				if (newLine.charAt(0) === '@') {
					// assume tag
					var c = 1;
					while (c < newLine.length && !this.isWhitespace(newLine.charAt(c))) {
						c++;
					}
					newLine = "<span style=\"font-weight:bold; color:purple;\">" + newLine.charAt(1).toUpperCase() + newLine.substring(2, c) + "</span> " +
						"<br/>&nbsp;&nbsp;&nbsp;" + newLine.substring(c+1, newLine.length);
				}
				if (i > 0 || newLine.length > 0) {
					newSplits.push(newLine);
				}
			}, this);
			return newSplits.join('\n');
		}
	};
});
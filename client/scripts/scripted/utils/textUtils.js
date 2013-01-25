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
				if (/\s/.test(c)) {
					//we found whitespace to add it to our result
					whitespace = c.concat(whitespace);
				} else {
					//we found non-whitespace, so reset our result
					whitespace = "";
				}
			}
			return whitespace;
		}
	};

});
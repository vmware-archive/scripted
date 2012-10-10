/*******************************************************************************
 * @license
 * Copyright (c) 2011 IBM Corporation and others.
 * Copyright (c) 2012 VMware, Inc.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Andrew Eisenberg - rename to jsTemplateContentAssist.js
 *******************************************************************************/
/*global define */

define("orion/editor/jsTemplateContentAssist", [], function() {

	/**
	 * Returns a string of all the whitespace at the start of the current line.
	 * @param {String} buffer The document
	 * @param {Integer} offset The current selection offset
	 */
	function leadingWhitespace(buffer, offset) {
		var whitespace = "";
		offset = offset-1;
		while (offset > 0) {
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
	
	function findPreviousChar(buffer, offset) {
		var c = "";
		while (offset >= 0) {
			c = buffer[offset];
			if (c === '\n' || c === '\r') {
				//we hit the start of the line so we are done
				break;
			} else if (/\s/.test(c)) {
				offset--;
			} else {
				// a non-whitespace character, we are done
				break;
			}
		}
		return c;
	}
	
	var uninterestingChars = { 
		':': ':',
		'!': '!',
		'@': '@',
		'#': '#',
		'$': '$',
		'^': '^',
		'&': '&',
		'*': '*',
		'.': '.',
		'?': '?',
		'<': '<',
		'>': '>'
	};
	
	/** 
	 * Determines if the invocation location is a valid place to use
	 * templates.  We are not being too precise here.  As an approximation,
	 * just look at the previous character.
	 *
	 * @return {Boolean} true iff the current invocation location is 
	 * a valid place for template proposals to appear.
	 * This means that the invocation location is at the start of anew statement.
	 */
	function isValid(prefix, buffer, offset) {
		var previousChar = findPreviousChar(buffer, offset-prefix.length-1);
		return !uninterestingChars[previousChar];
	}
	
	/** 
	 * Removes prefix from string.
	 * @param {String} prefix
	 * @param {String} string
	 */
	function chop(prefix, string) {
		return string.substring(prefix.length);
	}
	
	/**
	 * Returns proposals for javascript templates
	 */
	function getTemplateProposals(prefix, buffer, offset) {
		//any returned positions need to be offset based on current cursor position and length of prefix
		var startOffset = offset-prefix.length;
		var proposals = [];
		var whitespace = leadingWhitespace(buffer, offset);
		//common vars for each proposal
		var text, description, positions, endOffset;
		if ("if".indexOf(prefix) === 0) {
			//if statement
			text = "if (condition) {\n" + whitespace + "\t\n" + whitespace + '}';
			description = "if - if statement";
			positions = [{offset: startOffset+4, length: 9}];
			endOffset = startOffset+whitespace.length+18;//after indentation inside if body
			proposals.push({proposal: chop(prefix, text), description: description, positions: positions, escapePosition: endOffset});
			//if/else statement
			text = "if (condition) {\n" + whitespace + "\t\n" + whitespace + "} else {\n" + whitespace + "\t\n" + whitespace + "}";
			description = "if - if else statement";
			positions = [{offset: startOffset+4, length: 9}];
			endOffset = startOffset+whitespace.length+18;//after indentation inside if body
			proposals.push({proposal: chop(prefix, text), description: description, positions: positions, escapePosition: endOffset});
		}
		if ("for".indexOf(prefix) === 0) {
			//for loop
			text = "for (var i = 0; i < array.length; i++) {\n" + whitespace + "\t\n" + whitespace + '}';
			description = "for - iterate over array";
			positions = [{offset: startOffset+9, length: 1}, {offset: startOffset+20, length: 5}];
			endOffset = startOffset+whitespace.length+42;//after indentation inside for loop body
			proposals.push({proposal: chop(prefix, text), description: description, positions: positions, escapePosition: endOffset});
			//for ... in statement
			text = "for (var property in object) {\n" + whitespace + "\tif (object.hasOwnProperty(property)) {\n" + 
				whitespace + "\t\t\n" + whitespace + "\t}\n" + whitespace + '}';
			description = "for..in - iterate over properties of an object";
			positions = [{offset: startOffset+9, length: 8}, {offset: startOffset+21, length: 6}];
			endOffset = startOffset+(2*whitespace.length)+73;//after indentation inside if statement body
			proposals.push({proposal: chop(prefix, text), description: description, positions: positions, escapePosition: endOffset});
		}
		//while loop
		if ("while".indexOf(prefix) === 0) {
			text = "while (condition) {\n" + whitespace + "\t\n" + whitespace + '}';
			description = "while - while loop with condition";
			positions = [{offset: startOffset+7, length: 9}];
			endOffset = startOffset+whitespace.length+21;//after indentation inside while loop body
			proposals.push({proposal: chop(prefix, text), description: description, positions: positions, escapePosition: endOffset});
		}
		//do/while loop
		if ("do".indexOf(prefix) === 0) {
			text = "do {\n" + whitespace + "\t\n" + whitespace + "} while (condition);";
			description = "do - do while loop with condition";
			positions = [{offset: startOffset+16, length: 9}];
			endOffset = startOffset+whitespace.length+6;//after indentation inside do/while loop body
			proposals.push({proposal: chop(prefix, text), description: description, positions: positions, escapePosition: endOffset});
		}
		//switch statement
		if ("switch".indexOf(prefix) === 0) {
			text = "switch (expression) {\n" + whitespace + "\tcase value1:\n" + whitespace + "\t\t\n" +
			whitespace + "\t\tbreak;\n" + whitespace + "\tdefault:\n" + whitespace + "}";
			description = "switch - switch case statement";
			positions = [{offset: startOffset+8, length: 10}, {offset: startOffset + 28, length: 6}];
			endOffset = startOffset+(2*whitespace.length)+38;//after indentation inside first case statement
			proposals.push({proposal: chop(prefix, text), description: description, positions: positions, escapePosition: endOffset});
		}
		if ("try".indexOf(prefix) === 0) {
			//try..catch statement
			text = "try {\n" + whitespace + "\t\n" + whitespace + "} catch (err) {\n" + whitespace + "}";
			description = "try - try..catch statement";
			endOffset = startOffset+whitespace.length+7;//after indentation inside try statement
			proposals.push({proposal: chop(prefix, text), description: description, escapePosition: endOffset});
			//try..catch..finally statement
			text = "try {\n" + whitespace + "\t\n" + whitespace + "} catch (err) {\n" + whitespace +
				"} finally {\n" + whitespace + "}";
			description = "try - try..catch statement with finally block";
			endOffset = startOffset+whitespace.length+7;//after indentation inside try statement
			proposals.push({proposal: chop(prefix, text), description: description, escapePosition: endOffset});
		}
		return proposals;
	}

	/**
	 * Returns proposals for javascript keywords.
	 */
	function getKeyWordProposals(prefix, buffer, offset) {
		var keywords = ["break", "case", "catch", "continue", "debugger", "default", "delete", "do", "else", "finally", 
			"for", "function", "if", "in", "instanceof", "new", "return", "switch", "this", "throw", "try", "typeof", 
			"var", "void", "while", "with"];
		var proposals = [];
		for (var i = 0; i < keywords.length; i++) {
			if (keywords[i].indexOf(prefix) === 0) {
				proposals.push({proposal: chop(prefix, keywords[i]), description: keywords[i] });
			}
		}
		return proposals;
	}

	/**
	 * @name orion.editor.JSTemplateContentAssistProvider
	 * @class Provides content assist for JavaScript keywords.
	 */

	function JSTemplateContentAssistProvider() {}

	JSTemplateContentAssistProvider.prototype = /** @lends orion.editor.JSTemplateContentAssistProvider.prototype */
	{
		computeProposals: function(buffer, offset, context) {
			var prefix = context.prefix;
			var proposals = [];
			if (!isValid(prefix, buffer, offset)) {
				return proposals;
			}

			//we are not completing on an object member, so suggest templates and keywords
			proposals = proposals.concat(getTemplateProposals(prefix, buffer, offset));
			proposals = proposals.concat(getKeyWordProposals(prefix, buffer, offset));
			return proposals;
		}
	};

	return {
		JSTemplateContentAssistProvider: JSTemplateContentAssistProvider
	};
});
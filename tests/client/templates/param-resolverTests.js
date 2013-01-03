/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

/*global scripted:true */

// Tests for the param-resolver module
define(['orion/assert', 'scripted/exec/param-resolver', 'tests/client/common/testutils', 'jquery'], 
function(assert, resolver, mTestutils) {
	var createMockEditor = function(text, path, selStart, selEnd) {
		return {
			getFilePath : function() { return path; },
			getText : function() { return text; },
			getTextView : function() {
				return {
					getSelection : function() {
						return {
							start : selStart,
							end : selEnd
						};
					}
				};
			}
		};
	};
	
	var doReplaceParams = function(text, path, selStart, selEnd, proposal) {
		proposal = proposal || text;
		return resolver.forEditor(createMockEditor(text, path, selStart, selEnd)).replaceParams(proposal);
	};
	
	var doFindReplacements = function(text, path, selStart, selEnd, proposal) {
		proposal = proposal || text;
		return resolver.forEditor(createMockEditor(text, path, selStart, selEnd)).findReplacements(proposal);
	};
	
	
	
	var origExpandtab, origTabsize;
	if (! window.scripted) {
		window.scripted = {};
	}
	if (!scripted.config) {
		scripted.config = {};
	}
	if (!scripted.config.editor) {
		scripted.config.editor = {};
	}
	var formatterPrefs = scripted.config.editor;
	
	var tests = [];
	tests.module = function() {
		module("Param Resolver tests", {
			setup: function() {
				origExpandtab = formatterPrefs.expandtab;
				origTabsize = formatterPrefs.tabsize;
			},
			teardown: function() {
				formatterPrefs.expandtab = origExpandtab;
				formatterPrefs.tabsize = origTabsize;
			}
		});
	};
	
	tests["test param-resolver no-op"] = function() {
		assert.equal(doReplaceParams("foo"), "foo");
	};
	tests["test param-resolver file"] = function() {
		assert.equal(doReplaceParams("fff ${file} fff", "my/path/is/here"), "fff my/path/is/here fff");
	};
	tests["test param-resolver dir"] = function() {
		assert.equal(doReplaceParams("fff ${dir} fff", "my/path/is/here"), "fff my/path/is fff");
	};
	tests["test param-resolver leading1"] = function() {
		assert.equal(doReplaceParams("fff ${lineStart} fff", "", 5, 7), "fff  fff");
	};
	tests["test param-resolver leading2"] = function() {
		assert.equal(doReplaceParams("  fff ${lineStart} fff", "", 5, 7), "  fff    fff");
	};
	tests["test param-resolver leading3"] = function() {
		assert.equal(doReplaceParams("        \n  fff ${lineStart} fff", "", 12, 14), "        \n  fff    fff");
	};
	tests["test param-resolver leading4"] = function() {
		assert.equal(doReplaceParams("        ffffff\n  fff ${lineStart} fff", "", 9, 10), "        ffffff\n  fff          fff");
	};
	tests["test param-resolver leading5"] = function() {
		assert.equal(doReplaceParams("        ffffff\n  fff ${lineStart} fff", "", 3, 10), "        ffffff\n  fff     fff");
	};
	tests["test param-resolver indent1"] = function() {
		formatterPrefs.expandtab = false;
		assert.equal(doReplaceParams("${indent}"), "\t");
	};
	tests["test param-resolver indent2"] = function() {
		formatterPrefs.expandtab = true;
		formatterPrefs.tabsize = 4;
		assert.equal(doReplaceParams("${indent}"), "    ");
	};
	tests["test param-resolver indent3"] = function() {
		formatterPrefs.expandtab = true;
		formatterPrefs.tabsize = 3;
		assert.equal(doReplaceParams("${indent}"), "   ");
	};
	tests["test param-resolver indent4"] = function() {
		formatterPrefs.expandtab = true;
		formatterPrefs.tabsize = 3;
		assert.equal(doReplaceParams("${indent}${indent}${indent}"), "         ");
	};
	
	tests["test find replacements 1"] = function() {
		var proposal = "${indent}";
		assert.deepEqual(doFindReplacements(proposal), [
			{
				start: 0,
				end: proposal.length-1,
				text: '\t',
				lengthAdded: 1 - proposal.length
			}
		]);
	};
	
	tests["test find replacements 2"] = function() {
		var proposal = "${lineStart}${indent}here";
		var buffer = "\n  foo";
		assert.deepEqual(doFindReplacements(buffer, "", 4, 5, proposal), [
			{
				start: 0,
				end: "${lineStart}".length-1,
				text: '  ',
				lengthAdded: 2 - "${lineStart}".length
			},
			{
				start: "${lineStart}".length,
				end: "${lineStart}".length + "${indent}".length-1,
				text: '\t',
				lengthAdded: 1 - "${indent}".length
			}
		]);
	};
	
	return tests;
});
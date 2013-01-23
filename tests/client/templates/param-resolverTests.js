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
			getText : function(start, end) {
				if (end) {
					return text.substring(start, end);
				}
				return text;
			},
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
	
	tests["test param-resolver nuthin1"] = function() {
		formatterPrefs.expandtab = false;
		formatterPrefs.tabsize = 4;
		assert.equal(doReplaceParams("${i-aint-a-param}"), "${i-aint-a-param}");
	};
	tests["test param-resolver nuthin2"] = function() {
		formatterPrefs.expandtab = false;
		formatterPrefs.tabsize = 3;
		assert.equal(doReplaceParams("${i-aint-a-param}${indent}"), "${i-aint-a-param}\t");
	};
	tests["test param-resolver nuthin3"] = function() {
		formatterPrefs.expandtab = false;
		formatterPrefs.tabsize = 3;
		assert.equal(doReplaceParams("${i-aint-a-param${indent}}${indent}"), "${i-aint-a-param\t}\t");
	};
	
	tests["test selection 0"] = function() {
		var contents = "foo bar";
		assert.equal(doReplaceParams(contents, '/b', contents.indexOf('foo'), contents.indexOf('foo') + 3, "${selection}"), "foo");
	};
	
	tests["test selection 1"] = function() {
		var contents = "foo bar";
		assert.equal(doReplaceParams(contents, '/b', contents.indexOf('bar'), contents.indexOf('bar') + 3, "${selection}"), "bar");
	};
	
	tests["test selection 2"] = function() {
		var contents = "baz foo bar";
		var newContents = "{foo}";
		var sel = 'foo';
		assert.equal(doReplaceParams(contents, '/b', contents.indexOf(sel), contents.indexOf(sel) + sel.length, "{${selection}}"), newContents);
	};
	
	tests["test selection 3"] = function() {
		var contents = "baz\n\t\tfoo bar";
		var newContents = "{\n\t\tfoo}";
		var sel = '\n\t\tfoo';
		assert.equal(doReplaceParams(contents, '/b', contents.indexOf(sel), contents.indexOf(sel) + sel.length, "{${selection}}"), newContents);
	};
	
	tests["test selection 4"] = function() {
		var contents = "baz\n\tfoo\n\t\tfoo bar";
		var newContents = "{\t\n\tfoo\n\t\tfoo}";
		var sel = "\n\tfoo\n\t\tfoo";
		assert.equal(doReplaceParams(contents, '/b', contents.indexOf(sel), contents.indexOf(sel) + sel.length, "{\t${selection}}"), newContents);
	};
	
	tests["test selection 5"] = function() {
		var contents = "baz\n\tfoo\n\t\tfoo bar";
		var newContents = "{\t\n\t\tfoo\n\t\t\tfoo}";
		var sel = "\n\tfoo\n\t\tfoo";
		assert.equal(doReplaceParams(contents, '/b', contents.indexOf(sel), contents.indexOf(sel) + sel.length, "{${indent}${selection}}"), newContents);
	};
	
	// ${indent} and ${lineStart} have special meanings to #{selection}
	tests["test selection 6"] = function() {
		var contents = "baz\nfoo\nfoo\n\tfoo bar";
		var newContents = "{\tfoo\n\tfoo\n\t\tfoo}\t\tfoo\n\t\tfoo\n\t\t\tfoo";
		var sel = "foo\nfoo\n\tfoo";
		assert.equal(doReplaceParams(contents, '/b', contents.indexOf(sel), contents.indexOf(sel) + sel.length, "{${indent}${selection}}${lineStart}${indent}${indent}${selection}"), newContents);
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
	
	tests["test find replacements 3"] = function() {
		var proposal = "${lineStart}${indent}${selection}here";
		var buffer = "\n  foo xxx";
		assert.deepEqual(doFindReplacements(buffer, "", buffer.indexOf("foo"), buffer.indexOf("foo")+3, proposal), [
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
			},
			{
				start: "${lineStart}${indent}".length,
				end: "${lineStart}${indent}${selection}".length-1,
				text: 'foo',
				lengthAdded: 'foo'.length - "${selection}".length
			}
			
		]);
	};
	
	tests["test find replacements 4"] = function() {
		var proposal = "${lineStart}${${indent}${selection}here";
		var buffer = "\n  foo xxx";
		assert.deepEqual(doFindReplacements(buffer, "", buffer.indexOf("foo"), buffer.indexOf("foo")+3, proposal), [
			{
				start: 0,
				end: "${lineStart}".length-1,
				text: '  ',
				lengthAdded: 2 - "${lineStart}".length
			},
			{
				start: "${lineStart}${".length,
				end: "${lineStart}${".length + "${indent}".length-1,
				text: '\t',
				lengthAdded: 1 - "${indent}".length
			},
			{
				start: "${lineStart}${${indent}".length,
				end: "${lineStart}${${indent}${selection}".length-1,
				text: 'foo',
				lengthAdded: 'foo'.length - "${selection}".length
			}
			
		]);
	};
	
	return tests;
});
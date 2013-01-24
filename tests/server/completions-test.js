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
 *     Andrew Eisenberg - initial API and implementation
 ******************************************************************************/

/*jslint node:true */
/*global require exports __dirname console */

var completionsModule = require("../../server/templates/completions");
var path = require('path');

var testResourcesFolder = path.resolve(__dirname, "test-resources");


var assertEqualArrays = require('./test-utils').assertEqualArrays;

exports.extractScope = function(test) {
	var completionsProcessor = new completionsModule.CompletionsProcessor();
	test.equals("html", completionsProcessor.extractScope("text.html - source - meta.tag, punctuation.definition.tag.begin"));
	test.equals("js", completionsProcessor.extractScope("source.js - source - meta.tag, punctuation.definition.tag.begin"));
	test.equals(null, completionsProcessor.extractScope("- source - meta.tag, punctuation.definition.tag.begin"));
	test.equals(null, completionsProcessor.extractScope(null));
	test.done();
};

exports.findCompletionsFiles = function(test) {
	var completionsProcessor = new completionsModule.CompletionsProcessor(testResourcesFolder);
	completionsProcessor.findCompletionsFiles(
		function(files) {
			var expect = [1,2,3, 4].map(function (i) {
				return testResourcesFolder + path.sep + "test"+i+".scripted-completions";
			});
			assertEqualArrays(test, expect, files);
			test.done();
		},
		function(err) {
			test.fail(err);
			test.done();
		}
	);
};

var errback = function(test) {
	return function(err) {
		if (err.stack) {
			console.log(err);
			console.log(err.stack);
		}
		test.fail(err);
		test.done();
	};
};

exports.findCompletions1 = function(test) {
	var completionsProcessor = new completionsModule.CompletionsProcessor(testResourcesFolder);
	completionsProcessor.findCompletions(
		testResourcesFolder + path.sep + "test1.scripted-completions").then(
		function(res) {
			var completions = res.completions;
			test.equals(completions.length, 5);

			var completion = '<a href="arg1"></a>';
			test.equals(completions[0].proposal, completion);
			test.equals(completions[0].description, completions[0].trigger + " : " + completion);
			test.equals(completions[0].trigger, "a");
			test.deepEqual(completions[0].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}]);
			test.equals(completions[0].escapePosition, completion.indexOf("</a>"));
			
			completion = '<abbr></abbr>';
			test.equals(completions[1].proposal, completion);
			test.equals(completions[1].description, completions[1].trigger + " : " + completion);
			test.equals(completions[1].trigger, "abbr");
			test.deepEqual(completions[1].positions, null);
			test.equals(completions[1].escapePosition, completion.indexOf("</abbr>"));
			
			completion = '<acronym></acronym>';
			test.equals(completions[2].proposal, completion);
			test.equals(completions[2].description, completions[2].trigger + " : " + completion);
			test.equals(completions[2].trigger, "acronym");
			test.deepEqual(completions[2].positions, null);
			test.equals(completions[2].escapePosition, completion.indexOf("</acronym>"));
			
			completion = '<acronym>arg1</acronym>';
			test.equals(completions[3].proposal, completion);
			test.equals(completions[3].description, completions[3].trigger + " : " + completion);
			test.equals(completions[3].trigger, "acronym");
			test.deepEqual(completions[3].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}]);
			test.equals(completions[3].escapePosition, completion.indexOf("</acronym>"));
			
			completion = '<acronym>arg1arg2</acronym>';
			test.equals(completions[4].proposal, completion);
			test.equals(completions[4].description, completions[4].trigger + " : " + completion);
			test.equals(completions[4].trigger, "acronym");
			test.deepEqual(completions[4].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}, {offset:completion.indexOf("arg2"), length:"arg2".length}]);
			test.equals(completions[4].escapePosition, completion.indexOf("</acronym>"));
			test.done();
		}, errback(test));
};
		
exports.findCompletions2 = function(test) {
	var completionsProcessor = new completionsModule.CompletionsProcessor(testResourcesFolder);
	completionsProcessor.findCompletions(
		testResourcesFolder + path.sep + "test2.scripted-completions").then(
		function(res) {
			var completions = res.completions;
			test.equals(completions.length, 4);
			var i = 0;
			var completion = '<acronym>arg1arg2</acronym>';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}, {offset:completion.indexOf("arg2"), length:"arg2".length}]);
			test.equals(completions[i].escapePosition, completion.indexOf("arg1"));
			i++;
			
			completion = 'arg1<acronym></acronym>arg2';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}, {offset:completion.indexOf("arg2"), length:"arg2".length}]);
			test.equals(completions[i].escapePosition, completion.indexOf("</acronym>"));
			i++;
			
			completion = 'arg2<acronym></acronym>arg1';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [
				{offset:completion.indexOf("arg1"), length:"arg1".length},
				{offset:completion.indexOf("arg2"), length:"arg2".length}
			]);
			test.equals(completions[i].escapePosition, completion.indexOf("</acronym>"));
			i++;
			
			completion = 'arg2<acronym></acronym>arg1';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [
				{offset:completion.indexOf("arg1"), length:"arg1".length},
				{offset:completion.indexOf("arg2"), length:"arg2".length}
			]);
			test.equals(completions[i].escapePosition, completion.length);
			i++;
			test.done();
		}, errback(test));
};

exports.findCompletions3 = function(test) {
	var completionsProcessor = new completionsModule.CompletionsProcessor(testResourcesFolder);
	completionsProcessor.findCompletions(
		testResourcesFolder + path.sep + "test3.scripted-completions").then(
		function(res) {
			var completions = res.completions;
			// last two completions are invalid
			test.equals(completions.length, 9);
			var i = 0;
			var completion = '<acronym>foo</acronym>';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [{offset:completion.indexOf("foo"), length:"foo".length}]);
			test.ok(!completions[i].escapePosition);
			i++;
			
			completion = 'foo<acronym></acronym>';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [{offset:completion.indexOf("foo"), length:"foo".length}]);
			test.ok(!completions[i].escapePosition);
			i++;
			
			completion = '<acronym></acronym>foo';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [{offset:completion.indexOf("foo"), length:"foo".length}]);
			test.ok(!completions[i].escapePosition);
			i++;
			
			completion = '<acronym>foobar</acronym>';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [
				{offset:completion.indexOf("foo"), length:"foo".length},
				{offset:completion.indexOf("bar"), length:"bar".length}
			]);
			test.equals(completions[i].escapePosition, completion.indexOf("</acronym>"));
			i++;
			
			completion = 'bar<acronym></acronym>fooarg3';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [
				{offset:completion.indexOf("foo"), length:"foo".length},
				{offset:completion.indexOf("bar"), length:"bar".length},
				{offset:completion.indexOf("arg3"), length:"arg3".length}
			]);
			test.equals(completions[i].escapePosition, completion.indexOf("</acronym>"));
			i++;
			
			completion = '${bar}';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, null);
			test.ok(!completions[i].escapePosition);
			i++;
			
			completion = '$bar';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, null);
			test.ok(!completions[i].escapePosition);
			i++;
			
			completion = 'jQuery(arg1)';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "jQuery()");
			test.deepEqual(completions[i].positions, [{offset: "jQuery(".length, length:"arg1".length }]);
			test.equals(completions[i].escapePosition, completion.length);
			i++;
			
			completion = 'data(arg1)';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completion);
			test.equals(completions[i].trigger, "data(obj)\tjQuery");
			test.deepEqual(completions[i].positions, [{offset: "data(".length, length:"arg1".length }]);
			test.equals(completions[i].escapePosition, completion.length);
			i++;
			
			test.done();
		}, errback(test));
};
exports.findCompletions4 = function(test) {
	var completionsProcessor = new completionsModule.CompletionsProcessor(testResourcesFolder);
	completionsProcessor.findCompletions(
		testResourcesFolder + path.sep + "test4.scripted-completions").then(
		function(res) {
			var completions = res.completions;
			test.equals(completions.length, 2);
			var i = 0;

			// var origCompletion = '<dl>\n${lineStart}${indent}<dt>${1:First definition}</dt> <dd>${2:First explanation}</dd>\n${lineStart}${indent}<dt>${3:Second definition}</dt> <dd>${4:Second explanation}</dd>\n${lineStart}</dl>';
			var completion = '<dl>\n${lineStart}${indent}<dt>First definition</dt> <dd>First explanation</dd>\n${lineStart}${indent}<dt>Second definition</dt> <dd>Second explanation</dd>\n${lineStart}</dl>';
			var completionDesc = '<dl>\n\t<dt>First definition</dt> <dd>First explanation</dd>\n\t<dt>Second definition</dt> <dd>Second explanation</dd>\n</dl>';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completionDesc);
			test.equals(completions[i].trigger, "dl");
			test.deepEqual(completions[i].positions, [
				{offset: completion.indexOf("First definition"), length:"First definition".length },
				{offset: completion.indexOf("First explanation"), length:"First explanation".length },
				{offset: completion.indexOf("Second definition"), length:"Second definition".length },
				{offset: completion.indexOf("Second explanation"), length:"Second explanation".length }
			]);
			test.ok(!completions[i].escapePosition);
			i++;

			completion = '<table>\n${lineStart}${indent}<tr>\n${lineStart}${indent}${indent}<th>Column 1 Heading</th>\n${lineStart}${indent}${indent}<th>Column 2 Heading</th>\n${lineStart}${indent}</tr>\n${lineStart}${indent}<tr>\n${lineStart}${indent}${indent}<td>R1C1</td>\n${lineStart}${indent}${indent}<td>R1C2</td>\n${lineStart}${indent}</tr>\n${lineStart}</table>';
			completionDesc = '<table>\n\t<tr>\n\t\t<th>Column 1 Heading</th>\n\t\t<th>Column 2 Heading</th>\n\t</tr>\n\t<tr>\n\t\t<td>R1C1</td>\n\t\t<td>R1C2</td>\n\t</tr>\n</table>';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completions[i].trigger + " : " + completionDesc);
			test.equals(completions[i].trigger, "table");
			test.deepEqual(completions[i].positions, [
				{offset: completion.indexOf("Column 1 Heading"), length:"Column 1 Heading".length },
				{offset: completion.indexOf("Column 2 Heading"), length:"Column 2 Heading".length },
				{offset: completion.indexOf("R1C1"), length:"R1C1".length },
				{offset: completion.indexOf("R1C2"), length:"R1C2".length }
			]);
			test.ok(!completions[i].escapePosition);
			i++;

			test.done();
		}, errback(test));
};
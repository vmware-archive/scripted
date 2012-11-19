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

//To run this test do this on the commandline:

//1) install nodeunit:
// 'cd ~'
// 'npm install nodeunit'
//2) run the tests 
// 'cd <this-directory>' 
// 'nodeunit <this-filename>'

var completionsModule = require("../completions");

var testResourcesFolder = __dirname + "/test-resources/";

exports.extractScope = function(test) {
	test.equals("html", completionsModule.extractScope("text.html - source - meta.tag, punctuation.definition.tag.begin"));
	test.equals("js", completionsModule.extractScope("source.js - source - meta.tag, punctuation.definition.tag.begin"));
	test.equals(null, completionsModule.extractScope("- source - meta.tag, punctuation.definition.tag.begin"));
	test.equals(null, completionsModule.extractScope(null));
	test.done();
};

// no test is too silly!
exports.findCompletionsFiles = function(test) {
	completionsModule._setCompletionsFolder(testResourcesFolder);
	completionsModule.findCompletionsFiles(
		function(files) {
			test.equals(files.length, 3, "Should have found 3 files");
			test.equals(files[0], "test1.scripted-completions");
			test.equals(files[1], "test2.scripted-completions");
			test.equals(files[2], "test3.scripted-completions");
			
			test.done();
		}
	);
};

exports.findCompletions = function(test) {
	var errback = function(err) {
		if (err.stack) {
			console.log(err);
			console.log(err.stack);
		}
		test.fail(err);
		test.done();
	};

	completionsModule.findCompletions(
		testResourcesFolder + "test1.scripted-completions").then(
		function(res) {
			var completions = res.completions;
			test.equals(completions.length, 5);

			var completion = '<a href="arg1"></a>';
			test.equals(completions[0].proposal, completion);
			test.equals(completions[0].description, completion);
			test.equals(completions[0].trigger, "a");
			test.deepEqual(completions[0].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}]);
			test.equals(completions[0].escapePosition, completion.indexOf("</a>"));
			
			completion = '<abbr></abbr>';
			test.equals(completions[1].proposal, completion);
			test.equals(completions[1].description, completion);
			test.equals(completions[1].trigger, "abbr");
			test.deepEqual(completions[1].positions, []);
			test.equals(completions[1].escapePosition, completion.indexOf("</abbr>"));
			
			completion = '<acronym></acronym>';
			test.equals(completions[2].proposal, completion);
			test.equals(completions[2].description, completion);
			test.equals(completions[2].trigger, "acronym");
			test.deepEqual(completions[2].positions, []);
			test.equals(completions[2].escapePosition, completion.indexOf("</acronym>"));
			
			completion = '<acronym>arg1</acronym>';
			test.equals(completions[3].proposal, completion);
			test.equals(completions[3].description, completion);
			test.equals(completions[3].trigger, "acronym");
			test.deepEqual(completions[3].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}]);
			test.equals(completions[3].escapePosition, completion.indexOf("</acronym>"));
			
			completion = '<acronym>arg1</acronym>';
			test.equals(completions[3].proposal, completion);
			test.equals(completions[3].description, completion);
			test.equals(completions[3].trigger, "acronym");
			test.deepEqual(completions[3].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}]);
			test.equals(completions[3].escapePosition, completion.indexOf("</acronym>"));
			
			completion = '<acronym>arg1arg2</acronym>';
			test.equals(completions[4].proposal, completion);
			test.equals(completions[4].description, completion);
			test.equals(completions[4].trigger, "acronym");
			test.deepEqual(completions[4].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}, {offset:completion.indexOf("arg2"), length:"arg2".length}]);
			test.equals(completions[4].escapePosition, completion.indexOf("</acronym>"));
			
		}, errback);
		
	completionsModule.findCompletions(
		testResourcesFolder + "test2.scripted-completions").then(
		function(res) {
			var completions = res.completions;
			test.equals(completions.length, 4);
			var i = 0;
			var completion = '<acronym>arg1arg2</acronym>';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}, {offset:completion.indexOf("arg2"), length:"arg2".length}]);
			test.equals(completions[i].escapePosition, completion.indexOf("arg1"));
			i++;
			
			completion = 'arg1<acronym></acronym>arg2';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [{offset:completion.indexOf("arg1"), length:"arg1".length}, {offset:completion.indexOf("arg2"), length:"arg2".length}]);
			test.equals(completions[i].escapePosition, completion.indexOf("</acronym>"));
			i++;
			
			completion = 'arg2<acronym></acronym>arg1';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [ 
				{offset:completion.indexOf("arg1"), length:"arg1".length},
				{offset:completion.indexOf("arg2"), length:"arg2".length} 
			]);
			test.equals(completions[i].escapePosition, completion.indexOf("</acronym>"));
			i++;
			
			completion = 'arg2<acronym></acronym>arg1';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [ 
				{offset:completion.indexOf("arg1"), length:"arg1".length},
				{offset:completion.indexOf("arg2"), length:"arg2".length}
			]);
			test.equals(completions[i].escapePosition, completion.length);
			i++;
			
		}, errback);
		
	completionsModule.findCompletions(
		testResourcesFolder + "test3.scripted-completions").then(
		function(res) {
			var completions = res.completions;
			// last two completions are invalid
			test.equals(completions.length, 7);
			var i = 0;
			var completion = '<acronym>foo</acronym>';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [{offset:completion.indexOf("foo"), length:"foo".length}]);
			test.ok(!completions[i].escapePosition);
			i++;
			
			completion = 'foo<acronym></acronym>';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [{offset:completion.indexOf("foo"), length:"foo".length}]);
			test.ok(!completions[i].escapePosition);
			i++;
			
			completion = '<acronym></acronym>foo';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [{offset:completion.indexOf("foo"), length:"foo".length}]);
			test.ok(!completions[i].escapePosition);
			i++;
			
			completion = '<acronym>foobar</acronym>';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, [
				{offset:completion.indexOf("foo"), length:"foo".length},
				{offset:completion.indexOf("bar"), length:"bar".length}
			]);
			test.equals(completions[i].escapePosition, completion.indexOf("</acronym>"));
			i++;
			
			completion = 'bar<acronym></acronym>fooarg3';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completion);
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
			test.equals(completions[i].description, completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, []);
			test.ok(!completions[i].escapePosition);
			i++;
			
			completion = '$bar';
			test.equals(completions[i].proposal, completion);
			test.equals(completions[i].description, completion);
			test.equals(completions[i].trigger, "acronym");
			test.deepEqual(completions[i].positions, []);
			test.ok(!completions[i].escapePosition);
			i++;
			
			test.done();
		}, errback);
};

//exports.convertCompletion
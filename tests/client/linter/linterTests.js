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
 *     Andy Clement
 ******************************************************************************/
 
// Tests for navHistory.js, navigation and history
/*jslint browser:true */
/*global $ define module localStorage window console */

define(['testutils', 'orion/assert', 'scripted/utils/navHistory', 'scripted/utils/pageState', 'scripted/utils/editorUtils', 'setup', 'jquery'], 
function(testutils, assert, mNavHistory, mPageState, editorUtils) {
	 
	var testroot = testutils.discoverTestRoot();
	
	function setup() {
		window.fsroot = testroot.slice(0,-1);
		localStorage.removeItem("scripted.recentFileHistory");
		$('.subeditor_wrapper').remove();
		var editor = createEditor(testroot + "foo.js". window.isSub);
		localStorage.removeItem("scripted.recentFileHistory");
	}
	
	function createEditor(path, kind) {
		mNavHistory.handleNavigationEvent({testTarget : path, shiftKey : (kind === 'sub') });
	}

	
	module('Linter tests');

	var tests = {};
	
	tests.asyncTestMissingSemicolon = function() {
		setup();
		setTimeout(function() {
			activateJshint();
			assert.ok(editorUtils.getMainEditor());
			mNavHistory.handleNavigationEvent({testTarget : testroot + "boo.js" });
			// TODO is handleNavigationEvent synchronous? (can't be, linter invocation is at least in an async block)
			var problems = editorUtils.getMainEditor().problems;
			assert.equal(1, problems.length);
			assert.equal("12>12: Missing semicolon.", stringifyProblem(problems[0]));
			assert.start();
		}, 500);
	};
	
	tests.asyncTestUndefinedReference = function() {
		setup();
		setTimeout(function() {
			activateJshint({ "undef": true});
			assert.ok(editorUtils.getMainEditor());
			mNavHistory.handleNavigationEvent({testTarget : testroot + "boo2.js" });
			// TODO is handleNavigationEvent synchronous? (can't be, linter invocation is at least in an async block)
			var problems = editorUtils.getMainEditor().problems;
			console.log(problems);
			assert.equal(1, problems.length);
			assert.equal("2>7: 'define' is not defined.", stringifyProblem(problems[0]));
			assert.start();
		}, 500);
	};
	
	function activateJshint(configObject) {
		if (window.scripted) {
			if (window.scripted.config) {
				if (window.scripted.config.editor) {
					window.scripted.config.editor.linter = "jshint";
				} else {
					window.scripted.config.editor = { "linter": "jshint" };
				}
			} else {
				window.scripted.config = {"editor": {"linter":"jshint"}};
			}
		}
		if (configObject) {
			window.scripted.config.jshint = configObject;
		}
	}

	
	// ---
	/**
	 * Create a string representation of a problem. Format is
	 * "{start_offset}>{end_offset}: {description}"
	 */
	function stringifyProblem(problem) {
		// example:
		//		character: 12
		//		description: "Missing semicolon."
		//		end: 12
		//		evidence: "var boo = 1"
		//		id: "(error)"
		//		line: 1
		//		raw: "Missing semicolon."
		//		reason: "Missing semicolon."
		//		scope: "(main)"
		//		severity: "error"
		//		start: 12
		if (!problem) {
			return "NO PROBLEM";
		}
		var str = problem.start+">"+problem.end+": "+problem.description;
		return str;
	}
	
	return tests;
});
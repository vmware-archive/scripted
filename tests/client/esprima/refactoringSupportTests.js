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
/*global define */

// Tests for finding references for inline rename refactoring support
define(['plugins/esprima/refactoringSupport', "orion/assert"], function(refactoringSupport, assert) {

	function findOccurrences(contents, toFind, exceptions) {
		var res = [], next = 0;
		while ((next = contents.indexOf(toFind, next)) > -1) {
			res.push({ start:next, end: next+toFind.length });
			next = next+toFind.length;
		}

		if (exceptions) {
			var newRes = [];
			for (var i = exceptions.length-1; i >= 0; i--) {
				res.splice(exceptions[i], 1);
			}
		}
		return res;
	}

	function findIndexOf(contents, toFind, selectionCount) {
		var next = 0, iter = 0;
		while ((next = contents.indexOf(toFind, next)) > -1) {
			if (iter === selectionCount) {
				return { start: next, end: next + toFind.length };
			}
			next = next + toFind.length;
			iter++;
		}
		return null;
	}

	function doTest(contents, toFind, selectionCount, exceptions) {
		var selection = findIndexOf(contents, toFind, selectionCount);
		var realResults = refactoringSupport.findVarReferences(contents, selection);
		var expectedResults = findOccurrences(contents, toFind, exceptions);
		assert.deepEqual(realResults, expectedResults);
	}

	var tests = {};

	tests['test simple']  = function() {
		doTest("xxx", "xxx", 0);
		doTest("var xxx", "xxx", 0);
		doTest("var xxx;\nxxx", "xxx", 0);
		doTest("var xxx;\nxxx", "xxx", 1);
		doTest("var xxx;\nxxx\nxxxx", "xxx", 1, [2]);
		doTest("var xxx;\nxxx\nxxxx.xxx", "xxx", 1, [2,3]);
	};

	tests['test statement kinds']  = function() {
		doTest("var xxx; if (xxx) { xxx; } else { xxx; }", "xxx", 1);
		doTest("var xxx; try { xxx; } catch(e) { xxx } finally { xxx }", "xxx", 1);
		doTest("var xxx; xxx: xxx", "xxx", 0, [1]);
		doTest("var xxx; switch (xxx) { case xxx: xxx; }", "xxx", 0);
		doTest("var xxx;\nfunction foo() { return xxx; }", "xxx", 0);
		doTest("var xxx;\nvar foo = function() { xxx; }", "xxx", 0);
		doTest("for (var xxx; xxx; xxx) { xxx; }", "xxx", 0);
		doTest("for (var xxx in xxx) { xxx; }", "xxx", 0);
		doTest("var xxx; while (xxx) { xxx; }", "xxx", 0);
		doTest("var xxx; throw xxx;", "xxx", 0);
		doTest("var xxx; do { xxx; } while (xxx); ", "xxx", 0);
	};
	tests['test expression kinds']  = function() {
		doTest("var xxx; [xxx,xxx];", "xxx", 1);
		doTest("var xxx; xxx[xxx];", "xxx", 1);
		doTest("var xxx; ['xxx','xxx'];", "xxx", 0, [1,2]);
		doTest("var xxx; xxx = xxx;", "xxx", 1);
		doTest("var xxx; xxx.xxx;", "xxx", 1, [2]);
		doTest("var xxx; xxx(xxx,xxx);", "xxx", 1);
		doTest("var xxx; xxx++; xxx--; xxx+= xxx;", "xxx", 1);
		doTest("var yyy, xxx; xxx++; xxx--; xxx+= xxx;", "xxx", 1);
	};

	tests['test function arguments'] = function() {
		doTest('function f(xxx) { xxx; }', "xxx", 1);
		doTest('function f(yyy,xxx) { xxx; }', "xxx", 1);
		doTest('function f(yyy,xxx) { xxx; function f2(xxx) { xxx; } xxx; } xxx;', "xxx", 1, [2,3,5]);
		doTest('var xxx; function f(yyy,xxx) { xxx; } xxx;', "xxx", 0, [1,2]);
		doTest('function f(yyy,xxx) { xxx; } var xxx;', "xxx", 2, [0,1]);
		doTest('var xxx; function f(xxx) { var xxx; xxx; } xxx;', "xxx", 2, [0,1,4]);
	};

	return tests;
});
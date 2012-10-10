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
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

// tests for javascript navigation, both in-file and out
/*global define esprima console setTimeout esprimaContentAssistant*/
define(["plugins/esprima/esprimaJsContentAssist", "orion/assert"], function(mEsprimaPlugin, assert) {
	
	//////////////////////////////////////////////////////////
	// helpers
	//////////////////////////////////////////////////////////
	
	function MockIndexer(amdDeps) {
		function createSummary(buffer, name) {
			var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider();
			return esprimaContentAssistant.computeSummary(buffer, name);
		}
		
		this.retrieveGlobalSummaries = function() { };
	
		this.retrieveSummary = function(name) {
			return amdDeps ? createSummary(amdDeps[name], name) : null;
		};
	}
	
	function computeDefinition(buffer, toFind, indexer) {
		var offset = buffer.lastIndexOf(toFind)+1;
		if (!indexer) {
			indexer = new MockIndexer({});
		}
		
		var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider(indexer);
		return esprimaContentAssistant.findDefinition(buffer, offset);
	}
		
	function assertDefinition(expected, actual) {
		if (!actual) {
			assert.fail("No definition found for:\n" + expected.hover );
		}
		assert.equal(actual.typeName, expected.typeName, "Invalid type name in definition");
		assert.equal(actual.path, expected.path, "Invalid path in definition");
		if (!expected.range) {
			assert.ok(!actual.range, "Should not have found a range object: " + actual.range);
		} else {
			assert.equal(actual.range[0], expected.range[0], "Invalid range start in definition");
			assert.equal(actual.range[1], expected.range[1], "Invalid range end in definition");
		}
		assert.equal(actual.hover, expected.hover, "Invalid hover in definition");
	}
	
	function createExpected(buffer, toFind, typeName, hover, path, findIndex) {
		if (!hover) {
			hover = toFind + " :: " + typeName;
		}
		var expected = {};
		
		if (findIndex >= 0) {
			expected.range = [];
			
			expected.range[0] = -1;
			for (var i = 0; i < findIndex; i++) {
				expected.range[0] = buffer.indexOf(toFind, expected.range[0]+1);
			}
			expected.range[1] = expected.range[0] + toFind.length;
		} else {
			expected.range = null;
		}
		expected.typeName = typeName;
		expected.hover = hover;
		expected.path = path;
		expected.buffer = buffer;
		return expected;
	}
	
	function doSameFileTest(buffer, toFind, typeName, hover, findIndex) {
		if (!findIndex) { findIndex = 1; }
		var findText;
		if (typeof findIndex === "string") {
			findText = findIndex;
			findIndex = -1;
		}
		var expected = createExpected(buffer, toFind, typeName, hover, null, findIndex);
		if (findText) {
			expected.range = [];
			expected.range[0] = buffer.indexOf(findText);
			expected.range[1] = expected.range[0] + findText.length;
		}
		var actual = computeDefinition(buffer, toFind);
		assertDefinition(expected, actual);
	}
	function doMultiFileTest(otherFile, otherBuffer, buffer, toFind, typeName, hover, findIndex, targetInSameFile) {
		var targetFile = otherFile;
		if (targetInSameFile) {
			targetFile = null;
		}
		if (!findIndex) { 
			findIndex = 1; 
		}
		var expected = createExpected(targetInSameFile ? buffer : otherBuffer, toFind, typeName, hover, targetFile, findIndex);
		var buffers = { };
		buffers[otherFile] = otherBuffer;
		var actual = computeDefinition(buffer, toFind, new MockIndexer(buffers));
		assertDefinition(expected, actual);
	}


	var tests = {};

	//////////////////////////////////////////////////////////
	// tests in same file
	//////////////////////////////////////////////////////////
	tests.testVar1 = function() {
		doSameFileTest("var aaa = 9\naaa", 'aaa', 'Number');
	};
	tests.testVar2 = function() {
		doSameFileTest("var aaa = function(a,b,c) { return 9; }\naaa", 'aaa', "?Number:a,b,c", 'aaa :: (a,b,c) -> Number');
	};
	tests.testVar3 = function() {
		doSameFileTest("var aaa = function(a,b,c) { return function(a) { return 9; }; }\naaa", 
			'aaa', "??Number:a:a,b,c", 'aaa :: (a,b,c) -> (a) -> Number');
	};
	tests.testParam1 = function() {
		doSameFileTest("var bbb = function(a,b,d) { d }", 
			'd', "gen~local~3", 'd :: {  }');
	};
	tests.testParam2 = function() {
		doSameFileTest("var d = 9;var bbb = function(a,b,d) { d }", 
			'd', "gen~local~3", 'd :: {  }', 2);
	};
	tests.testParam3 = function() {
		doSameFileTest("var d = 9;var bbb = function(a,b,d) {  }\nd", 
			'd', "Number", 'd :: Number', 1);
	};
	tests.testObjLiteral1 = function() {
		doSameFileTest("var d = { c: 9, b: ''}\nd.c", 
			'c', "Number", 'c :: Number', 1);
	};
	tests.testObjLiteral2 = function() {
		doSameFileTest("var d = { a: 9, b: ''}\nd.b", 
			'b', "String", 'b :: String', 1);
	};
	
	tests.testPrototype1 = function() {
		doSameFileTest("var Foo = function() {};\nFoo.prototype = { z: 9, b: ''}\nvar d = new Foo();\nd.z", 
			'z', "Number", 'z :: Number', 1);
	};
	
	tests.testPrototype2 = function() {
		doSameFileTest("var Foo = function() {};\nFoo.prototype = { a: 9, b: ''}\nvar d = new Foo();\nd.b", 
			'b', "String", 'b :: String', 1);
	};
	
	
	//////////////////////////////////////////////////////////
	// tests for 'this' expressions
	//////////////////////////////////////////////////////////
	tests.testThis1 = function() {
		doSameFileTest("var Foo = function() { this };", 
			'this', "Foo", 'this :: Foo', "function() { this }");
	};
	
	tests.testThis2 = function() {
		doSameFileTest("this", 
			'this', "Global", 'this :: Global', -1);
	};
	
	tests.testThis3 = function() {
		doSameFileTest("/*jslint browser:true */this", 
			'this', "Window", 'this :: Window', -1);
	};
	
	tests.testThis4 = function() {
		doSameFileTest("var Foo = function() {};\nFoo.prototype = { a : this }", 
			'this', "Global", 'this :: Global', -1);
	};
	
	//////////////////////////////////////////////////////////
	// dotted constructor names
	//////////////////////////////////////////////////////////
	tests.testDottedConstructor1 = function() {
		doSameFileTest("function outer() { var Inner = function() { this.xxx=9; }; return Inner; }\n" +
			"new (outer())().xxx", 
			'xxx', "Number", 'xxx :: Number', 1);
	};
	
	// not dotted since not part of the outer object
	tests.testDottedConstructor2 = function() {
		doSameFileTest("function outer() { var Inner = function() { this.xxx=9; }; return Inner; }\n" +
			"var xxx = new (outer())();\nxxx", 
			'xxx', "Inner", 'xxx :: Inner', 1);
	};
	
	// should be dotted, but is not in Chrome Dev Tools, this kind of constructor is Fun.Inner,
	// but we show it as just Inner
	tests.testDottedConstructor2 = function() {
		doSameFileTest("function Fun() { var Inner = function() { this.xxx=9; }; return Inner; }\n" +
			"var xxx = new (new Fun())();\nxxx", 
			'xxx', "Inner", 'xxx :: Inner', 1);
	};
	
	// again, should be dotted but is not
	tests.testDottedConstructor2 = function() {
		doSameFileTest("function Fun() { this.Inner = function() { }}" +
			"var f = new Fun()" +
			"var yyy = new f.Inner()" +
			"yyy", 
			'yyy', "Inner", 'yyy :: Inner', 1);
	};
	
	
	//////////////////////////////////////////////////////////
	// tests in other file
	//////////////////////////////////////////////////////////
	tests.testAMD1 = function() {
		doMultiFileTest( "file1", "define({ val1 : 9 });",
			"define(['file1'], function(f1) { f1.val1; });", 
			'val1', "Number", 'val1 :: Number');
	};
	tests.testAMD2 = function() {
		doMultiFileTest( "file1", "define({ val1 : function() { return 9; } });",
			"define(['file1'], function(f1) { f1.val1; });", 
			'val1', "?Number:", 'val1 :: () -> Number');
	};
	
	//////////////////////////////////////////////////////////
	// multi-file dotted constructor names
	//////////////////////////////////////////////////////////
	tests.testMultiFileDottedCosntructorAMD1 = function() {
		doMultiFileTest( "file1", "define({ obj : { Fun : function() { } }});",
			"define(['file1'], function(f1) { var xxx = new f1.obj.Fun(); xxx});", 
			'xxx', "obj.Fun", 'xxx :: obj.Fun', 1, true);
	};
	tests.testMultiFileDottedCosntructorAMD2 = function() {
		doMultiFileTest( "file1", "define([], function() {\n" +
			"var obj = { Fun : function() { } };\n" +
			"return obj.Fun});",
			"define(['file1'], function(f1) { var xxx = new f1(); xxx});", 
			'xxx', "obj.Fun", 'xxx :: obj.Fun', 1, true);
	};
	
	tests.testMultiFileDottedCosntructorAMD3 = function() {
		doMultiFileTest( "file1", "define([], function() {\n" +
			"var obj = { Fun : function() { } };\n" +
			"obj.Fun.prototype.flart = 0;\n" +
			"return obj.Fun });",
			"define(['file1'], function(f1) { var xxx = new f1(); xxx.flart});", 
			'flart', "Number", 'flart :: Number');
	};
	
	//////////////////////////////////////////////////////////
	// LHS of assingments and variable declarators
	//////////////////////////////////////////////////////////
	tests.testVariableDeclaratorLHS1 = function() {
		doSameFileTest(
			"var hhh = 0;", 
			'hhh', "Number", 'hhh :: Number', 1);
	};
	
	tests.testVariableDeclaratorLHS2 = function() {
		doSameFileTest(
			"var hhh = '';\n" +
			"function foo() { var hhh = 0; }", 
			'hhh', "Number", 'hhh :: Number', 2);
	};
	
	tests.testAssignmentLHS1 = function() {
		doSameFileTest(
			"var hhh = '';\n" +
			"hhh = 0;", 
			'hhh', "Number", 'hhh :: Number', 1);
	};
	
	tests.testAssignmentLHS3 = function() {
		doSameFileTest(
			"var hhh = '';\n" +
			"function foo(hhh) { hhh = 9; }\n" +
			"hhh;", 
			'hhh', "String", 'hhh :: String', 1);
	};
	
	tests.testAssignmentLHS4 = function() {
		doSameFileTest(
			"var obj = { hhh : '' };\n" +
			"obj.hhh = 0;", 
			'hhh', "Number", 'hhh :: Number', 1);
	};
	
	tests.testAssignmentLHS5 = function() {
		doSameFileTest(
			"var obj = { obj2 : { hhh : '' } };\n" +
			"obj.obj2.hhh = 0;", 
			'hhh', "Number", 'hhh :: Number', 1);
	};
	
	
	return tests;
});

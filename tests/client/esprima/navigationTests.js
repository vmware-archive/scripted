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
/*global define esprima console setTimeout esprimaContentAssistant doctrine*/
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
			assert.fail("No definition found for:\n" + expected.hoverText );
		}
		assert.equal(doctrine.stringify(actual.typeObj), expected.typeSig, "Invalid type name in definition");
		assert.equal(actual.path, expected.path, "Invalid path in definition");
		if (!expected.range) {
			assert.ok(!actual.range, "Should not have found a range object: " + actual.range);
		} else {
			assert.equal(actual.range[0], expected.range[0], "Invalid range start in definition");
			assert.equal(actual.range[1], expected.range[1], "Invalid range end in definition");
		}
		if (!expected.docRange) {
			assert.ok(!actual.docRange, "Should not have found a doc range object: " + actual.range);
		} else {
			assert.equal(actual.docRange[0], expected.docRange[0], "Invalid doc range start in definition");
			assert.equal(actual.docRange[1], expected.docRange[1], "Invalid doc range end in definition");
		}

		assert.equal(actual.hoverText, expected.hoverText, "Invalid hover in definition");
	}

	function createExpected(buffer, toFind, typeName, hover, path, findIndex, docRange) {
		if (!hover) {
			hover = toFind + " : " + typeName;
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
		expected.typeSig = typeName;
		expected.hoverText = hover;
		expected.path = path;
		expected.buffer = buffer;
		expected.docRange = docRange;
		return expected;
	}

	function doSameFileTest(buffer, toFind, typeName, hover, findIndex, docRange) {
		if (!findIndex) { findIndex = 1; }
		var findText;
		if (typeof findIndex === "string") {
			findText = findIndex;
			findIndex = -1;
		}
		var expected = createExpected(buffer, toFind, typeName, hover, null, findIndex, docRange);
		if (findText) {
			expected.range = [];
			expected.range[0] = buffer.indexOf(findText);
			expected.range[1] = expected.range[0] + findText.length;
		}
		var actual = computeDefinition(buffer, toFind);
		assertDefinition(expected, actual);
	}
	function doMultiFileTest(otherFile, otherBuffer, buffer, toFind, typeName, hover, findIndex, targetInSameFile, docRange) {
		var targetFile = otherFile;
		if (targetInSameFile) {
			targetFile = null;
		}
		if (!findIndex) {
			findIndex = 1;
		}
		var expected = createExpected(targetInSameFile ? buffer : otherBuffer, toFind, typeName, hover, targetFile, findIndex, docRange);
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
		doSameFileTest("var aaa = function(a,b,c) { return 9; }\naaa", 'aaa',
		"function(a:gen~103145323~0,b:gen~103145323~1,c:gen~103145323~2):Number", 'aaa : function(a,b,c):Number');

	};
	tests.testVar3 = function() {
		doSameFileTest("var aaa = function(a,b,c) { return function(a) { return 9; }; }\naaa",
			'aaa', "function(a:gen~103145323~0,b:gen~103145323~1,c:gen~103145323~2):function(a:gen~103145323~5):Number",
			'aaa : function(a,b,c):function(a):Number');
	};
	tests.testParam1 = function() {
		doSameFileTest("var bbb = function(a,b,d) { d }",
			'd', "gen~103145323~2", 'd : {}');
	};
	tests.testParam2 = function() {
		doSameFileTest("var d = 9;var bbb = function(a,b,d) { d }",
			'd', "gen~103145323~2", 'd : {}', 2);
	};
	tests.testParam3 = function() {
		doSameFileTest("var d = 9;var bbb = function(a,b,d) {}\nd",
			'd', "Number", 'd : Number', 1);
	};
	tests.testObjLiteral1 = function() {
		doSameFileTest("var d = { c: 9, b: ''}\nd.c",
			'c', "Number", 'c : Number', 1);
	};
	tests.testObjLiteral2 = function() {
		doSameFileTest("var d = { a: 9, b: ''}\nd.b",
			'b', "String", 'b : String', 1);
	};

	tests.testPrototype1 = function() {
		doSameFileTest("var Foo = function() {};\nFoo.prototype = { z: 9, b: ''}\nvar d = new Foo();\nd.z",
			'z', "Number", 'z : Number', 1);
	};

	tests.testPrototype2 = function() {
		doSameFileTest("var Foo = function() {};\nFoo.prototype = { a: 9, b: ''}\nvar d = new Foo();\nd.b",
			'b', "String", 'b : String', 1);
	};


	//////////////////////////////////////////////////////////
	// tests for 'this' expressions
	//////////////////////////////////////////////////////////
	tests.testThis1 = function() {
		doSameFileTest("var Foo = function() { this };",
			'this', "Foo", 'this : Foo', "function() { this }");
	};

	tests.testThis2 = function() {
		doSameFileTest("this",
			'this', "Global", 'this : Global', -1);
	};

	tests.testThis3 = function() {
		doSameFileTest("/*jslint browser:true */this",
			'this', "Window", 'this : Window', -1);
	};

	tests.testThis4 = function() {
		doSameFileTest("var Foo = function() {};\nFoo.prototype = { a : this }",
			'this', "gen~103145323~4", 'this : {a:{a:{...}}}', '{ a : this }');
	};

	//////////////////////////////////////////////////////////
	// dotted constructor names
	//////////////////////////////////////////////////////////
	tests.testDottedConstructor1 = function() {
		doSameFileTest("function outer() { var Inner = function() { this.xxx=9; }; return Inner; }\n" +
			"new (outer())().xxx",
			'xxx', "Number", 'xxx : Number', 1);
	};

	// not dotted since not part of the outer object
	tests.testDottedConstructor2 = function() {
		doSameFileTest("function outer() { var Inner = function() { this.xxx=9; }; return Inner; }\n" +
			"var xxx = new (outer())();\nxxx",
			'xxx', "Inner", 'xxx : Inner', 1);
	};

	// should be dotted, but is not in Chrome Dev Tools, this kind of constructor is Fun.Inner,
	// but we show it as just Inner
	tests.testDottedConstructor2 = function() {
		doSameFileTest("function Fun() { var Inner = function() { this.xxx=9; }; return Inner; }\n" +
			"var xxx = new (new Fun())();\nxxx",
			'xxx', "Inner", 'xxx : Inner', 1);
	};

	// again, should be dotted but is not
	tests.testDottedConstructor2 = function() {
		doSameFileTest("function Fun() { this.Inner = function() { }}" +
			"var f = new Fun()" +
			"var yyy = new f.Inner()" +
			"yyy",
			'yyy', "Inner", 'yyy : Inner', 1);
	};


	//////////////////////////////////////////////////////////
	// tests in other file
	//////////////////////////////////////////////////////////
	tests.testAMD1 = function() {
		doMultiFileTest( "file1", "define({ val1 : 9 });",
			"define(['file1'], function(f1) { f1.val1; });",
			'val1', "Number", 'val1 : Number');
	};
	tests.testAMD2 = function() {
		doMultiFileTest( "file1", "define({ val1 : function() { return 9; } });",
			"define(['file1'], function(f1) { f1.val1; });",
			'val1', "function():Number", 'val1 : function():Number');
	};

	//////////////////////////////////////////////////////////
	// multi-file dotted constructor names
	//////////////////////////////////////////////////////////
	tests.testMultiFileDottedCosntructorAMD1 = function() {
		doMultiFileTest( "file1", "define({ obj : { Fun : function() { } }});",
			"define(['file1'], function(f1) { var xxx = new f1.obj.Fun(); xxx});",
			'xxx', "obj.Fun", 'xxx : obj.Fun', 1, true);
	};
	tests.testMultiFileDottedCosntructorAMD2 = function() {
		doMultiFileTest( "file1", "define([], function() {\n" +
			"var obj = { Fun : function() { } };\n" +
			"return obj.Fun});",
			"define(['file1'], function(f1) { var xxx = new f1(); xxx});",
			'xxx', "obj.Fun", 'xxx : obj.Fun', 1, true);
	};

	tests.testMultiFileDottedCosntructorAMD3 = function() {
		doMultiFileTest( "file1", "define([], function() {\n" +
			"var obj = { Fun : function() { } };\n" +
			"obj.Fun.prototype.flart = 0;\n" +
			"return obj.Fun });",
			"define(['file1'], function(f1) { var xxx = new f1(); xxx.flart});",
			'flart', "Number", 'flart : Number');
	};

	// https://github.com/scripted-editor/scripted/issues/96
	tests.testMultiFileConstructorExport = function() {
		doMultiFileTest( "car", "define(function() {\n" +
			"    function Car(model) {\n" +
			"        this.model = model;\n" +
			"    }\n" +
			"    Car.prototype = {\n" +
			"        show: function() {\n" +
			"            console.log(this.model);\n" +
			"		}\n" +
			"    };\n" +
			"    return Car;\n" +
			"});",
			"define(['car'], function(Car) { var c = new Car('ford'); c.show(); });",
			'show', "function():undefined", 'show : function()');
	};

	//////////////////////////////////////////////////////////
	// LHS of assingments and variable declarators
	//////////////////////////////////////////////////////////
	tests.testVariableDeclaratorLHS1 = function() {
		doSameFileTest(
			"var hhh = 0;",
			'hhh', "Number", 'hhh : Number', 1);
	};

	tests.testVariableDeclaratorLHS2 = function() {
		doSameFileTest(
			"var hhh = '';\n" +
			"function foo() { var hhh = 0; }",
			'hhh', "Number", 'hhh : Number', 2);
	};

	tests.testAssignmentLHS1 = function() {
		doSameFileTest(
			"var hhh = '';\n" +
			"hhh = 0;",
			'hhh', "Number", 'hhh : Number', 1);
	};

	tests.testAssignmentLHS3 = function() {
		doSameFileTest(
			"var hhh = '';\n" +
			"function foo(hhh) { hhh = 9; }\n" +
			"hhh;",
			'hhh', "String", 'hhh : String', 1);
	};

	tests.testAssignmentLHS4 = function() {
		doSameFileTest(
			"var obj = { hhh : '' };\n" +
			"obj.hhh = 0;",
			'hhh', "Number", 'hhh : Number', 1);
	};

	tests.testAssignmentLHS5 = function() {
		doSameFileTest(
			"var obj = { obj2 : { hhh : '' } };\n" +
			"obj.obj2.hhh = 0;",
			'hhh', "Number", 'hhh : Number', 1);
	};

	tests.testInsideArrayAccess1 = function() {
		doSameFileTest("var x = 0;\n" +
			"var foo = [];\n" +
			"foo[x]", "x", "Number", "x : Number", 1);
	};

	tests.testInsideArrayAccess1 = function() {
		doSameFileTest("var x = 0;\n" +
			"var foo = [];\n" +
			"foo[x]", "x", "Number", "x : Number", 1);
	};

	//////////////////////////////////////////////////////////
	// full file inferencing
	//////////////////////////////////////////////////////////
	tests.testFullFile1 = function() {
		doSameFileTest("x;\n" +
			"var x = 9;", "x", "Number", "x : Number", 2);
	};
	// not doing this one correctly can't find contents of 'y'
	tests.testFullFile2 = function() {
		doSameFileTest("var x = y;\n" +
			"x;\n" +
			"var y = { fff : 0 };", "x", "gen~103145323~0", "x : {}", 1);
	};

	// arrrrgh need to fix this one so that the test chooses the first fff, not the last
//	tests.testFullFile4 = function() {
//		doSameFileTest("function a()  { var x = y;\n" +
//			"x.fff; }\n" +
//			"var y = { fff : 0 };", "fff", "Number", "fff : Number", 1);
//	};
	tests.testFullFile5 = function() {
		doSameFileTest("function a()  { var x = y.fff;\n" +
			"x; }\n" +
			"var y = { fff : 0 };", "x", "Number", "x : Number", 1);
	};

	tests.testFullFile6 = function() {
		doSameFileTest("function v() {\n" +
			"	function aa() {	}\n" +
			"	function a() {\n" +
			"		aa();\n" +
			"	}\n" +
			"}", "aa", "function():undefined", "aa : function()", 1);
	};

	tests.testFullFile7 = function() {
		doSameFileTest("function v() {\n" +
			"	function a() {\n" +
			"		aa();\n" +
			"	}\n" +
			"	function aa() {	}\n" +
			"}", "aa", "function():undefined", "aa : function()", 2);
	};

	tests.testFullFile8 = function() {
		doSameFileTest(
			"var aa = 9;\n" +
			"function v() {\n" +
			"	function aa() {	}\n" +
			"}\n" +
			"function a() {\n" +
			"	aa();\n" +
			"}", "aa", "Number", "aa : Number", 1);
	};

	// SCRIPTED-69
	tests.testObjLiteralLHS = function() {
		doSameFileTest(
			"var other = function() { }\n;" +
			"var obj2 = {\n" +
			"	other : 1\n" +
			"};", "other", "Number", "other : Number", 2);
	};

	tests.testArray1 = function() {
		doSameFileTest(
			"var other = []\n;" +
			"other", "other", "Array", "other : Array", 1);
	};
	tests.testArray2 = function() {
		doSameFileTest(
			"var other = [1]\n;" +
			"other", "other", "[Number]", "other : [Number]", 1);
	};
	tests.testArray3 = function() {
		doSameFileTest(
			"var other = [[1]]\n;" +
			"other", "other", "[[Number]]", "other : [[Number]]", 1);
	};
	tests.testArray4 = function() {
		doSameFileTest(
			"var first = [[1]]\n;" +
			"var other = first[0]", "other", "[Number]", "other : [Number]", 1);
	};
	tests.testArray5 = function() {
		doSameFileTest(
			"var first = [[1]]\n;" +
			"var other = first[0][0]", "other", "Number", "other : Number", 1);
	};
	tests.testArray6 = function() {
		doSameFileTest(
			"var first = [];\n" +
			"first[0] = 1;\n" +
			"var other = first[0]", "other", "Number", "other : Number", 1);
	};
	tests.testArray7 = function() {
		doSameFileTest(
			"var first = [];\n" +
			"first[0] = [1];\n" +
			"var other = first[0][0]", "other", "Number", "other : Number", 1);
	};

	tests.testArray8 = function() {
		doSameFileTest(
			"var first = ['Andrew', 'Eisenberg'];\n" +
			"first", "first", "[String]", "first : [String]", 1);
	};


	// jsdoc testing
	tests.testJSDoc0 = function() {
		var contents =
			"/**\n" +
			" */\n" +
			"var x;";
		doSameFileTest(
			contents, "x", "gen~103145323~0", "x : {}", 1,
			[contents.indexOf("/**"), contents.indexOf("*/")+2]);
	};
	tests.testJSDoc0a = function() {
		var contents =
			"/***/\n" +
			"var x;";
		doSameFileTest(
			contents, "x", "gen~103145323~0", "x : {}", 1,
			[contents.indexOf("/**"), contents.indexOf("*/")+2]);
	};
	tests.testJSDoc0b = function() {
		var contents =
			"/***/\n" +
			"// TODO this is strannnnnnnnge.\n" +
			"var x;";
		doSameFileTest(
			contents, "x", "gen~103145323~0", "x : {}", 1,
			[contents.indexOf("/**"), contents.indexOf("*/")+2]);
	};

	tests.testJSDoc0c = function() {
		var otherContents =
			"/***/\n" +
			"exports.x = function() {};";
		doMultiFileTest(
			"a", otherContents, "require('a').x", "x",
			"function():undefined", "x : function()", 2, false,
			[otherContents.indexOf("/**"), otherContents.indexOf("*/")+2]);
	};

	tests.testJSDoc0d = function() {
		var otherContents =
			"/** @type String */\n" +
			"exports.x = function() {};";
		doMultiFileTest(
			"a", otherContents, "require('a').x", "x",
			"String", "x : String", 2, false,
			[otherContents.indexOf("/**"), otherContents.indexOf("*/")+2]);
	};

	tests.testJSDoc1 = function() {
		var contents = "/**\n" +
			" * @param {String} path \n" +
			" * @return String\n" +
			" */\n" +
			"function parseFile(path) { }\n" +
			"var x;";
		doSameFileTest(
			contents, "parseFile", "function(path:String):String", "parseFile : function(path:String):String", 1,
			[contents.indexOf("/**"), contents.indexOf("*/")+2]);
	};

	tests.testJSDoc2 = function() {
		var contents = "/**\n" +
			" * @param {{foo:Number,bar:string}} path \n" +
			" * @return String\n" +
			" */\n" +
			"function parseFile(path) { path.sumpin = ''; }\n" +
			"var x;";
		doSameFileTest(
			contents, "parseFile", "function(path:gen~103145323~1):String", "parseFile : function(path:{foo:Number,bar:String,sumpin:String}):String", 1,
			[contents.indexOf("/**"), contents.indexOf("*/")+2]);
	};

	tests.testJSDoc3 = function() {
		var contents = "/**\n" +
			" * @param {{foo:Number,bar:string}} path \n" +
			" */\n" +
			"function ParseFile(path) { path.sumpin = ''; }\n" +
			"var x;";
		doSameFileTest(
			contents, "ParseFile", "function(path:gen~103145323~2,new:ParseFile):ParseFile", "ParseFile : function(path:{foo:Number,bar:String,sumpin:String},new:ParseFile):ParseFile", 1,
			[contents.indexOf("/**"), contents.indexOf("*/")+2]);
	};

	tests.testJSDoc4 = function() {
		var contents = "/**\n" +
			" * @param {{foo:Number,bar:function(a,b):String}} path \n" +
			" */\n" +
			"function parseFile(path) { path.sumpin = ''; }\n" +
			"var x;";
		doSameFileTest(
			contents, "parseFile", "function(path:gen~103145323~1):undefined", "parseFile : function(path:{foo:Number,bar:function(Object,Object):String,sumpin:String})", 1,
			[contents.indexOf("/**"), contents.indexOf("*/")+2]);
	};

	tests.testJSDocParamArgs1 = function() {
		var contents = "/** @param {function(text:String, path:String, configuration:function(foo:String):Object):String?} transformFun */\n" +
		"function addSaveTransform(transformFun) {	}";
		doSameFileTest(
		contents,
		"addSaveTransform",
		"function(transformFun:function(text:String,path:String,configuration:function(foo:String):Object):?String):undefined",
		"addSaveTransform : function(transformFun:function(text:String,path:String,configuration:function(foo:String):Object):?String)", 1,
		[contents.indexOf("/**"), contents.indexOf("*/")+2]);
	};

	tests.testFullFileJSDoc1 = function() {
		var contents =
			"var a = function() {\n" +
		    "    return {\n" +
		    "        /**\n" +
		    "         * Returns editor's content\n" +
		    "         * @return {String}\n" +
		    "         */\n" +
		    "        getContent: function() {}" +
		    "    };\n" +
			"};\n" +
			"function a() {}";
		doSameFileTest(
			contents, "getContent",
			"function():String","getContent : function():String", 0,
			[contents.indexOf("/**"), contents.indexOf("*/")+2]);
	};

	tests.testFullFileJSDoc2 = function() {
		var contents =
			"var a = function() {\n" +
		    "    return {\n" +
		    "        before: function() {}," +
		    "        /**\n" +
		    "         * Returns editor's content\n" +
		    "         * @return {String}\n" +
		    "         */\n" +
		    "        getContent: function() {}" +
		    "    };\n" +
			"};\n" +
			"function a() {}";
		doSameFileTest(
			contents, "getContent",
			"function():String","getContent : function():String", 0,
			[contents.indexOf("/**"), contents.indexOf("*/")+2]);
	};

	tests.testFullFileJSDoc3 = function() {
		var contents =
			"var a = function() {\n" +
		    "    return {\n" +
		    "        /**\n" +
		    "         * nuthin\n" +
		    "         */\n" +
		    "        before: function() {}," +
		    "        /**\n" +
		    "         * Returns editor's content\n" +
		    "         * @return {String}\n" +
		    "         */\n" +
		    "        getContent: function() {}," +
		    "        /**\n" +
		    "         * nuthin\n" +
		    "         */\n" +
		    "        after: function() {}" +
		    "    };\n" +
			"};\n" +
		    "/**\n" +
		    " * nuthin\n" +
		    " */\n" +
			"function a() {}";
		doSameFileTest(
			contents, "getContent",
			"function():String","getContent : function():String", 0,
			[contents.indexOf("/**", contents.indexOf("before")), contents.indexOf("*/", contents.indexOf("before"))+2]);
	};
	tests.testFullFileJSDoc4 = function() {
		var contents =
			"var a = function() {\n" +
		    "    return {\n" +
		    "        /**\n" +
		    "         * nuthin\n" +
		    "         */\n" +
		    "        before: function() {}," +
		    "        /**\n" +
		    "         * Returns editor's content\n" +
		    "         * @return {String}\n" +
		    "         */\n" +
		    "        getContent: function() {}" +
		    "    };\n" +
			"};\n" +
		    "/**\n" +
		    " * nuthin\n" +
		    " */\n" +
			"function a() {}";
		doSameFileTest(
			contents, "getContent",
			"function():String","getContent : function():String", 0,
			[contents.indexOf("/**", contents.indexOf("before")), contents.indexOf("*/", contents.indexOf("before"))+2]);
	};
	return tests;
});

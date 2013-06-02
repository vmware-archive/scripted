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

// tests for javascript content assist where dependencies are provided
/*global define esprima console setTimeout esprimaContentAssistant*/
define(["plugins/esprima/esprimaJsContentAssist", "orion/assert"], function(mEsprimaPlugin, assert) {

	//////////////////////////////////////////////////////////
	// helpers
	//////////////////////////////////////////////////////////

	function MockIndexer(globalDeps, amdDeps) {
		function createSummary(buffer, name) {
			var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider();
			return esprimaContentAssistant.computeSummary(buffer, name);
		}

		var processedGlobalDeps = [];
		for (var name in globalDeps) {
			if (globalDeps.hasOwnProperty(name)) {
				processedGlobalDeps.push(createSummary(globalDeps[name], name));
			}
		}

		this.retrieveGlobalSummaries = function() {
			return processedGlobalDeps;
		};

		this.retrieveSummary = function(name) {
			return amdDeps ? createSummary(amdDeps[name], name) : null;
		};
	}

	function computeContentAssist(buffer, prefix, indexer) {
		var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider(indexer);
		if (!prefix) {
			prefix = "";
		}
		var offset = buffer.indexOf("/**/");
		if (offset < 0) {
			offset = buffer.length;
		}
		return esprimaContentAssistant.computeProposals(buffer, offset, {prefix : prefix, inferredOnly : true});
	}

	function testProposal(proposal, text, description) {
		assert.equal(proposal.proposal, text, "Invalid proposal text");
		if (description) {
			assert.equal(proposal.description, description, "Invalid proposal description");
		}
	}

	function stringifyExpected(expectedProposals) {
		var text = "";
		for (var i = 0; i < expectedProposals.length; i++)  {
			text += expectedProposals[i][0] + " : " + expectedProposals[i][1] + "\n";
		}
		return text;
	}

	function stringifyActual(actualProposals) {
		var text = "";
		for (var i = 0; i < actualProposals.length; i++) {
			text += actualProposals[i].proposal + " : " + actualProposals[i].description + "\n";
		}
		return text;
	}

	function testProposals(actualProposals, expectedProposals) {

		assert.equal(actualProposals.length, expectedProposals.length,
			"Wrong number of proposals.  Expected:\n" + stringifyExpected(expectedProposals) +"\nActual:\n" + stringifyActual(actualProposals));

		for (var i = 0; i < actualProposals.length; i++) {
			testProposal(actualProposals[i], expectedProposals[i][0], expectedProposals[i][1]);
		}
	}

	//////////////////////////////////////////////////////////
	// tests
	//////////////////////////////////////////////////////////

	var tests = {};

	//////////////////////////////////////////////////////////
	// tests of global dependencies
	//////////////////////////////////////////////////////////
	tests.testGlobal1 = function() {
		var results = computeContentAssist(
			"aa", "aa", new MockIndexer(
			{
				first: "var aaa = 9"
			}));
		testProposals(results, [
			["aaa", "aaa : Number"]
		]);
	};
	tests.testGlobal2 = function() {
		var results = computeContentAssist(
			"aa", "aa", new MockIndexer(
			{
				first: "var aaa = 9",
				second: "var aab = 9"
			}));
		testProposals(results, [
			["aaa", "aaa : Number"],
			["aab", "aab : Number"]
		]);
	};
	tests.testGlobal3 = function() {
		var results = computeContentAssist(
			"var aac=9;\naa", "aa", new MockIndexer(
			{
				first: "var aaa = 9",
				second: "var aab = 9"
			}));
		testProposals(results, [
			["aaa", "aaa : Number"],
			["aab", "aab : Number"],
			["aac", "aac : Number"]
		]);
	};
	tests.testGlobal4 = function() {
		// a dependency defines a variable of the same name.
		// local variable should take precedence
		var results = computeContentAssist(
			"var aaa='';\naa", "aa", new MockIndexer(
			{
				first: "var aaa = 9",
				second: "var aab = 9"
			}));
		testProposals(results, [
			["aaa", "aaa : String"],
			["aab", "aab : Number"]
		]);
	};
	tests.testGlobal5 = function() {
		var results = computeContentAssist(
			"aaa.bbb.aa", "aa", new MockIndexer(
			{
				first: "var aaa = { bbb : { aaa : ''} }",
				second: "var aab = 9"
			}));
		testProposals(results, [
			["aaa", "aaa : String"]
		]);
	};
	tests.testGlobal6 = function() {
		var results = computeContentAssist(
			"aaa.bbb.aa", "aa", new MockIndexer(
			{
				first: "var aaa = { bbb : { aaa : function(a,b,c) { return 9; } } }",
				second: "var aab = 9"
			}));
		testProposals(results, [
			["aaa(a, b, c)", "aaa(a, b, c) : Number"]
		]);
	};
	tests.testGlobal7 = function() {
		var results = computeContentAssist(
			"new AAA().ff", "ff", new MockIndexer(
			{
				first: "var AAA = function(a,b,c) { this.ff1 = 9; }\n" +
						"AAA.prototype.ff2 = 3;"
			}));
		testProposals(results, [
			["ff1", "ff1 : Number"],
			["", "---------------------------------"],
			["ff2", "ff2 : Number"]
		]);
	};

	//////////////////////////////////////////////////////////
	// tests of amd dependencies
	//////////////////////////////////////////////////////////
	tests.testAMD1 = function() {
		var results = computeContentAssist(
			"define(['first'], function(aaa) { aa/**/ });", "aa", new MockIndexer(
			[], {
				first: "define('first', [], function() { return 9; });"
			}));
		testProposals(results, [
			["aaa", "aaa : Number"]
		]);
	};
	tests.testAMD2 = function() {
		var results = computeContentAssist(
			"define(['first'], function(f) { f.aa/**/ });", "aa", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { aaa : 9 } });"
			}));
		testProposals(results, [
			["aaa", "aaa : Number"]
		]);
	};
	tests.testAMD3 = function() {
		var results = computeContentAssist(
			"define(['first'], function(f) { f.aaa.toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { aaa : 9 } });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testAMD4 = function() {
		var results = computeContentAssist(
			"define(['first', 'second'], function(fa, fb) { f/**/ });", "f", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { aaa : 9 } });",
				second: "define('second', [], function() { return { aaa : 9 } });"
			}));
		testProposals(results, [
			["fa", "fa : {aaa:Number}"],
			["fb", "fb : {aaa:Number}"],
			["", "---------------------------------"],
			["Function()", "Function() : Function"]
		]);
	};

	// returns an anonymous function
	tests.testAMD5a = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { f/**/ });", "f", new MockIndexer(
			[], {
				first: "define('first', [], function() { return function(a,b) { return 9; } });"
			}));
		testProposals(results, [
			["ff(a, b)", "ff(a, b) : Number"],
			["", "---------------------------------"],
			["Function()", "Function() : Function"]
		]);
	};
	tests.testAMD5b = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { ff().toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return function(a,b) { return 9; } });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};


	// returns a named function
	tests.testAMD6a = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { ff.fun/**/ });", "fun", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { fun : function(a,b) { return 9; } } });"
			}));
		testProposals(results, [
			["fun(a, b)", "fun(a, b) : Number"]
		]);
	};
	tests.testAMD6b = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { ff.fun().toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { fun : function(a,b) { return 9; } } });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	// returns a named constructor
	tests.testAMD7a = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { new ff.Fun().f/**/ });", "f", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });"
			}));
		testProposals(results, [
			["ff", "ff : Number"]
		]);
	};
	tests.testAMD7b = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { new ff.Fun().ff.toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};


	//////////////////////////////////////////////////////////
	// tests for name-value pair (NVP) style modules
	//////////////////////////////////////////////////////////
	tests.testNVP1 = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { ff.fun.toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define({ fun : 8 });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testNVP2 = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { ff.fun().toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define({ fun : function() { return 8; }});"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testNVP3 = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { new ff.Fun().ff.toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define({ Fun : function() { this.ff = 8; }});"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	//////////////////////////////////////////////////////////
	// tests for async require function
	// note that async require calls are typically either in
	// an html file or surrounded by a define
	//////////////////////////////////////////////////////////
	tests.testAMDRequire1Simple = function() {
		var results = computeContentAssist(
			"require(['first'], function(ff) { new ff.Fun().ff.toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests.testAMDRequire2NestedInDefine = function() {
		var results = computeContentAssist(
			"define(['second'], function(ss) { require(['first'], function(ff) { new ff.Fun().ff.toF/**/ }); });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });",
				second: "define('second', [], function() { return { Fun2 : function(a,b) { this.ff = 9; } } });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests.testAMDRequire3NestedInRequire = function() {
		var results = computeContentAssist(
			"require(['second'], function(ss) { require(['first'], function(ff) { new ff.Fun().ff.toF/**/ }); });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });",
				second: "define('second', [], function() { return { Fun2 : function(a,b) { this.ff = 9; } } });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests.testAMDRequire4NestedInDefineWithShadowing = function() {
		var results = computeContentAssist(
			"define(['second'], function(ff) { require(['first'], function(ff) { new ff.Fun().ff.toF/**/ }); });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });",
				second: "define('second', [], function() { return { Fun2 : function(a,b) { this.ff = ''; } } });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests.testAMDRequire5NestedInRequire = function() {
		var results = computeContentAssist(
			"require(['second'], function(ff) { require(['first'], function(ff) { new ff.Fun().ff.toF/**/ }); });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });",
				second: "define('second', [], function() { return { Fun2 : function(a,b) { this.ff = ''; } } });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	//////////////////////////////////////////////////////////
	// AMD with prototype manipulation
	//////////////////////////////////////////////////////////
	tests.testAMDproto1 = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { new ff.Fun().ff/**/ });", "ff", new MockIndexer(
			[], {
				first: "define('first', [], function() { function Fun(a,b) { this.ff1 = 9; };\n Fun.prototype.ff2 = '';\n return { Fun : Fun } });"
			}));
		testProposals(results, [
			["ff1", "ff1 : Number"],
			["", "---------------------------------"],
			["ff2", "ff2 : String"]
		]);
	};
	tests.testAMDproto2 = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { new ff.Fun().ff/**/ });", "ff", new MockIndexer(
			[], {
				first: "define('first', [], function() { function Fun(a,b) { this.ff1 = 9; };\n Fun.prototype.ff2 = function(a,b) { return '' };;\n return { Fun : Fun } });"
			}));
		testProposals(results, [
			["ff1", "ff1 : Number"],
			["", "---------------------------------"],
			["ff2(a, b)", "ff2(a, b) : String"]
		]);
	};
	tests.testAMDproto3 = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { new ff.Fun().ff/**/ });", "ff", new MockIndexer(
			[], {
				first: "define('first', [], function() { function Fun(a,b) { this.ff1 = 9; };\n Fun.prototype = { ff2 : function(a,b) { return '' }, ff3 : '' };\n return { Fun : Fun } });"
			}));
		testProposals(results, [
			["ff1", "ff1 : Number"],
			["", "---------------------------------"],
			["ff2(a, b)", "ff2(a, b) : String"],
			["ff3", "ff3 : String"]
		]);
	};
	tests.testAMDproto4 = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { new ff().ff/**/ });", "ff", new MockIndexer(
			[], {
				first: "define('first', [], function() { function Fun(a,b) { this.ff1 = 9; };\n Fun.prototype.ff2 = '';\n return Fun });"
			}));
		testProposals(results, [
			["ff1", "ff1 : Number"],
			["", "---------------------------------"],
			["ff2", "ff2 : String"]
		]);
	};


	//////////////////////////////////////////////////////////
	// Commonjs
	//////////////////////////////////////////////////////////
	tests.testCommonJS1 = function() {
		var results = computeContentAssist(
			"require('first').toF", "toF", new MockIndexer(
			[], {
				first: "exports = 9;"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testCommonJS2 = function() {
		var results = computeContentAssist(
			"var foo = require('first');\n" +
			"foo.toF", "toF", new MockIndexer(
			[], {
				first: "exports = 9;"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testCommonJS3 = function() {
		var results = computeContentAssist(
			"var foo = require('first');\n" +
			"foo.first.toF", "toF", new MockIndexer(
			[], {
				first: "exports = { first : 9 };"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testCommonJS4 = function() {
		var results = computeContentAssist(
			"var foo = require('first');\n" +
			"foo.first.toF", "toF", new MockIndexer(
			[], {
				first: "var first = 9;\nexports = { first : first };"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testCommonJS5 = function() {
		var results = computeContentAssist(
			"var foo = require('first');\n" +
			"foo.first().toF", "toF", new MockIndexer(
			[], {
				first: "var first = function() { return 9; }\n" +
				       "exports = { first : first };"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testCommonJS6 = function() {
		var results = computeContentAssist(
			"var Foo = require('first').First;\n" +
			"new Foo().x.toF", "toF", new MockIndexer(
			[], {
				first: "var First = function() { this.x = 9 }\n" +
				       "exports = { First : First };"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	// I don't know if this one is valid syntax since jslint flags this with an error,
	// but we'll keep this test since esprima parses it properly and the result is correct
	tests.testCommonJS7 = function() {
		var results = computeContentAssist(
			"var foo = new (require('first').First)();\n" +
			"foo.x.toF", "toF", new MockIndexer(
			[], {
				first: "var First = function() { this.x = 9 }\n" +
				       "exports = { First : First };"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests.testCommonJS8 = function() {
		var results = computeContentAssist(
			"var foo = require('first');\n" +
			"new foo.First().x.toF", "toF", new MockIndexer(
			[], {
				first: "var First = function() { this.x = 9 }\n" +
				       "exports = { First : First };"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testCommonJS9 = function() {
		var results = computeContentAssist(
			"var foo = require('first').First;\n" +
			"new foo().x.toF", "toF", new MockIndexer(
			[], {
				first: "var First = function() { this.x = 9 }\n" +
				       "exports = { First : First };"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests.testCommonJS10 = function() {
		var results = computeContentAssist(
			"var a = require('first').a;\n" +
			"new a.First().x.toF", "toF", new MockIndexer(
			[], {
				first: "var Foo = function() { this.x = 9 }\n" +
				       "exports = { a : { First : Foo  } };"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests.testCommonJS11 = function() {
		var results = computeContentAssist(
			"var a = require('first').a;\n" +
			"a.b.c.num.toF", "toF", new MockIndexer(
			[], {
				first:  "var c = { num : 8 };\n" +
						"var b = { c : c }\n" +
				        "exports = { a : { b : b } };"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};


	//////////////////////////////////////////////////////////
	// tests for prototype manipulation in commonjs modules
	//////////////////////////////////////////////////////////
	tests.testCommonJSproto0 = function() {
		var results = computeContentAssist(
			"var a = require('first');\n" +
			"(new a.F()).ff", "ff", new MockIndexer(
			[], {
				first:  "var F = function() { this.ff1 = 9};\n" +
						"F.prototype.ff2 = 2;\n" +
				        "exports = { F : F };"
			}));
		testProposals(results, [
			["ff1", "ff1 : Number"],
			["", "---------------------------------"],
			["ff2", "ff2 : Number"]
		]);
	};
	tests.testCommonJSproto1 = function() {
		var results = computeContentAssist(
			"var a = require('first');\n" +
			"(new a.F()).ff", "ff", new MockIndexer(
			[], {
				first:  "var F = function() { this.ff1 = 9};\n" +
						"F.prototype = { ff2: 7, ff3 : { a : 1, b: 2 } };\n" +
				        "exports = { F : F };"
			}));
		testProposals(results, [
			["ff1", "ff1 : Number"],
			["", "---------------------------------"],
			["ff2", "ff2 : Number"],
			["ff3", "ff3 : {a:Number,b:Number}"]
		]);
	};
	tests.testCommonJSproto2 = function() {
		var results = computeContentAssist(
			"var a = require('first');\n" +
			"(new a()).ff", "ff", new MockIndexer(
			[], {
				first:  "var F = function() { this.ff1 = 9};\n" +
						"F.prototype = { ff2: 7, ff3 : { a : 1, b: 2 } };\n" +
				        "exports = F ;"
			}));
		testProposals(results, [
			["ff1", "ff1 : Number"],
			["", "---------------------------------"],
			["ff2", "ff2 : Number"],
			["ff3", "ff3 : {a:Number,b:Number}"]
		]);
	};
	tests.testCommonJSproto3 = function() {
		var results = computeContentAssist(
			"var a = require('first');\n" +
			"(new a()).ff", "ff", new MockIndexer(
			[], {
				first:  "var F = function() { this.ff1 = 9};\n" +
						"F.prototype.ff2 = 2;\n" +
				        "exports = F;"
			}));
		testProposals(results, [
			["ff1", "ff1 : Number"],
			["", "---------------------------------"],
			["ff2", "ff2 : Number"]
		]);
	};
	tests.testCommonJSproto4 = function() {
		var results = computeContentAssist(
			"var a = require('first');\n" +
			"a.ff", "ff", new MockIndexer(
			[], {
				first:  "var F = function() { this.ff1 = 9};\n" +
						"F.prototype.ff2 = 2;\n" +
				        "exports = new F();"
			}));
		testProposals(results, [
			["ff1", "ff1 : Number"],
			["", "---------------------------------"],
			["ff2", "ff2 : Number"]
		]);
	};


	//////////////////////////////////////////////////////////
	// tests for sync require function in AMD
	//////////////////////////////////////////////////////////
	tests.testAMDSyncRequire1 = function() {
		var results = computeContentAssist(
			"define(['first'], function() {\n"+
			"  var a = require('first').a;\n" +
			"  a.b.c.num.toF/**/\n" +
			"});", "toF", new MockIndexer(
			[], {
				first:  "define([], function() {\n" +
						"  var c = { num : 8 };\n" +
						"  var b = { c : c }\n" +
				        "  return { a : { b : b } };\n" +
				        "});"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testAMDSyncRequire2 = function() {
		var results = computeContentAssist(
			"define(['first'], function() {\n"+
			"  var a = require('first');\n" +
			"  a().toF/**/\n" +
			"});", "toF", new MockIndexer(
			[], {
				first:  "define([], function() {\n" +
				        "  return function() { return 9; };\n" +
				        "});"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testAMDSyncRequire3 = function() {
		var results = computeContentAssist(
			"define(['first'], function() {\n"+
			"  require('first')().toF/**/\n" +
			"});", "toF", new MockIndexer(
			[], {
				first:  "define([], function() {\n" +
				        "  return function() { return 9; };\n" +
				        "});"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	//////////////////////////////////////////////////////////
	// tests for wrapped commonjs modules
	//////////////////////////////////////////////////////////
	tests.testCommonjsWrapped1 = function() {
		var results = computeContentAssist(
			"define(function(require, exports, module) {\n"+
			"  require('first').a.flart().toF/**/\n" +
			"});", "toF", new MockIndexer(
			[], {
				first:  "define(function(require, exports, module) {\n" +
						"  exports.a = { flart: function(a,b) { return 1; } }\n" +
						"});"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testCommonjsWrapped2 = function() {
		var results = computeContentAssist(
			"  require('first').a.flart().toF/**/", "toF", new MockIndexer(
			[], {
				first:  "define(function(require, exports, module) {\n" +
						"  exports.a = { flart: function(a,b) { return 1; } }\n" +
						"});"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testCommonjsWrapped3 = function() {
		var results = computeContentAssist(
			"define(function(require, exports, module) {\n"+
			"  require('first').a.flart().toF/**/\n" +
			"});", "toF", new MockIndexer(
			[], {
				first:  "  exports.a = { flart: function(a,b) { return 1; } }\n"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	//////////////////////////////////////////////////////////
	// tests for closure modules
	// These tests are limited because closure doesn't really
	// provide a module system, only a dependency resolver. So
	// everything is essentially treated as namespaced globals.
	//////////////////////////////////////////////////////////
	tests.testClosure1 = function() {
		var results = computeContentAssist(
			"goog.require('foo.Bar')\n"+
			"new foo.Bar()./**/\n" +
			"});", "b", new MockIndexer({
				'foo.Bar':  "goog.provide('foo.Bar')\n" +
							"foo.Bar = function() {};\n" +
							"foo.Bar.prototype.baz = function() {};\n"
			}));
		testProposals(results, [
			["baz()", "baz() : undefined"]
		]);
	};

	//////////////////////////////////////////////////////////
	// Browser awareness
	//////////////////////////////////////////////////////////
	tests.testBrowser1 = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			"define(['first'], function(mFirst) {\n"+
			"  mFirst.loc.p/**/});", "p", new MockIndexer(
			[], {
				first:  "/*jslint browser:true*/\n" +
						"define({ loc : location });"
			}));
		testProposals(results, [
			["pathname", "pathname : String"],
			["port", "port : String"],
			["protocol", "protocol : String"],
			["", "---------------------------------"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["prototype", "prototype : Object"]
		]);
	};
	tests.testBrowser2 = function() {
		var results = computeContentAssist(
			"define(['first'], function(mFirst) {\n"+
			"  mFirst.loc.p/**/});", "p", new MockIndexer(
			[], {
				first:  "/*jslint browser:true*/\n" +
						"define({ loc : location });"
			}));
		testProposals(results, [
			["pathname", "pathname : String"],
			["port", "port : String"],
			["protocol", "protocol : String"],
			["", "---------------------------------"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["prototype", "prototype : Object"]
		]);
	};
	tests.testBrowser3 = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			"define(['first'], function(mFirst) {\n"+
			"  mFirst.loc.p/**/});", "p", new MockIndexer(
			[], {
				first:  "define({ loc : location });"
			}));
		testProposals(results, [
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["prototype", "prototype : Object"]
		]);
	};

	tests.testArray1 = function() {
		var results = computeContentAssist(
			"define(['first'], function(mFirst) {\n"+
			"  mFirst[0].toFi/**/});", "toFi", new MockIndexer(
			[], {
				first:  "define([], function() { return [1]; });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests.testArray2 = function() {
		var results = computeContentAssist(
			"define(['first'], function(mFirst) {\n"+
			"  mFirst.a[0].toFi/**/});", "toFi", new MockIndexer(
			[], {
				first:  "define([], function() { return {a : [1]}; });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testArray3 = function() {
		var results = computeContentAssist(
			"define(['first'], function(mFirst) {\n"+
			"  mFirst[0].a.toFi/**/});", "toFi", new MockIndexer(
			[], {
				first:  "define([], function() { return [{a: 1}]; });"
			}));
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests.testArray4 = function() {
		var results = computeContentAssist(
			"define(['first'], function(mFirst) {\n"+
			"  mFirst.concat/**/});", "concat", new MockIndexer(
			[], {
				first:  "define([], function() { return [{a: 1}]; });"
			}));
		testProposals(results, [
			["concat(first, ...rest)", "concat(first, ...rest) : Array"]
		]);
	};
	return tests;
});

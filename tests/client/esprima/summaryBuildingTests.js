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

/*global define esprima console setTimeout esprimaContentAssistant*/
define(["plugins/esprima/esprimaJsContentAssist", "orion/assert"], function(mEsprimaPlugin, assert) {
	//////////////////////////////////////////////////////////
	// helpers
	//////////////////////////////////////////////////////////
	var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider();

	function filterSummary(summary) {
		if (summary && summary.typeSig) {
			summary = summary.typeSig;
		} else if (typeof summary === "object") {
			for (var prop in summary) {
				if (summary.hasOwnProperty(prop)) {
					summary[prop] = filterSummary(summary[prop]);
				}
			}
		}
		return summary;
	}

	function computeSummary(fileName, buffer) {
		return esprimaContentAssistant.computeSummary(buffer, fileName);
	}

	function assertSameSummary(expectedSummaryText, actualSummary) {
		var filteredSummary =filterSummary(actualSummary);
		assert.equal(JSON.stringify(filteredSummary), expectedSummaryText);
	}

	function assertCreateSummary(expectedSummaryText, buffer, fileName) {
		assertSameSummary(expectedSummaryText, computeSummary(fileName, buffer));
	}


	//////////////////////////////////////////////////////////
	// tests
	//////////////////////////////////////////////////////////
	var tests = {};

	//////////////////////////////////////////////////////////
	// global dependencies
	//////////////////////////////////////////////////////////
	tests.testEmptyGlobalStructure = function() {
		assertCreateSummary('{"provided":{},"types":{},"kind":"global"}', "", "a");
	};

	tests.testOneVarGlobalStructure1 = function() {
		assertCreateSummary('{"provided":{"x":"gen~a~0"},"types":{"gen~a~0":{"$$proto":"Object"}},"kind":"global"}',
			"var x;", "a");
	};

	tests.testOneVarGlobalStructure2 = function() {
		assertCreateSummary('{"provided":{"x":"Number"},"types":{},"kind":"global"}',
			"var x=0;", "a");
	};

	tests.testOneVarGlobalStructure3 = function() {
		assertCreateSummary('{"provided":{"x":"String"},"types":{},"kind":"global"}',
			"var x='';", "a");
	};

	tests.testOneVarGlobalStructure4 = function() {
		assertCreateSummary('{"provided":{"x":"gen~a~1"},"types":{"gen~a~1":{"$$proto":"Object"}},"kind":"global"}',
			"var x={};", "a");
	};

	tests.testOneVarGlobalStructure5 = function() {
		assertCreateSummary('{"provided":{"x":"gen~a~1"},"types":{"gen~a~1":{"$$proto":"Object","f":"Number","g":"String"}},"kind":"global"}',
			"var x={f:9, g:''};", "a");
	};

	tests.testOneVarGlobalStructure6 = function() {
		assertCreateSummary('{"provided":{"x":"function():undefined"},"types":{},"kind":"global"}',
			"var x=function() {};", "a");
	};

	tests.testOneVarGlobalStructure7 = function() {
		assertCreateSummary('{"provided":{"x":"function(a:gen~a~0,b:gen~a~1):undefined"},"types":{"gen~a~0":{"$$proto":"Object"},"gen~a~1":{"$$proto":"Object"}},"kind":"global"}',
			"var x=function(a,b) {};", "a");
	};

	tests.testOneVarGlobalStructure8 = function() {
		assertCreateSummary('{"provided":{"x":"function(a:gen~a~0,b:gen~a~1):Number"},"types":{"gen~a~0":{"$$proto":"Object"},"gen~a~1":{"$$proto":"Object"}},"kind":"global"}',
			"var x=function(a,b) {return 7; };", "a");
	};

	tests.testOneVarGlobalStructure9 = function() {
		assertCreateSummary('{"provided":{"x":"function(a:gen~a~0,b:gen~a~1):Number"},"types":{"gen~a~0":{"$$proto":"Object"},"gen~a~1":{"$$proto":"Object"}},"kind":"global"}',
			"function x(a,b) {return 7; }", "a");
	};

	//////////////////////////////////////////////////////////
	// AMD dependencies name value pairs (NVP)
	// See http://requirejs.org/docs/api.html#defsimple
	//////////////////////////////////////////////////////////
	tests.testNVP1 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number","b":"String"},"types":{},"kind":"AMD"}',
			"define({a : 1, b: ''});", "a");
	};

	tests.testNVP2 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number","b":"function():Number"},"types":{},"kind":"AMD"}',
			"define({a : 1, b: function() { return 8; }});", "a");
	};

	tests.testNVP3 = function() {
		assertCreateSummary('{\"provided\":{\"$$proto\":\"Object\",\"a\":\"Number\",\"b\":\"function():function():Fun\"},\"types\":{\"Fun\":{\"$$proto\":\"Fun~proto\",\"ff\":\"Number\"},\"Fun~proto\":{\"$$proto\":\"Object\"}},\"kind\":\"AMD\"}',
			"define({a : 1, b: function() { function Fun(a) { this.ff = 8; }; return function() { return new Fun(); }}});", "a");
	};

	tests.testNVP4 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number","b":"function():function(a:gen~a~6,new:Fun):Fun"},"types":{"Fun":{"$$proto":"Fun~proto","ff":"Number"},"gen~a~6":{"$$proto":"Object"},"Fun~proto":{"$$proto":"Object"}},"kind":"AMD"}',
			"define({a : 1, b: function() { function Fun(a) { this.ff = 8; }; return Fun; }});", "a");
	};
	tests.testNVP5 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number","b":"function():Fun"},"types":{"Fun":{"$$proto":"Fun~proto","ff":"Number"},"Fun~proto":{"$$proto":"Object"}},"kind":"AMD"}',
			"define({a : 1, b: function() { function Fun(a) { this.ff = 8; }; return new Fun(); }});", "a");
	};

	//////////////////////////////////////////////////////////
	// AMD dependencies
	//////////////////////////////////////////////////////////
	tests.testAMD1 = function() {
		assertCreateSummary('{"provided":"undefined","types":{},"kind":"AMD"}',
			"define('afg', [], function() { });", "a");
	};
	tests.testAMD2 = function() {
		assertCreateSummary('{"provided":"Number","types":{},"kind":"AMD"}',
			"define('afg', [], function() { return 8; });", "a");
	};
	tests.testAMD3 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object"},"types":{},"kind":"AMD"}',
			"define('afg', [], function() { return { }; });", "a");
	};
	tests.testAMD4 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"String"},"types":{},"kind":"AMD"}',
			"define('afg', [], function() { return { first: 'a' }; });", "a");
	};
	tests.testAMD5 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"Number"},"types":{},"kind":"AMD"}',
			"define('afg', [], function() { var a = 9;\n return { first: a }; });", "a");
	};
	tests.testAMD6 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"function():String"},"types":{},"kind":"AMD"}',
			"define('afg', [], function() { var a = function() { return ''; };\n return { first: a }; });", "a");
	};
	tests.testAMD7 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"function():String","second":"Number"},"types":{},"kind":"AMD"}',
			"define('afg', [], function() { var a = function() { return ''; };\n return { first: a, second: 8 }; });", "a");
	};
	tests.testAMD8 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","Exported":"function(new:Exported):Exported","second":"Number"},"types":{"Exported":{"$$proto":"Exported~proto","a":"Number"},"Exported~proto":{"$$proto":"Object"}},"kind":"AMD"}',
			"define('afg', [], function() { var Exported = function() { this.a = 9; };\n return { Exported: Exported, second: 8 }; });", "a");
	};
	tests.testAMD9 = function() {
		assertCreateSummary('{"provided":"function(a:gen~a~4,b:gen~a~5,new:Exported):Exported","types":{"Exported":{"$$proto":"Exported~proto","a":"Number"},"gen~a~4":{"$$proto":"Object"},"gen~a~5":{"$$proto":"Object"},"Exported~proto":{"$$proto":"Object"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n return Exported; });", "a");
	};
	tests.testAMD10 = function() {
		assertCreateSummary('{"provided":"function(c:gen~a~9,d:gen~a~10):function(a:gen~a~4,b:gen~a~5,new:Exported):Exported","types":{"Exported":{"$$proto":"Exported~proto","a":"Number"},"gen~a~4":{"$$proto":"Object"},"gen~a~5":{"$$proto":"Object"},"Exported~proto":{"$$proto":"Object"},"gen~a~9":{"$$proto":"Object"},"gen~a~10":{"$$proto":"Object"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n return function(c,d) { return Exported; }; });", "a");
	};
	tests.testAMD11 = function() {
		assertCreateSummary('{"provided":"function(c:gen~a~9,d:gen~a~10):Exported","types":{"Exported":{"$$proto":"Exported~proto","a":"Number"},"Exported~proto":{"$$proto":"Object"},"gen~a~9":{"$$proto":"Object"},"gen~a~10":{"$$proto":"Object"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n return function(c,d) { return new Exported(c,d); }; });", "a");
	};
	tests.testAMD12 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Exported~proto","a":"Number"},"types":{"Exported~proto":{"$$proto":"Object"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n return new Exported(); });", "a");
	};


	//////////////////////////////////////////////////////////
	// AMD futzing with prototypes of exported constructors
	//////////////////////////////////////////////////////////
	tests.testAMDProto1 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Exported~proto","a":"Number"},"types":{"Exported~proto":{"$$proto":"Object","foo":"Number"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n Exported.prototype.foo = 9;\nreturn new Exported(); });", "a");
	};
	tests.testAMDProto2 = function() {
		assertCreateSummary('{"provided":{"$$proto":"gen~a~10","a":"Number"},"types":{"gen~a~10":{"$$proto":"Object","foo":"Number","bar":"String"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n Exported.prototype = { foo : 9, bar : '' };\nreturn new Exported(); });", "a");
	};
	tests.testAMDProto3 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Exported~proto","a":"Number"},"types":{"Exported~proto":{"$$proto":"Object","open":"function():Number"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n Exported.prototype.open = function() { return 9; };\nreturn new Exported(); });", "a");
	};
	tests.testAMDProto4 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Exported~proto","a":"Number"},"types":{"Exported~proto":{"$$proto":"Object","open":"function():Number"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n var func = function() { return 9; };\n Exported.prototype.open = func;\nreturn new Exported(); });", "a");
	};
	tests.testAMDProto5 = function() {
		assertCreateSummary('{"provided":"function(a:gen~a~4,b:gen~a~5,new:Exported):Exported","types":{"Exported":{"$$proto":"Exported~proto","a":"Number"},"gen~a~4":{"$$proto":"Object"},"gen~a~5":{"$$proto":"Object"},"Exported~proto":{"$$proto":"Object","open":"function():Number"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n var func = function() { return 9; };\n Exported.prototype.open = func;\nreturn Exported; });", "a");
	};

	// https://github.com/scripted-editor/scripted/issues/96
	tests["test constructor export with changed prototype"] = function() {
		assertCreateSummary('{"provided":"function(model:gen~a~4,new:Car):Car","types":{"Car":{"$$proto":"gen~a~9","model":"gen~a~4"},"gen~a~4":{"$$proto":"Object"},"gen~a~9":{"$$proto":"Object","show":"function():undefined","model":"gen~a~14"},"gen~a~14":{"$$proto":"Object"}},"kind":"AMD"}',
			"define(function() {\n" +
			"    function Car(model) {\n" +
			"        this.model = model;\n" +
			"    }\n" +
			"    Car.prototype = {\n" +
			"        show: function() {\n" +
			"            console.log(this.model);\n" +
			"	    }\n" +
			"    };\n" +
			"    return Car;\n" +
			"});", "a");
	};


	//////////////////////////////////////////////////////////
	// common js modules are modules that have an exports variable in the global scope
	//////////////////////////////////////////////////////////
	tests.testCommonJS1 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","foo":"Number"},"types":{},"kind":"commonjs"}',
			"/*global exports*/\nexports.foo = 9", "a");
	};

	tests.testCommonJS2 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","foo":"Number"},"types":{},"kind":"commonjs"}',
			"exports.foo = 9", "a");
	};

	tests.testCommonJS3 = function() {
		assertCreateSummary('{"provided":"Number","types":{},"kind":"commonjs"}',
			"exports = 9", "a");
	};
	tests.testCommonJS4 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object"},"types":{},"kind":"commonjs"}',
			"exports = { }", "a");
	};
	tests.testCommonJS5 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"gen~a~4"},"types":{"gen~a~4":{"$$proto":"Object","a":"gen~a~6"},"gen~a~6":{"$$proto":"Object","a":"gen~a~8"},"gen~a~8":{"$$proto":"Object"}},"kind":"commonjs"}',
			"exports = { a : { a : { a : { } } } }", "a");
	};
	tests.testCommonJS6 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"gen~a~3"},"types":{"gen~a~3":{"$$proto":"Object","a":"gen~a~5"},"gen~a~5":{"$$proto":"Object","a":"gen~a~7"},"gen~a~7":{"$$proto":"Object"}},"kind":"commonjs"}',
			"var a = { a : { a : { a : { } } } }\n exports = a;", "a");
	};

	// not sure if this is right...an explicitly declared exports variable is the
	// same as an implicit one
	tests.testCommonJS7 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"gen~a~3"},"types":{"gen~a~3":{"$$proto":"Object","a":"gen~a~5"},"gen~a~5":{"$$proto":"Object","a":"gen~a~7"},"gen~a~7":{"$$proto":"Object"}},"kind":"commonjs"}',
			"var a = { a : { a : { a : { } } } }\n var exports = a;", "a");
	};


	tests.testWrappedCommonJS1 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"gen~a~7"},"types":{"gen~a~7":{"$$proto":"Object","a":"gen~a~9"},"gen~a~9":{"$$proto":"Object","a":"gen~a~11"},"gen~a~11":{"$$proto":"Object","a":"gen~a~13"},"gen~a~13":{"$$proto":"Object"}}}',
			"define(function(require, exports, module) {\n" +
			"  var a = { a : { a : { a : { } } } };\n" +
			"  exports.a = a; });", "a");
	};
	tests.testWrappedCommonJS2 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number"},"types":{}}',
			"define(function(require, exports, module) {\n" +
			"  exports.a = 7; });", "a");
	};
	tests.testWrappedCommonJS3 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"gen~a~8"},"types":{"gen~a~8":{"$$proto":"Object","flart":"function(a:gen~a~9,b:gen~a~10):String"},"gen~a~9":{"$$proto":"Object"},"gen~a~10":{"$$proto":"Object"}}}',
			"define(function(require, exports, module) {\n" +
			"  exports.a = { flart: function(a,b) { return ''; } }\n" +
			"});", "a");
	};

	//////////////////////////////////////////////////////////
	// Common JS futzing with prototypes of exported constructors
	//////////////////////////////////////////////////////////
	tests.testCommonjsProto1 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","Exported":"Exported"},"types":{"Exported":{"$$proto":"Exported~proto","a":"Number"},"Exported~proto":{"$$proto":"Object","foo":"Number"}},"kind":"commonjs"}',
			"var Exported = function(a,b) { this.a = 9; };\n Exported.prototype.foo = 9; exports.Exported = new Exported();", "a");
	};
	tests.testCommonjsProto2 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","Exported":"Exported"},"types":{"Exported":{"$$proto":"gen~a~7","a":"Number"},"gen~a~7":{"$$proto":"Object","foo":"Number","bar":"String"}},"kind":"commonjs"}',
			"var Exported = function(a,b) { this.a = 9; };\n Exported.prototype = { foo : 9, bar : '' };\nexports.Exported = new Exported();", "a");
	};
	tests.testCommonjsProto3 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","Exported":"Exported"},"types":{"Exported":{"$$proto":"Exported~proto","a":"Number"},"Exported~proto":{"$$proto":"Object","open":"function():Number"}},"kind":"commonjs"}',
			"var Exported = function(a,b) { this.a = 9; };\n Exported.prototype.open = function() { return 9; };\nexports.Exported = new Exported();", "a");
	};
	tests.testCommonjsProto4 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Exported~proto","a":"Number"},"types":{"Exported~proto":{"$$proto":"Object","open":"function():Number"}},"kind":"commonjs"}',
			"var Exported = function(a,b) { this.a = 9; };\n var func = function() { return 9; };\n Exported.prototype.open = func;\nexports = new Exported(); });", "a");
	};
	tests.testCommonjsProto5 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","Exported":"function(a:gen~a~1,b:gen~a~2,new:Exported):Exported"},"types":{"Exported":{"$$proto":"Exported~proto","a":"Number"},"gen~a~1":{"$$proto":"Object"},"gen~a~2":{"$$proto":"Object"},"Exported~proto":{"$$proto":"Object","open":"function():Number"}},"kind":"commonjs"}',
			"var Exported = function(a,b) { this.a = 9; };\n var func = function() { return 9; };\n Exported.prototype.open = func;\nexports.Exported = Exported; });", "a");
	};
	tests.testCommonjsProto6 = function() {
		assertCreateSummary('{"provided":"function(a:gen~a~1,b:gen~a~2,new:Exported):Exported","types":{"Exported":{"$$proto":"Exported~proto","a":"Number"},"gen~a~1":{"$$proto":"Object"},"gen~a~2":{"$$proto":"Object"},"Exported~proto":{"$$proto":"Object","open":"function():Number"}},"kind":"commonjs"}',
			"var Exported = function(a,b) { this.a = 9; };\n var func = function() { return 9; };\n Exported.prototype.open = func;\nexports = Exported; });", "a");
	};

	//////////////////////////////////////////////////////////
	// Browser awareness
	//////////////////////////////////////////////////////////
	tests["test browser1"] = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","loc":"Location"},"types":{},"kind":"AMD"}',
			"/*jslint browser:true*/\n" +
			"define({ loc : location });", "a");
	};

	tests["test browser2"] = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","loc":"gen~a~3"},"types":{"gen~a~3":{"$$proto":"Object"}},"kind":"AMD"}',
			"/*jslint browser:false*/\n" +
			"define({ loc : location });", "a");
	};

	tests["test browser3"] = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","foo":"gen~a~6"},"types":{"gen~a~6":{"$$proto":"Object","loc":"Location","scr":"Screen"}},"kind":"AMD"}',
			"/*jslint browser:true*/\n" +
			"define([], function () { return { foo : { loc : location, scr : screen } }; });", "a");
	};

	//////////////////////////////////////////////////////////
	// Dotted constructors
	//////////////////////////////////////////////////////////
	tests["test dotted constructor1"] = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","obj":"gen~a~6"},"types":{"gen~a~6":{"$$proto":"Object","Fun":"function(new:obj.Fun):obj.Fun"},"obj.Fun":{"$$proto":"obj.Fun~proto"},"obj.Fun~proto":{"$$proto":"Object"}},"kind":"AMD"}',
			"define([], function () { return { obj : { Fun: function() { } } }; });", "a");
	};

	tests["test dotted constructor2"] = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","obj":"gen~a~4"},"types":{"gen~a~4":{"$$proto":"Object","Fun":"function(new:obj.Fun):obj.Fun"},"obj.Fun":{"$$proto":"obj.Fun~proto"},"obj.Fun~proto":{"$$proto":"Object","larf":"Number"}},"kind":"AMD"}',
			"define([], function () {\n" +
			"  var obj = { Fun: function() { } };\n" +
			"  obj.Fun.prototype.larf = 9;\n" +
			"  return { obj : obj };" +
			"});", "a");
	};

	tests["test dotted constructor3"] = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","Fun":"function(new:obj.Fun):obj.Fun"},"types":{"obj.Fun":{"$$proto":"obj.Fun~proto"},"obj.Fun~proto":{"$$proto":"Object","larf":"Number"}},"kind":"AMD"}',
			"define([], function () {\n" +
			"  var obj = { Fun: function() { } };\n" +
			"  obj.Fun.prototype.larf = 9;\n" +
			"  return obj;" +
			"});", "a");
	};

	tests["test dotted constructor4"] = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","obj":"function(new:obj.Fun):obj.Fun"},"types":{"obj.Fun":{"$$proto":"obj.Fun~proto"},"obj.Fun~proto":{"$$proto":"Object","larf":"Number"}},"kind":"AMD"}',
			"define([], function () {\n" +
			"  var obj = { Fun: function() { } };\n" +
			"  obj.Fun.prototype.larf = 9;\n" +
			"  return { obj : obj.Fun };" +
			"});", "a");
	};

	tests["test dotted constructor5"] = function() {
		assertCreateSummary('{"provided":{"$$proto":"obj.Fun~proto"},"types":{"obj.Fun~proto":{"$$proto":"Object","larf":"Number"}},"kind":"AMD"}',
			"define([], function () {\n" +
			"  var obj = { Fun: function() { } };\n" +
			"  obj.Fun.prototype.larf = 9;\n" +
			"  return new obj.Fun();" +
			"});", "a");
	};

	tests["test jslint settings"] = function() {
		assertCreateSummary('{"provided":"function():undefined","types":{},"kind":"commonjs"}',
			"/*jslint node:true */\n" +
			"function foo() {}\n" +
			"exports = foo;", "a");
	};


	tests["test array export1"] = function() {
		assertCreateSummary('{"provided":"[Number]","types":{},"kind":"commonjs"}',
			"exports = [1];", "a");
	};
	tests["test array export2"] = function() {
		assertCreateSummary('{"provided":"Number","types":{},"kind":"commonjs"}',
			"exports = ([1])[0];", "a");
	};
	tests["test array export3"] = function() {
		assertCreateSummary('{"provided":"[[Number]]","types":{},"kind":"commonjs"}',
			"exports = [[1]];", "a");
	};
	tests["test array export4"] = function() {
		assertCreateSummary('{"provided":"[gen~a~2]","types":{"gen~a~2":{"$$proto":"Object","a":"Number"}},"kind":"commonjs"}',
			"exports = [{a:1}];", "a");
	};
	tests["test array export5"] = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"[Number]"},"types":{},"kind":"commonjs"}',
			"exports = {a:[1]};", "a");
	};
	tests["test array export6"] = function() {
		assertCreateSummary('{"provided":"[gen~a~2]","types":{"gen~a~2":{"$$proto":"Object","a":"[Number]"}},"kind":"commonjs"}',
			"exports = [{a:[1]}];", "a");
	};
	tests["test array export amd1"] = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"[Number]"},"types":{},"kind":"AMD"}',
			"/*global define */\n" +
			"define([], function() {\n" +
			"	return { a : [9]};\n" +
			"});", "a");
	};
	tests["test array export amd2"] = function() {
		assertCreateSummary('{"provided":"[gen~a~4]","types":{"gen~a~4":{"$$proto":"Object","a":"Number"}},"kind":"AMD"}',
			"/*global define */\n" +
			"define([], function() {\n" +
			"	return [{ a : 9}];\n" +
			"});", "a");
	};
	return tests;
});
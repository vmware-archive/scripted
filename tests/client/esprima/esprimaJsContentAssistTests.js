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

/*global define esprima console setTimeout doctrine*/
define(["plugins/esprima/esprimaJsContentAssist", "orion/assert", "esprima/esprima", "doctrine/doctrine"], function(mEsprimaPlugin, assert) {

	//////////////////////////////////////////////////////////
	// helpers
	//////////////////////////////////////////////////////////
	function computeContentAssist(buffer, prefix, offset, lintOptions) {
		if (!prefix) {
			prefix = "";
		}
		if (!offset) {
			offset = buffer.indexOf("/**/");
			if (offset < 0) {
				offset = buffer.length;
			}
		}
		var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider(null, lintOptions);
		return esprimaContentAssistant.computeProposals(buffer, offset, {prefix : prefix, inferredOnly : true });
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

	function parse(contents) {
		return esprima.parse(contents,{
			range: false,
			loc: false,
			tolerant: true
		});
	}

	function assertNoErrors(ast) {
		assert.ok(ast.errors===null || ast.errors.length===0,
			'errors: '+ast.errors.length+'\n'+ast.errors);
	}

	function assertErrors(ast,expectedErrors) {
		var expectedErrorList = (expectedErrors instanceof Array ? expectedErrors: [expectedErrors]);
		var correctNumberOfErrors = ast.errors!==null && ast.errors.length===expectedErrorList.length;
		assert.ok(correctNumberOfErrors,'errors: '+ast.errors.length+'\n'+ast.errors);
		if (correctNumberOfErrors) {
			for (var e=0;e<expectedErrors.length;e++) {
				var expectedError = expectedErrorList[e];
				var actualError = ast.errors[e];
				assert.equal(actualError.lineNumber,expectedError.lineNumber,"checking line for message #"+(e+1)+": "+actualError);
				var actualMessage = actualError.message.replace(/Line [0-9]*: /,'');
				assert.equal(actualMessage,expectedError.message,"checking text for message #"+(e+1)+": "+actualError);
			}
		}
	}


	function stringify(parsedProgram) {
		var body = parsedProgram.body;
		if (body.length===1) {
			body=body[0];
		}
		var replacer = function(key,value) {
			if (key==='computed') {
				return;
			}
			return value;
		};
		return JSON.stringify(body,replacer).replace(/"/g,'');
	}

	function message(line, text) {
		return {
			lineNumber:line,
			message:text
		};
	}

	//////////////////////////////////////////////////////////
	// tests
	//////////////////////////////////////////////////////////

	var tests = {};

	tests["test recovery basic parse"] = function() {
		var parsedProgram = parse("foo.bar");
		assertNoErrors(parsedProgram);
		assert.equal(stringify(parsedProgram),"{type:ExpressionStatement,expression:{type:MemberExpression,object:{type:Identifier,name:foo},property:{type:Identifier,name:bar}}}");
	};

	tests["test recovery - dot followed by EOF"] = function() {
		var parsedProgram = parse("foo.");
		assertErrors(parsedProgram,message(1,'Unexpected end of input'));
		assert.equal(stringify(parsedProgram),"{type:ExpressionStatement,expression:{type:MemberExpression,object:{type:Identifier,name:foo},property:null}}");
	};

	tests["test Empty Content Assist"] = function() {
		var results = computeContentAssist("x", "x");
		assert.equal(results.length, 0);
	};

	// non-inferencing content assist
	tests["test Empty File Content Assist"] = function() {
		var results = computeContentAssist("");
		testProposals(results, [
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test Single Var Content Assist"] = function() {
		var results = computeContentAssist("var zzz = 9;\n");
		testProposals(results, [
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["zzz", "zzz : Number"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test Single Var Content Assist 2"] = function() {
		var results = computeContentAssist("var zzz;\n");
		testProposals(results, [
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["zzz", "zzz : {}"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test multi var content assist 1"] = function() {
		var results = computeContentAssist("var zzz;\nvar xxx, yyy;\n");
		testProposals(results, [
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["xxx", "xxx : {}"],
			["yyy", "yyy : {}"],
			["zzz", "zzz : {}"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test multi var content assist 2"] = function() {
		var results = computeContentAssist("var zzz;\nvar zxxx, xxx, yyy;\nz","z");
		testProposals(results, [
			["zxxx", "zxxx : {}"],
			["zzz", "zzz : {}"]
		]);
	};
	tests["test single function content assist"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\n");
		testProposals(results, [
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["fun(a, b, c)", "fun(a, b, c) : undefined"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test multi function content assist 1"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {}\n");
		testProposals(results, [
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["fun(a, b, c)", "fun(a, b, c) : undefined"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["other(a, b, c)", "other(a, b, c) : undefined"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};

	tests["test no dupe 1"] = function() {
		var results = computeContentAssist(
				"var coo = 9; var other = function(coo) { c/**/ }", "c");
		testProposals(results, [
			["coo", "coo : {}"]
		]);
	};

	tests["test no dupe 2"] = function() {
		var results = computeContentAssist(
				"var coo = { }; var other = function(coo) { coo = 9;\nc/**/ }", "c");
		testProposals(results, [
			["coo", "coo : Number"]
		]);
	};

	tests["test no dupe 3"] = function() {
		var results = computeContentAssist(
				"var coo = function () { var coo = 9; \n c/**/};", "c");
		testProposals(results, [
			["coo", "coo : Number"]
		]);
	};

	tests["test no dupe 4"] = function() {
		var results = computeContentAssist(
				"var coo = 9; var other = function () { var coo = function() { return 9; }; \n c/**/};", "c");
		testProposals(results, [
			["coo()", "coo() : Number"]
		]);
	};

	tests["test scopes 1"] = function() {
		// only the outer foo is available
		var results = computeContentAssist(
				"var coo;\nfunction other(a, b, c) {\nfunction inner() { var coo2; }\nco/**/}", "co");
		testProposals(results, [
			["coo", "coo : {}"]
		]);
	};
	tests["test scopes 2"] = function() {
		// the inner assignment should not affect the value of foo
		var results = computeContentAssist("var foo;\n" +
				"var foo = 1;\nfunction other(a, b, c) {\nfunction inner() { foo2 = \"\"; }\nfoo.toF/**/}", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test multi function content assist 2"] = function() {
		var results = computeContentAssist("function ffun(a, b, c) {}\nfunction other(a, b, c) {}\nff", "ff");
		testProposals(results, [
			["ffun(a, b, c)", "ffun(a, b, c) : undefined"]
		]);
	};
	tests["test in function 1"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {/**/}", "");
		testProposals(results, [
			["a", "a : {}"],
			["arguments", "arguments : Arguments"],
			["b", "b : {}"],
			["c", "c : {}"],
			["", "---------------------------------"],
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["fun(a, b, c)", "fun(a, b, c) : undefined"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["other(a, b, c)", "other(a, b, c) : undefined"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test in function 2"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {\n/**/nuthin}", "");
		testProposals(results, [
			["a", "a : {}"],
			["arguments", "arguments : Arguments"],
			["b", "b : {}"],
			["c", "c : {}"],
			["", "---------------------------------"],
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["fun(a, b, c)", "fun(a, b, c) : undefined"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["other(a, b, c)", "other(a, b, c) : undefined"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["nuthin", "nuthin : {}"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test in function 3"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {f/**/}", "f");
		testProposals(results, [
			["fun(a, b, c)", "fun(a, b, c) : undefined"],
			["Function()", "Function() : Function"]
		]);
	};
	tests["test in function 4"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(aa, ab, c) {a/**/}", "a");
		testProposals(results, [
			["aa", "aa : {}"],
			["ab", "ab : {}"],
			["arguments", "arguments : Arguments"],
			["", "---------------------------------"],
			["Array([val])", "Array([val]) : Array"]
		]);
	};
	tests["test in function 5"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(aa, ab, c) {var abb;\na/**/\nvar aaa}", "a");
		testProposals(results, [
			["aaa", "aaa : {}"],
			["abb", "abb : {}"],
			["", "---------------------------------"],
			["aa", "aa : {}"],
			["ab", "ab : {}"],
			["arguments", "arguments : Arguments"],
			["", "---------------------------------"],
			["Array([val])", "Array([val]) : Array"]
		]);
	};
	tests["test in function 6"] = function() {
		var results = computeContentAssist(
		"function fun(a, b, c) {\n" +
		"function other(aa, ab, c) {\n"+
		"var abb;\na/**/\nvar aaa\n}\n}", "a");
		testProposals(results, [
			["aaa", "aaa : {}"],
			["abb", "abb : {}"],
			["", "---------------------------------"],
			["aa", "aa : {}"],
			["ab", "ab : {}"],
			["arguments", "arguments : Arguments"],
			["", "---------------------------------"],
			["a", "a : {}"],
			["", "---------------------------------"],
			["Array([val])", "Array([val]) : Array"]
		]);
	};
	tests["test in function 7"] = function() {
		// should not see 'aaa' or 'abb' since declared in another function
		var results = computeContentAssist(
		"function fun(a, b, c) {/**/\n" +
		"function other(aa, ab, ac) {\n"+
		"var abb;\na\nvar aaa\n}\n}");
		testProposals(results, [
			["a", "a : {}"],
			["arguments", "arguments : Arguments"],
			["b", "b : {}"],
			["c", "c : {}"],
			["", "---------------------------------"],
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["fun(a, b, c)", "fun(a, b, c) : undefined"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["other(aa, ab, ac)", "other(aa, ab, ac) : undefined"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test in function 8"] = function() {
		// should not see 'aaa' since that is declared later
		var results = computeContentAssist(
		"function fun(a, b, c) {\n" +
		"function other(aa, ab, ac) {\n"+
		"var abb;\na\nvar aaa\n} /**/\n}");
		testProposals(results, [
			["other(aa, ab, ac)", "other(aa, ab, ac) : undefined"],
			["", "---------------------------------"],
			["a", "a : {}"],
			["arguments", "arguments : Arguments"],
			["b", "b : {}"],
			["c", "c : {}"],
			["", "---------------------------------"],
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["fun(a, b, c)", "fun(a, b, c) : undefined"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};


	// all inferencing based content assist tests here
	tests["test Object inferencing with Variable"] = function() {
		var results = computeContentAssist("var t = {}\nt.h", "h");
		testProposals(results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"]
		]);
	};
	tests["test Object Literal inferencing"] = function() {
		var results = computeContentAssist("var t = { hhh : 1, hh2 : 8}\nt.h", "h");
		testProposals(results, [
			["hh2", "hh2 : Number"],
			["hhh", "hhh : Number"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"]
		]);
	};
	tests["test Simple String inferencing"] = function() {
		var results = computeContentAssist("''.char", "char");
		testProposals(results, [
			["charAt(index)", "charAt(index) : String"],
			["charCodeAt(index)", "charCodeAt(index) : Number"]
		]);
	};
	tests["test Simple Date inferencing"] = function() {
		var results = computeContentAssist("new Date().setD", "setD");
		testProposals(results, [
			["setDate(date)", "setDate(date) : Number"],
			["setDay(dayOfWeek)", "setDay(dayOfWeek) : Number"]
		]);
	};
	tests["test Number inferencing with Variable"] = function() {
		var results = computeContentAssist("var t = 1\nt.to", "to");
		testProposals(results, [
			["toExponential(digits)", "toExponential(digits) : String"],
			["toFixed(digits)", "toFixed(digits) : String"],
			["toPrecision(digits)", "toPrecision(digits) : String"],
			["", "---------------------------------"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"]
		]);
	};

	tests["test Data flow Object Literal inferencing"] = function() {
		var results = computeContentAssist("var s = { hhh : 1, hh2 : 8}\nvar t = s;\nt.h", "h");
		testProposals(results, [
			["hh2", "hh2 : Number"],
			["hhh", "hhh : Number"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"]
		]);
	};
	tests["test Data flow inferencing 1"] = function() {
		var results = computeContentAssist("var ttt = 9\nttt.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test Data flow inferencing 2"] = function() {
		var results = computeContentAssist("ttt = 9\nttt.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test Data flow inferencing 3"] = function() {
		var results = computeContentAssist("var ttt = \"\"\nttt = 9\nttt.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test Data flow inferencing 4"] = function() {
		var results = computeContentAssist("var name = toString(property.key.value);\nname.co", "co");
		testProposals(results, [
			["concat(str)", "concat(str) : String"]
		]);
	};

	tests["test Simple this"] = function() {
		var results = computeContentAssist("var ssss = 4;\nthis.ss", "ss");
		testProposals(results, [
			["ssss", "ssss : Number"]
		]);
	};

	tests["test Object Literal inside"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : this.th/**/ };", "th");
		testProposals(results, [
			["the", "the : Number"]
		]);
	};
	tests["test Object Literal outside"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nx.th", "th");
		testProposals(results, [
			["the", "the : Number"]
		]);
	};
	tests["test Object Literal none"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nthis.th", "th");
		testProposals(results, [
		]);
	};
	tests["test Object Literal outside 2"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nvar who = x.th", "th");
		testProposals(results, [
			["the", "the : Number"]
		]);
	};
	tests["test Object Literal outside 3"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nwho(x.th/**/)", "th");
		testProposals(results, [
			["the", "the : Number"]
		]);
	};
	tests["test Object Literal outside 4"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nwho(yyy, x.th/**/)", "th");
		testProposals(results, [
			["the", "the : Number"]
		]);
	};
	tests["test this reference 1"] = function() {
		var results = computeContentAssist("var xxxx;\nthis.x", "x");
		testProposals(results, [
			["xxxx", "xxxx : {}"]
		]);
	};
	tests["test binary expression 1"] = function() {
		var results = computeContentAssist("(1+3).toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	// not working since for loop is not storing slocs of var ii
	tests["test for loop 1"] = function() {
		var results = computeContentAssist("for (var ii=0;i/**/<8;ii++) { ii }", "i");
		testProposals(results, [
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["ii", "ii : Number"],
			["Infinity", "Infinity : Number"],
			["", "---------------------------------"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"]
		]);
	};
	tests["test for loop 2"] = function() {
		var results = computeContentAssist("for (var ii=0;ii<8;i/**/++) { ii }", "i");
		testProposals(results, [
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["ii", "ii : Number"],
			["Infinity", "Infinity : Number"],
			["", "---------------------------------"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"]
		]);
	};
	tests["test for loop 3"] = function() {
		var results = computeContentAssist("for (var ii=0;ii<8;ii++) { i/**/ }", "i");
		testProposals(results, [
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["ii", "ii : Number"],
			["Infinity", "Infinity : Number"],
			["", "---------------------------------"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"]
		]);
	};
	tests["test while loop 1"] = function() {
		var results = computeContentAssist("var iii;\nwhile(ii/**/ === null) {\n}", "ii");
		testProposals(results, [
			["iii", "iii : {}"]
		]);
	};
	tests["test while loop 2"] = function() {
		var results = computeContentAssist("var iii;\nwhile(this.ii/**/ === null) {\n}", "ii");
		testProposals(results, [
			["iii", "iii : {}"]
		]);
	};
	tests["test while loop 3"] = function() {
		var results = computeContentAssist("var iii;\nwhile(iii === null) {this.ii/**/\n}", "ii");
		testProposals(results, [
			["iii", "iii : {}"]
		]);
	};
	tests["test catch clause 1"] = function() {
		var results = computeContentAssist("try { } catch (eee) {e/**/  }", "e");
		testProposals(results, [
			["eee", "eee : Error"],
			["", "---------------------------------"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"]
		]);
	};
	tests["test catch clause 2"] = function() {
		// the type of the catch variable is Error
		var results = computeContentAssist("try { } catch (eee) {\neee.me/**/  }", "me");
		testProposals(results, [
			["message", "message : String"]
		]);
	};


	tests["test get global var"] = function() {
		// should infer that we are referring to the globally defined xxx, not the param
		var results = computeContentAssist("var xxx = 9;\nfunction fff(xxx) { this.xxx.toF/**/}", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test get local var"] = function() {
		// should infer that we are referring to the locally defined xxx, not the global
		var results = computeContentAssist("var xxx = 9;\nfunction fff(xxx) { xxx.toF/**/}", "toF");
		testProposals(results, [
		]);
	};

	tests["test Math 1"] = function() {
		var results = computeContentAssist("Mat", "Mat");
		testProposals(results, [
			["Math", "Math : Math"]
		]);
	};
	tests["test Math 2"] = function() {
		var results = computeContentAssist("this.Mat", "Mat");
		testProposals(results, [
			["Math", "Math : Math"]
		]);
	};
	tests["test Math 3"] = function() {
		// Math not available when this isn't the global this
		var results = computeContentAssist("var ff = { f: this.Mat/**/ }", "Mat");
		testProposals(results, [
		]);
	};
	tests["test Math 4"] = function() {
		var results = computeContentAssist("this.Math.E", "E");
		testProposals(results, [
			["E", "E : Number"]
		]);
	};
	tests["test JSON 4"] = function() {
		var results = computeContentAssist("this.JSON.st", "st");
		testProposals(results, [
			["stringify(json)", "stringify(json) : String"]
		]);
	};
	tests["test multi-dot inferencing 1"] = function() {
		var results = computeContentAssist("var a = \"\";\na.charAt().charAt().charAt().ch", "ch");
		testProposals(results, [
			["charAt(index)", "charAt(index) : String"],
			["charCodeAt(index)", "charCodeAt(index) : Number"]
		]);
	};
	tests["test multi-dot inferencing 2"] = function() {
		var results = computeContentAssist(
		"var zz = {};\nzz.zz = zz;\nzz.zz.zz.z", "z");
		testProposals(results, [
			["zz", "zz : {zz:{zz:{...}}}"]
		]);
	};
	tests["test multi-dot inferencing 3"] = function() {
		var results = computeContentAssist(
		"var x = { yy : { } };\nx.yy.zz = 1;\nx.yy.z", "z");
		testProposals(results, [
			["zz", "zz : Number"]
		]);
	};
	tests["test multi-dot inferencing 4"] = function() {
		var results = computeContentAssist(
		"var x = { yy : { } };\nx.yy.zz = 1;\nx.yy.zz.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test constructor 1"] = function() {
		var results = computeContentAssist(
		"function Fun() {\n	this.xxx = 9;\n	this.uuu = this.x/**/;}", "x");
		testProposals(results, [
			["xxx", "xxx : Number"]
		]);
	};
	tests["test constructor 2"] = function() {
		var results = computeContentAssist(
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.x", "x");
		testProposals(results, [
			["xxx", "xxx : Number"]
		]);
	};
	tests["test constructor 3"] = function() {
		var results = computeContentAssist(
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.xxx.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test constructor 3"] = function() {
		var results = computeContentAssist(
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test constructor 4"] = function() {
		var results = computeContentAssist(
		"var Fun = function () {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test constructor 5"] = function() {
		var results = computeContentAssist(
		"var x = { Fun : function () { this.xxx = 9;	this.uuu = this.xxx; } }\n" +
		"var y = new x.Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test constructor 6"] = function() {
		var results = computeContentAssist(
		"var x = { Fun : function () { this.xxx = 9;	this.uuu = this.xxx; } }\n" +
		"var y = new x.Fun().uuu.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test constructor 7"] = function() {
		var results = computeContentAssist(
		"var Fun = function () {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var x = { Fun : Fun };\n" +
		"var y = new x.Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test constructor 8"] = function() {
		var results = computeContentAssist(
		"var FunOrig = function () {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var x = { Fun : FunOrig };\n" +
		"var y = new x.Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	// functions should not be available outside the scope that declares them
	tests["test constructor 9"] = function() {
		var results = computeContentAssist(
		"function outer() { function Inner() { }}\n" +
		"Inn", "Inn");
		testProposals(results, [
			// TODO FIXADE adding all constructors to global scope.  not correct
			["Inner()", "Inner() : Inner"]
		]);
	};

	// should be able to reference functions using qualified name
	tests["test constructor 10"] = function() {
		var results = computeContentAssist(
		"var outer = { Inner : function() { }}\n" +
		"outer.Inn", "Inn");
		testProposals(results, [
			["Inner()", "Inner() : outer.Inner"]
		]);
	};

	tests["test Function args 1"] = function() {
		var results = computeContentAssist(
		"var ttt, uuu;\nttt(/**/)");
		testProposals(results, [
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["ttt", "ttt : {}"],
			["undefined", "undefined : undefined"],
			["uuu", "uuu : {}"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test Function args 2"] = function() {
		var results = computeContentAssist(
		"var ttt, uuu;\nttt(ttt, /**/)");
		testProposals(results, [
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["ttt", "ttt : {}"],
			["undefined", "undefined : undefined"],
			["uuu", "uuu : {}"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test Function args 3"] = function() {
		var results = computeContentAssist(
		"var ttt, uuu;\nttt(ttt, /**/, uuu)");
		testProposals(results, [
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["ttt", "ttt : {}"],
			["undefined", "undefined : undefined"],
			["uuu", "uuu : {}"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};

	// check that function args don't get assigned the same type
	tests["test function args 4"] = function() {
		var results = computeContentAssist(
			"function tt(aaa, bbb) { aaa.foo = 9;bbb.foo = ''\naaa.f/**/}", "f");
		testProposals(results, [
			["foo", "foo : Number"]
		]);
	};

	// check that function args don't get assigned the same type
	tests["test function args 5"] = function() {
		var results = computeContentAssist(
			"function tt(aaa, bbb) { aaa.foo = 9;bbb.foo = ''\nbbb.f/**/}", "f");
		testProposals(results, [
			["foo", "foo : String"]
		]);
	};

	// FIXADE failing since we do not handle constructors that are not identifiers
//	tests["test constructor 5"] = function() {
//		var results = computeContentAssist(
//		"var obj = { Fun : function() {	this.xxx = 9;	this.uuu = this.xxx; } }\n" +
//		"var y = new obj.Fun();\n" +
//		"y.uuu.toF", "toF");
//		testProposals(results, [
//			["toFixed(digits)", "toFixed(digits) : String"]
//		]);
//	};
	tests["test constructor 6"] = function() {
		var results = computeContentAssist(
		"function Fun2() {\n" +
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.uuu.toF/**/}", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};


	tests["test nested object expressions 1"] = function() {
		var results = computeContentAssist(
		"var ttt = { xxx : { yyy : { zzz : 1} } };\n" +
		"ttt.xxx.y", "y");
		testProposals(results, [
			["yyy", "yyy : {zzz:Number}"]
		]);
	};
	tests["test nested object expressions 2"] = function() {
		var results = computeContentAssist(
		"var ttt = { xxx : { yyy : { zzz : 1} } };\n" +
		"ttt.xxx.yyy.z", "z");
		testProposals(results, [
			["zzz", "zzz : Number"]
		]);
	};
	tests["test nested object expressions 3"] = function() {
		var results = computeContentAssist(
		"var ttt = { xxx : { yyy : { zzz : 1} } };\n" +
		"ttt.xxx.yyy.zzz.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function expression 1"] = function() {
		var results = computeContentAssist(
		"var ttt = function(a, b, c) { };\ntt", "tt");
		testProposals(results, [
			["ttt(a, b, c)", "ttt(a, b, c) : undefined"]
		]);
	};
	tests["test function expression 2"] = function() {
		var results = computeContentAssist(
		"ttt = function(a, b, c) { };\ntt", "tt");
		testProposals(results, [
			["ttt(a, b, c)", "ttt(a, b, c) : undefined"]
		]);
	};
	tests["test function expression 3"] = function() {
		var results = computeContentAssist(
		"ttt = { rrr : function(a, b, c) { } };\nttt.rr", "rr");
		testProposals(results, [
			["rrr(a, b, c)", "rrr(a, b, c) : undefined"]
		]);
	};
	tests["test function expression 4"] = function() {
		var results = computeContentAssist(
		"var ttt = function(a, b) { };\nvar hhh = ttt;\nhhh", "hhh");
		testProposals(results, [
			["hhh(a, b)", "hhh(a, b) : undefined"]
		]);
	};
	tests["test function expression 4a"] = function() {
		var results = computeContentAssist(
		"function ttt(a, b) { };\nvar hhh = ttt;\nhhh", "hhh");
		testProposals(results, [
			["hhh(a, b)", "hhh(a, b) : undefined"]
		]);
	};
	tests["test function expression 5"] = function() {
		var results = computeContentAssist(
		"var uuu = {	flart : function (a,b) { } };\nhhh = uuu.flart;\nhhh", "hhh");
		testProposals(results, [
			["hhh(a, b)", "hhh(a, b) : undefined"]
		]);
	};
	tests["test function expression 6"] = function() {
		var results = computeContentAssist(
		"var uuu = {	flart : function (a,b) { } };\nhhh = uuu.flart;\nhhh.app", "app");
		testProposals(results, [
			["apply(func, [argArray])", "apply(func, [argArray]) : Object"]
		]);
	};

	tests["test globals 1"] = function() {
		var results = computeContentAssist("/*global faaa */\nfa", "fa");
		testProposals(results, [
			["faaa", "faaa : {}"]
		]);
	};
	tests["test globals 2"] = function() {
		var results = computeContentAssist("/*global  \t\n faaa \t\t\n faaa2  */\nfa", "fa");
		testProposals(results, [
			["faaa", "faaa : {}"],
			["faaa2", "faaa2 : {}"]
		]);
	};
	tests["test globals 3"] = function() {
		var results = computeContentAssist("/*global  \t\n faaa \t\t\n fass2  */\nvar t = 1;\nt.fa", "fa");
		testProposals(results, [
		]);
	};

	tests["test globals 4"] = function() {
		var results = computeContentAssist("/*global  \t\n faaa:true \t\t\n faaa2:false  */\nfa", "fa");
		testProposals(results, [
			["faaa", "faaa : {}"],
			["faaa2", "faaa2 : {}"]
		]);
	};

	tests["test globals 5"] = function() {
		var results = computeContentAssist("/*global  \t\n faaa:true, \t\t\n faaa2:false,  */\nfa", "fa");
		testProposals(results, [
			["faaa", "faaa : {}"],
			["faaa2", "faaa2 : {}"]
		]);
	};



	////////////////////////////
	// tests for complex names
	////////////////////////////
	tests["test complex name 1"] = function() {
		var results = computeContentAssist("function Ttt() { }\nvar ttt = new Ttt();\ntt", "tt");
		testProposals(results, [
			["Ttt()", "Ttt() : Ttt"],
			["ttt", "ttt : Ttt"]
		]);
	};
	tests["test complex name 2"] = function() {
		var results = computeContentAssist("var Ttt = function() { };\nvar ttt = new Ttt();\ntt", "tt");
		testProposals(results, [
			["Ttt()", "Ttt() : Ttt"],
			["ttt", "ttt : Ttt"]
		]);
	};
	tests["test complex name 3"] = function() {
		var results = computeContentAssist("var ttt = { };\ntt", "tt");
		testProposals(results, [
			["ttt", "ttt : {}"]
		]);
	};
	tests["test complex name 4"] = function() {
		var results = computeContentAssist("var ttt = { aa: 1, bb: 2 };\ntt", "tt");
		testProposals(results, [
			["ttt", "ttt : {aa:Number,bb:Number}"]
		]);
	};
	tests["test complex name 5"] = function() {
		var results = computeContentAssist("var ttt = { aa: 1, bb: 2 };\nttt.cc = 9;\ntt", "tt");
		testProposals(results, [
			["ttt", "ttt : {aa:Number,bb:Number,cc:Number}"]
		]);
	};

	////////////////////////////
	// tests for broken syntax
	////////////////////////////

	tests["test broken after dot 1"] = function() {
		var results = computeContentAssist("var ttt = { ooo:8};\nttt.", "");
		testProposals(results, [
			["ooo", "ooo : Number"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};

	tests["test broken after dot 2"] = function() {
		var results = computeContentAssist("var ttt = { ooo:8};\nif (ttt.) { ttt }", "", "var ttt = { ooo:8};\nif (ttt.".length);
		testProposals(results, [
			["ooo", "ooo : Number"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	tests["test broken after dot 3"] = function() {
		var results = computeContentAssist("var ttt = { ooo:this.};", "", "var ttt = { ooo:this.".length);
		testProposals(results, [
			["ooo", "ooo : {ooo:{ooo:{...}}}"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	// same as above, except use /**/
	tests["test broken after dot 3a"] = function() {
		var results = computeContentAssist("var ttt = { ooo:this./**/};", "");
		testProposals(results, [
			["ooo", "ooo : {ooo:{ooo:{...}}}"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};

	tests["test broken after dot 4"] = function() {
		var results = computeContentAssist("var ttt = { ooo:8};\nfunction ff() { \nttt.}", "", "var ttt = { ooo:8};\nfunction ff() { \nttt.".length);
		testProposals(results, [
			["ooo", "ooo : Number"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};
	// same as above, except use /**/
	tests["test broken after dot 4a"] = function() {
		var results = computeContentAssist("var ttt = { ooo:8};\nfunction ff() { \nttt./**/}", "");
		testProposals(results, [
			["ooo", "ooo : Number"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};

	tests["test broken after dot 5"] = function() {
		var results = computeContentAssist(
			"var first = {ooo:9};\n" +
			"first.\n" +
			"var jjj;", "",

			("var first = {ooo:9};\n" +
			"first.").length);

		testProposals(results, [
			["ooo", "ooo : Number"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};


	tests["test broken after dot 6"] = function() {
		var results = computeContentAssist(
			"var first = {ooo:9};\n" +
			"first.\n" +
			"if (x) { }", "",

			("var first = {ooo:9};\n" +
			"first.").length);

		testProposals(results, [
			["ooo", "ooo : Number"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};

	// test return types of various simple functions
	tests["test function return type 1"] = function() {
		var results = computeContentAssist(
			"var first = function() { return 9; };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type 1a"] = function() {
		// complete on a function, not a number
		var results = computeContentAssist(
			"var first = function() { return 9; };\nfirst.arg", "arg");
		testProposals(results, [
			["arguments", "arguments : Arguments"]
		]);
	};

	tests["test function return type 2"] = function() {
		var results = computeContentAssist(
			"function first() { return 9; };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type 3"] = function() {
		var results = computeContentAssist(
			"var obj = { first : function () { return 9; } };\nobj.first().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type 4"] = function() {
		var results = computeContentAssist(
			"function first() { return { ff : 9 }; };\nfirst().ff.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type 5"] = function() {
		var results = computeContentAssist(
			"function first() { return function() { return 9; }; };\nvar ff = first();\nff().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type 6"] = function() {
		var results = computeContentAssist(
			"function first() { return function() { return 9; }; };\nfirst()().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	// now test different ways that functions can be constructed
	tests["test function return type if 1"] = function() {
		var results = computeContentAssist(
			"function first() { if(true) { return 8; } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type if 2"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { if(true) { return ''; } else  { return 8; } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type while"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { while(true) { return 1; } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type do/while"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { do { return 1; } while(true); };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type for"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { for (var i; i < 10; i++) { return 1; } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type for in"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { for (var i in k) { return 1; } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type try 1"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { try { return 1; } catch(e) { } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type try 2"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { try { return 1; } catch(e) { } finally { } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type try 3"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { try { return ''; } catch(e) { return 9; } finally { } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type try 4"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { try { return ''; } catch(e) { return ''; } finally { return 9; } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type switch 1"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { switch (v) { case a: return 9; } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type switch 2"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { switch (v) { case b: return ''; case a: return 1; } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type switch 3"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { switch (v) { case b: return ''; default: return 1; } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type nested block 1"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { while(true) { a;\nb\n;return 9; } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test function return type nest block 2"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { while(true) { while(false) { \n;return 9; } } };\nfirst().toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test function return type obj literal 1"] = function() {
		var results = computeContentAssist(
			"function first() { return { a : 9, b : '' }; };\nfir", "fir");
		testProposals(results, [
			["first()", "first() : {a:Number,b:String}"]
		]);
	};

	tests["test function return type obj literal 2"] = function() {
		var results = computeContentAssist(
			"function first () {" +
			"	return function () {\n" +
			"		var a = { a : 9, b : '' };\n" +
			"		return a;\n" +
			"	}\n" +
			"}\nfir", "fir");
		testProposals(results, [
			["first()", "first() : function():{a:Number,b:String}"]
		]);
	};
	tests["test function return type obj literal 3"] = function() {
		var results = computeContentAssist(
			"function first () {" +
			"	return function () {\n" +
			"		var a = { a : 9, b : '' };\n" +
			"		return a;\n" +
			"	}\n" +
			"}\nfirst().ar", "ar");
		testProposals(results, [
			["arguments", "arguments : Arguments"]
		]);
	};
	tests["test function return type obj literal 4"] = function() {
		var results = computeContentAssist(
			"function first () {" +
			"	return function () {\n" +
			"		var a = { aa : 9, b : '' };\n" +
			"		return a;\n" +
			"	}\n" +
			"}\nfirst()().a", "a");
		testProposals(results, [
			["aa", "aa : Number"]
		]);
	};

	///////////////////////////////////////////////
	// Some tests for implicitly defined variables
	///////////////////////////////////////////////

	// should see xxx as an object
	tests["test implicit1"] = function() {
		var results = computeContentAssist(
			"xxx;\nxx", "xx");
		testProposals(results, [
			["xxx", "xxx : {}"]
		]);
	};

	tests["test implicit2"] = function() {
		var results = computeContentAssist(
			"xxx.yyy = 0;\nxxx.yy", "yy");
		testProposals(results, [
			["yyy", "yyy : Number"]
		]);
	};

	tests["test implicit3"] = function() {
		var results = computeContentAssist(
			"xxx;\n xxx.yyy = 0;\nxxx.yy", "yy");
		testProposals(results, [
			["yyy", "yyy : Number"]
		]);
	};

	tests["test implicit4"] = function() {
		var results = computeContentAssist(
			"xxx = 0;\nxx", "xx");
		testProposals(results, [
			["xxx", "xxx : Number"]
		]);
	};

	// implicits are available in the global scope
	tests["test implicit5"] = function() {
		var results = computeContentAssist(
			"function inner() { xxx = 0; }\nxx", "xx");
		testProposals(results, [
			["xxx", "xxx : Number"]
		]);
	};

	// implicits are available in the global scope
	tests["test implicit6"] = function() {
		var results = computeContentAssist(
			"var obj = { foo : function inner() { xxx = 0; } }\nxx", "xx");
		testProposals(results, [
			["xxx", "xxx : Number"]
		]);
	};

	// should see an implicit even if it comes after the invocation location
	tests["test implicit7"] = function() {
		var results = computeContentAssist(
			"xx/**/\nxxx", "xx");
		testProposals(results, [
			["xxx", "xxx : {}"]
		]);
	};

	tests["test implicit8"] = function() {
		var results = computeContentAssist(
			"var xxx;\nvar obj = { foo : function inner() { xxx = 0; } }\nxx", "xx");
		testProposals(results, [
			["xxx", "xxx : Number"]
		]);
	};


	// not really an implicit variable, but
	tests["test implicit9"] = function() {
		var results = computeContentAssist(
			"xxx", "xxx");
		testProposals(results, [
		]);
	};


	///////////////////////////////////////////////
	// Binary and unary expressions
	///////////////////////////////////////////////
	tests["test binary expr1"] = function() {
		var results = computeContentAssist(
			"(1 + 2).toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test binary expr2"] = function() {
		var results = computeContentAssist(
			"(1 + '').char", "char");
		testProposals(results, [
			["charAt(index)", "charAt(index) : String"],
			["charCodeAt(index)", "charCodeAt(index) : Number"]
		]);
	};
	tests["test binary expr3"] = function() {
		var results = computeContentAssist(
			"('' + 2).char", "char");
		testProposals(results, [
			["charAt(index)", "charAt(index) : String"],
			["charCodeAt(index)", "charCodeAt(index) : Number"]
		]);
	};
	tests["test binary expr4"] = function() {
		var results = computeContentAssist(
			"('' + hucairz).char", "char");
		testProposals(results, [
			["charAt(index)", "charAt(index) : String"],
			["charCodeAt(index)", "charCodeAt(index) : Number"]
		]);
	};
	tests["test binary expr5"] = function() {
		var results = computeContentAssist(
			"(hucairz + hucairz).toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test binary expr6"] = function() {
		var results = computeContentAssist(
			"(hucairz - hucairz).toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test binary expr7"] = function() {
		var results = computeContentAssist(
			"('' - '').toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test binary expr8"] = function() {
		var results = computeContentAssist(
			"('' & '').toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test binary expr9"] = function() {
		var results = computeContentAssist(
			"({ a : 9 } && '').a.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test binary expr10"] = function() {
		var results = computeContentAssist(
			"({ a : 9 } || '').a.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test binary expr11"] = function() {
		var results = computeContentAssist(
			"var aaa = function() { return hucairz || hucairz; }\naa", "aa");
		testProposals(results, [
			["aaa()", "aaa() : {}"]
		]);
	};
	tests["test binary expr12"] = function() {
		var results = computeContentAssist(
			"var aaa = function() { return hucairz | hucairz; }\naa", "aa");
		testProposals(results, [
			["aaa()", "aaa() : Number"]
		]);
	};
	tests["test binary expr12"] = function() {
		var results = computeContentAssist(
			"var aaa = function() { return hucairz == hucairz; }\naa", "aa");
		testProposals(results, [
			["aaa()", "aaa() : Boolean"]
		]);
	};

	tests["test unary expr1"] = function() {
		var results = computeContentAssist(
			"(x += y).toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test unary expr2"] = function() {
		var results = computeContentAssist(
			"(x += 1).toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test unary expr3"] = function() {
		var results = computeContentAssist(
			"var x = '';\n(x += 1).char", "char");
		testProposals(results, [
			["charAt(index)", "charAt(index) : String"],
			["charCodeAt(index)", "charCodeAt(index) : Number"]
		]);
	};
	tests["test unary expr4"] = function() {
		var results = computeContentAssist(
			"var aaa = function() { return !hucairz; }\naa", "aa");
		testProposals(results, [
			["aaa()", "aaa() : Boolean"]
		]);
	};

	///////////////////////////////////////////////
	// Mucking around with a constructor function's prototype
	///////////////////////////////////////////////
	tests["test constructor prototype1"] = function() {
		var results = computeContentAssist(
			"var AAA = function() { };\nAAA.prototype.foo = 9;\nnew AAA().f", "f");
		testProposals(results, [
			["foo", "foo : Number"]
		]);
	};
	tests["test constructor prototype2"] = function() {
		var results = computeContentAssist(
			"var AAA = function() { };\nAAA.prototype = { foo : 9 };\nnew AAA().f", "f");
		testProposals(results, [
			["foo", "foo : Number"]
		]);
	};
	tests["test constructor prototype3"] = function() {
		var results = computeContentAssist(
			"var AAA = function() { this.foo = 0; };\nAAA.prototype = { foo : '' };\nnew AAA().f", "f");
		testProposals(results, [
			["foo", "foo : Number"]
		]);
	};
	tests["test constructor prototype4"] = function() {
		var results = computeContentAssist(
			"var AAA = function() { };\nAAA.prototype = { foo : 9 };\nvar x = new AAA();\n x.f", "f");
		testProposals(results, [
			["foo", "foo : Number"]
		]);
	};
	tests["test constructor prototype5"] = function() {
		var results = computeContentAssist(
			"var AAA = function() { };\nAAA.prototype = { foo : '' };\nvar x = new AAA();\nx.foo = 9;\nx.f", "f");
		testProposals(results, [
			["foo", "foo : Number"]
		]);
	};
	tests["test constructor prototype6"] = function() {
		var results = computeContentAssist(
			"var Fun = function() { };\n" +
			"var obj = new Fun();\n" +
			"Fun.prototype.num = 0;\n" +
			"obj.n", "n");
		testProposals(results, [
			["num", "num : Number"]
		]);
	};


	tests["test dotted constructor1"] = function() {
		var results = computeContentAssist(
			"var obj = { Fun : function() { }, fun : function() {}, fun2 : 9 }\nnew obj", "obj");
		testProposals(results, [
			["obj.Fun()", "obj.Fun() : obj.Fun"],
			["Object([val])", "Object([val]) : Object"],
			["obj", "obj : {Fun:function(new:obj.Fun):obj.Fun,fun:function(),fun2:Number}"]
		]);
	};

	tests["test dotted constructor2"] = function() {
		var results = computeContentAssist(
			"var obj = { Fun : function() { } }\nnew obj.F", "F");
		testProposals(results, [
			["Fun()", "Fun() : obj.Fun"]
		]);
	};

	tests["test dotted constructor3"] = function() {
		var results = computeContentAssist(
			"var obj = { };\nobj.Fun = function() { };\nnew obj", "obj");
		testProposals(results, [
			["obj.Fun()", "obj.Fun() : obj.Fun"],
			["Object([val])", "Object([val]) : Object"],
			["obj", "obj : {Fun:function(new:obj.Fun):obj.Fun}"]
		]);
	};

	tests["test dotted constructor4"] = function() {
		var results = computeContentAssist(
			"var obj = { inner : { Fun : function() { } } }\nnew obj", "obj");
		testProposals(results, [
			["obj.inner.Fun()", "obj.inner.Fun() : obj.inner.Fun"],
			["Object([val])", "Object([val]) : Object"],
			["obj", "obj : {inner:{Fun:function(new:obj.inner.Fun):obj.inner.Fun}}"]
		]);
	};

	tests["test dotted constructor5"] = function() {
		var results = computeContentAssist(
			"var obj = { inner : {} }\nobj.inner.Fun = function() { }\nnew obj", "obj");
		testProposals(results, [
			["obj.inner.Fun()", "obj.inner.Fun() : obj.inner.Fun"],
			["Object([val])", "Object([val]) : Object"],
			["obj", "obj : {inner:{Fun:function(new:obj.inner.Fun):obj.inner.Fun}}"]

		]);
	};

	tests["test dotted constructor6"] = function() {
		var results = computeContentAssist(
			"var obj = { inner : {} }\nobj.inner.inner2 = { Fun : function() { } }\nnew obj", "obj");
		testProposals(results, [
			["obj.inner.inner2.Fun()", "obj.inner.inner2.Fun() : obj.inner.inner2.Fun"],
			["Object([val])", "Object([val]) : Object"],
			["obj", "obj : {inner:{inner2:{...}}}"]
		]);
	};

	// assign to another---should only have one proposal since we don't change the type name
	tests["test dotted constructor7"] = function() {
		var results = computeContentAssist(
			"var obj = { inner : { Fun : function() { }  } }\n" +
			"var other = obj\n" +
			"new other.inner", "inner");
		testProposals(results, [
			["inner", "inner : {Fun:function(new:obj.inner.Fun):obj.inner.Fun}"]
		]);
	};

	// assign sub-part to another---should only have one proposal since we don't change the type name
	tests["test dotted constructor8"] = function() {
		var results = computeContentAssist(
			"var obj = { inner : { Fun : function() { } } }\n" +
			"var other = obj.inner\n" +
			"new other", "other");
		testProposals(results, [
			["other", "other : {Fun:function(new:obj.inner.Fun):obj.inner.Fun}"]
		]);
	};

	// overloaded constructors
	tests["test dotted constructor9"] = function() {
		var results = computeContentAssist(
			"var obj = { Fun : function() { this.yy1 = 9; } }\n" +
			"var obj2 = { Fun : function() { this.yy2 = 9; } }\n" +
			"var xxx = new obj.Fun();\n" +
			"xxx.yy", "yy");
		testProposals(results, [
			["yy1", "yy1 : Number"]
		]);
	};
	tests["test dotted constructor10"] = function() {
		var results = computeContentAssist(
			"var obj = { Fun : function() { } }\nobj.Fun.prototype = { yy1 : 9};\n" +
			"var obj2 = { Fun : function() { } }\nobj2.Fun.prototype = { yy2 : 9};\n" +
			"var xxx = new obj.Fun();\n" +
			"xxx.yy", "yy");
		testProposals(results, [
			["yy1", "yy1 : Number"]
		]);
	};

	// constructor declared inside a function should not be available externally
	tests["test constructor in function"] = function() {
		var results = computeContentAssist(
			"var obj = function() { var Fn = function() { }; };\n" +
			"new Fn", "Fn");
		testProposals(results, [
		]);
	};

	// TODO FIXADE this is wrong, but we're still going to test it
	// constructor declared as a member available in global scope
	tests["test constructor in constructor BAD"] = function() {
		var results = computeContentAssist(
			"var obj = function() { this.Fn = function() { }; };\n" +
			"new Fn", "Fn");
		testProposals(results, [
			["Fn()", "Fn() : obj.Fn"]
		]);
	};

	// Not ideal, but a constructor being used from a constructed object is not dotted, but should be
	tests["test constructor in constructor Not Ideal"] = function() {
		var results = computeContentAssist(
			"function Fun() { this.Inner = function() { }}\n" +
			"var f = new Fun()\n" +
			"new f.Inner", "Inner");
		testProposals(results, [
			// should be Fun.Inner, but is not
			["Inner()", "Inner() : Inner"]
		]);
	};




	// should not be able to redefine or add to global types
	tests["test global redefine1"] = function() {
		var results = computeContentAssist(
			"this.JSON = {};\n" +
			"JSON.st", "st");
		testProposals(results, [
			["stringify(json)", "stringify(json) : String"]
		]);
	};
	// should not be able to redefine or add to global types
	tests["test global redefine2"] = function() {
		var results = computeContentAssist(
			"this.JSON.stFOO;\n" +
			"JSON.st", "st");
		testProposals(results, [
			["stringify(json)", "stringify(json) : String"]
		]);
	};

	// browser awareness
	tests["test browser1"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			"thi", "thi"
		);
		testProposals(results, [
			["this", "this : Window"]
		]);
	};

	tests["test browser2"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:false*/\n" +
			"thi", "thi"
		);
		testProposals(results, [
			["this", "this : Global"]
		]);
	};

	// regular stuff should still work in the browser
	tests["test browser3"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			"JSON.st", "st");
		testProposals(results, [
			["stringify(json)", "stringify(json) : String"]
		]);
	};

	tests["test browser4"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			"locatio", "locatio"
		);
		testProposals(results, [
			["location", "location : Location"],
			["locationbar", "locationbar : BarInfo"]
		]);
	};

	tests["test browser5"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			// should not be able to set a default property
			"location = 5\n" +
			"locatio", "locatio"
		);
		testProposals(results, [
			["location", "location : Location"],
			["locationbar", "locationbar : BarInfo"]
		]);
	};

	tests["test browser6"] = function() {
		var results = computeContentAssist(
			"/*global location*/\n" +
			"/*jslint browser:true*/\n" +
			"locatio", "locatio"
		);
		testProposals(results, [
			["location", "location : Location"],
			["locationbar", "locationbar : BarInfo"]
		]);
	};

	tests["test browser7"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			"window.xx = 9;\nx", "x"
		);
		testProposals(results, [
			["XMLHttpRequest()", "XMLHttpRequest() : XMLHttpRequest"],
			["xx", "xx : Number"]
		]);
	};

	tests["test browser8"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			"var xx = 9;\nwindow.x", "x"
		);
		testProposals(results, [
			["XMLHttpRequest()", "XMLHttpRequest() : XMLHttpRequest"],
			["xx", "xx : Number"]
		]);
	};

	tests["test browser9"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			"var xx = 9;\nthis.x", "x"
		);
		testProposals(results, [
			["XMLHttpRequest()", "XMLHttpRequest() : XMLHttpRequest"],
			["xx", "xx : Number"]
		]);
	};

	tests["test browser10"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			"thi", "thi"
		);
		testProposals(results, [
			["this", "this : Window"]
		]);
	};

	// browser takes higher precedence than node
	tests["test browser11"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true node:true*/\n" +
			"thi", "thi"
		);
		testProposals(results, [
			["this", "this : Window"]
		]);
	};

	// browser takes higher precedence than node
	tests["test browser12"] = function() {
		var results = computeContentAssist(
			"/*jslint node:true browser:true */\n" +
			"thi", "thi"
		);
		testProposals(results, [
			["this", "this : Window"]
		]);
	};

	// configuration from lint options
	tests["test browser13"] = function() {
		var results = computeContentAssist(
			"thi", "thi", null, {options:{browser:true}}
		);
		testProposals(results, [
			["this", "this : Window"]
		]);
	};


	// configuration from lint options overridden by options
	tests["test browser13"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:false */\n" +
			"thi", "thi", null, {options:{browser:true}}
		);
		testProposals(results, [
			["this", "this : Global"]
		]);
	};



	// Node awareness
	tests["test node1"] = function() {
		var results = computeContentAssist(
			"/*jslint node:true*/\n" +
			"thi", "thi"
		);
		testProposals(results, [
			["this", "this : Module"]
		]);
	};

	tests["test node2"] = function() {
		var results = computeContentAssist(
			"/*jslint node:true*/\n" +
			"process", "process"
		);
		testProposals(results, [
			["process", "process : Process"]
		]);
	};

	tests["test node3"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:false node:true*/\n" +
			"thi", "thi"
		);
		testProposals(results, [
			["this", "this : Module"]
		]);
	};

	tests["test node4"] = function() {
		var results = computeContentAssist(
			"/*jslint node:false*/\n" +
			"thi", "thi"
		);
		testProposals(results, [
			["this", "this : Global"]
		]);
	};


	tests["test node5"] = function() {
		var results = computeContentAssist(
			"/*jslint node:false*/\n" +
			"var stream = require('stream');\n" +
			"var s = new stream.Stream();\n" +
			"s.foo = 9;\n" +
			"s.foo", "foo"
		);
		testProposals(results, [
		]);
	};

	// just checking that our regex works
	tests["test node6"] = function() {
		var results = computeContentAssist(
			"/*jslint node: xxx true*/\n" +
			"thi", "thi"
		);
		testProposals(results, [
			["this", "this : Global"]
		]);
	};

	// just checking that our regex works
	tests["test node7"] = function() {
		var results = computeContentAssist(
			"/*jslint node  xxxx : true*/\n" +
			"thi", "thi"
		);
		testProposals(results, [
			["this", "this : Global"]
		]);
	};

	// configuration from .scripted
	tests["test node8"] = function() {
		var results = computeContentAssist(
			"thi", "thi", null, {options:{node:true}}
		);
		testProposals(results, [
			["this", "this : Module"]
		]);
	};

	// configuration from .scripted is overridden by in file comments
	tests["test node9"] = function() {
		var results = computeContentAssist(
			"/*jslint node:false*/\n" +
			"thi", "thi", null, {options:{node:true}}
		);
		testProposals(results, [
			["this", "this : Global"]
		]);
	};

	// configuration from .scripted is overridden by in file comments
	tests["test node10"] = function() {
		var results = computeContentAssist(
			"/*jslint node:true*/\n" +
			"thi", "thi", null, {options:{browser:true}}
		);
		testProposals(results, [
			["this", "this : Module"]
		]);
	};

	// configuration from .scripted is overridden by in file comments
	tests["test node11"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true*/\n" +
			"thi", "thi", null, {options:{node:true}}
		);
		testProposals(results, [
			["this", "this : Window"]
		]);
	};


	////////////////////////////////////////
	// jsdoc tests
	////////////////////////////////////////
	if (!doctrine.isStub) {
		// the basics
		tests["test simple jsdoc1"] = function() {
			var results = computeContentAssist(
				"/** @type Number*/\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : Number"]
			]);
		};

		tests["test simple jsdoc2"] = function() {
			var results = computeContentAssist(
				"/** @type String*/\n" +
				"/** @type Number*/\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : Number"]
			]);
		};

		tests["test simple jsdoc3"] = function() {
			var results = computeContentAssist(
				"/** @type Number*/\n" +
				"/* @type String*/\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : Number"]
			]);
		};

		tests["test simple jsdoc4"] = function() {
			var results = computeContentAssist(
				"/** @type Number*/\n" +
				"// @type String\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : Number"]
			]);
		};

		// This is actually a bug.  We incorrectly recognize //* comments as jsdoc coments
		tests["test simple jsdoc5"] = function() {
			var results = computeContentAssist(
				"/** @type Number*/\n" +
				"//* @type String\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : String"]
			]);
		};

		tests["test simple jsdoc6"] = function() {
			var results = computeContentAssist(
				"/** @type String*/\n" +
				"var yy;\n" +
				"/** @type Number*/\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : Number"]
			]);
		};

		tests["test simple jsdoc7"] = function() {
			var results = computeContentAssist(
				"/** @type String*/" +
				"var yy;" +
				"/** @type Number*/" +
				"var xx;x", "x"
			);
			testProposals(results, [
				["xx", "xx : Number"]
			]);
		};

		tests["test simple jsdoc8"] = function() {
			var results = computeContentAssist(
				"/** @returns String\n@type Number*/\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : Number"]
			]);
		};

		tests["test simple jsdoc9"] = function() {
			var results = computeContentAssist(
				"/** @param String f\n@type Number*/\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : Number"]
			]);
		};

		tests["test simple jsdoc10"] = function() {
			var results = computeContentAssist(
				"/** @return Number*/\n" +
				"var xx = function() { };\nx", "x"
			);
			testProposals(results, [
				["xx()", "xx() : Number"]
			]);
		};

		tests["test simple jsdoc11"] = function() {
			var results = computeContentAssist(
				"/** @type String\n@return Number*/\n" +
				"var xx = function() { };\nx", "x"
			);
			testProposals(results, [
				["xx()", "xx() : Number"]
			]);
		};

		// @type overrides @return
		tests["test simple jsdoc12"] = function() {
			var results = computeContentAssist(
				"var xx;\n" +
				"/** @type String\n@return Number*/\n" +
				"xx = function() { };\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : String"]
			]);
		};

		// @type overrides @return
		tests["test simple jsdoc13"] = function() {
			var results = computeContentAssist(
				"var xx;\n" +
				"/** @type String\n@param Number ss*/\n" +
				"xx = function(ss) { s/**/ };", "s"
			);
			testProposals(results, [
				["ss", "ss : {}"]
			]);
		};

		tests["test simple jsdoc14"] = function() {
			var results = computeContentAssist(
				"var xx;\n" +
				"/** @return Number*/\n" +
				"xx = function() { };\nx", "x"
			);
			testProposals(results, [
				["xx()", "xx : String"]
			]);
		};

		tests["test simple jsdoc15"] = function() {
			var results = computeContentAssist(
				"var xx;\n" +
				"/** @param Number ss\n@return String*/\n" +
				"xx = function(ss) { s/**/ };", "s"
			);
			testProposals(results, [
				["ss", "ss : {}"]
			]);
		};

		tests["test simple jsdoc14"] = function() {
			var results = computeContentAssist(
				"/** @type Number*/\n" +
				"var xx;\n" +
				"/** @type String*/\n" +
				"xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : Number"]
			]);
		};

		// the complex types tag
		tests["test type union jsdoc1"] = function() {
			var results = computeContentAssist(
				"/** @type {String|Number}*/\n" +
				"var xx;\nx", "x"
			);
			// for union types, we arbitrarily choose the first type
			testProposals(results, [
				["xx", "xx : (String|Number)"]
			]);
		};

		tests["test type nullable jsdoc1"] = function() {
			var results = computeContentAssist(
				"/** @type {?String}*/\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : ?String"]
			]);
		};

		tests["test type non-nullable jsdoc1"] = function() {
			var results = computeContentAssist(
				"/** @type {!String}*/\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : !String"]
			]);
		};

		tests["test type array jsdoc1"] = function() {
			var results = computeContentAssist(
				"/** @type {[]}*/\n" +
				"var xx;\nx", "x"
			);
			testProposals(results, [
				["xx", "xx : []"]
			]);
		};

		tests["test type parameterized jsdoc1"] = function() {
			var results = computeContentAssist(
				"/** @type {Array.<String>}*/\n" +
				"var xx;\nx", "x"
			);
			// currently, we just ignore parameterization
			testProposals(results, [
				["xx", "xx : Array.<String>"]
			]);
		};
		tests["test type parameterized jsdoc1a"] = function() {
			var results = computeContentAssist(
				"/** @type {[String]}*/\n" +
				"var xx;\nx", "x"
			);
			// currently, we just ignore parameterization
			testProposals(results, [
				["xx", "xx : [String]"]
			]);
		};

		tests["test type record jsdoc1"] = function() {
			var results = computeContentAssist(
				"/** @type {{foo}}*/\n" +
				"var xx;\nxx.fo", "fo"
			);
			testProposals(results, [
				["foo", "foo : Object"]
			]);
		};

		tests["test type record jsdoc2"] = function() {
			var results = computeContentAssist(
				"/** @type {{foo:String}}*/\n" +
				"var xx;\nxx.fo", "fo"
			);
			testProposals(results, [
				["foo", "foo : String"]
			]);
		};

		tests["test type record jsdoc3"] = function() {
			var results = computeContentAssist(
				"/** @type {{foo:string,foo2:number}}*/\n" +
				"var xx;\nxx.fo", "fo"
			);
			testProposals(results, [
				["foo", "foo : String"],
				["foo2", "foo2 : Number"]
			]);
		};

		tests["test type record jsdoc4"] = function() {
			var results = computeContentAssist(
				"/** @type {{foo:{foo2:number}}}*/\n" +
				"var xx;\nxx.foo.fo", "fo"
			);
			testProposals(results, [
				["foo2", "foo2 : Number"]
			]);
		};

		tests["test type record jsdoc5"] = function() {
			var results = computeContentAssist(
				"function Flart() { this.xx = 9; }\n" +
				"/** @type {{foo:{foo2:Flart}}}*/\n" +
				"var xx;\nxx.foo.foo2.x", "x"
			);
			testProposals(results, [
				["xx", "xx : Number"]
			]);
		};

		tests["test type record jsdoc6"] = function() {
			var results = computeContentAssist(
				"/** @type {{foo:{foo:function()}}}*/\n" +
				"var xx;\nxx.foo.foo", "foo"
			);
			testProposals(results, [
				["foo()", "foo() : undefined"]
			]);
		};

		tests["test type record jsdoc7"] = function() {
			var results = computeContentAssist(
				"/** @type {{foo:{foo:function(a:String,b:Number)}}}*/\n" +
				"var xx;\nxx.foo.foo", "foo"
			);
			testProposals(results, [
				["foo(a, b)", "foo(a, b) : undefined"]
			]);
		};

		tests["test type record jsdoc8"] = function() {
			var results = computeContentAssist(
				"/** @type {{foo:{foo:function(a:String,b:Number):Number}}}*/\n" +
				"var xx;\nxx.foo.foo", "foo"
			);
			testProposals(results, [
				["foo(a, b)", "foo(a, b) : Number"]
			]);
		};

		tests["test type record jsdoc9"] = function() {
			var results = computeContentAssist(
				"/** @type {{foo:{foo:function(a:String,b:Number):{len:Number}}}}*/\n" +
				"var xx;\nxx.foo.foo", "foo"
			);
			testProposals(results, [
				["foo(a, b)", "foo(a, b) : {len:Number}"]
			]);
		};

		tests["test type record jsdoc10"] = function() {
			var results = computeContentAssist(
				"/** @type {{foo:function(a:String,b:Number):{len:function():Number}}}*/\n" +
				"var xx;\nxx.foo().le", "le"
			);
			testProposals(results, [
				["len()", "len() : Number"]
			]);
		};

		tests["test type record jsdoc11"] = function() {
			var results = computeContentAssist(
				"/** @type {{foo:function():IDontExist}}*/\n" +
				"var xx;\nxx.fo", "fo"
			);
			testProposals(results, [
				["foo()", "foo() : Object"]
			]);
		};

		tests["test type record jsdoc12"] = function() {
			var results = computeContentAssist(
				"var Flart = function() {}" +
				"/** @type {{foo:function(new:Flart):Number}}*/\n" +
				"var xx;\nxx.fo", "fo"
			);
			testProposals(results, [
				// should we be returning Flart here???
//				["foo()", "foo() : Flart"]
				["foo()", "foo() : Number"]
			]);
		};

		// the param tag
		tests["test param jsdoc1"] = function() {
			var results = computeContentAssist(
				"/** @param {String} xx1\n@param {Number} xx2 */" +
				"var flart = function(xx1,xx2) { xx/**/ }",
				"xx");
			testProposals(results, [
				["xx1", "xx1 : String"],
				["xx2", "xx2 : Number"]
			]);
		};

		tests["test param jsdoc2"] = function() {
			var results = computeContentAssist(
				"/** @param {Number} xx2\n@param {String} xx1\n */" +
				"var flart = function(xx1,xx2) { xx/**/ }",
				"xx");
			testProposals(results, [
				["xx1", "xx1 : String"],
				["xx2", "xx2 : Number"]
			]);
		};

		tests["test param jsdoc3"] = function() {
			var results = computeContentAssist(
				"/** @param {function(String,Number):Number} xx2\n */" +
				"var flart = function(xx1,xx2) { xx/**/ }",
				"xx");
			testProposals(results, [
				["xx2(String, Number)", "xx2(String, Number) : Number"],
				["xx1", "xx1 : {}"]
			]);
		};

		tests["test param jsdoc4"] = function() {
			var results = computeContentAssist(
				"/** @param {function(a:String,Number):Number} xx2\n */" +
				"var flart = function(xx1,xx2) { xx/**/ }",
				"xx");
			testProposals(results, [
				["xx2(a, Number)", "xx2(a, Number) : Number"],
				["xx1", "xx1 : {}"]
			]);
		};

		tests["test param jsdoc5"] = function() {
			var results = computeContentAssist(
				"/** @param {function(a:String,?Number):Number} xx2\n */" +
				"var flart = function(xx1,xx2) { xx/**/ }",
				"xx");
			testProposals(results, [
				["xx2(a, arg1)", "xx2(a, arg1) : Number"],
				["xx1", "xx1 : {}"]
			]);
		};

		// the return tag
		tests["test return jsdoc1"] = function() {
			var results = computeContentAssist(
				"/** @return {function(a:String,?Number):Number} xx2\n */" +
				"var flart = function(xx1,xx2) { }\nflar",
				"flar");
			// hmmmm... functions returning functions not really showing up
			testProposals(results, [
				["flart(xx1, xx2)", "flart(xx1, xx2) : function(a:String,?Number):Number"]
			]);
		};

		tests["test return jsdoc2"] = function() {
			var results = computeContentAssist(
				"/** @return {function(String):Number} xx2\n */" +
				"var flart = function(xx1,xx2) { }\n" +
				"var other = flart();\noth", "oth");
			testProposals(results, [
				["other(String)", "other(String) : Number"]
			]);
		};

		// reassignment
		tests["test reassignment jsdoc1"] = function() {
			var results = computeContentAssist(
				"/** @type {Number} xx2\n */" +
				"var flar = '';\n" +
				"fla", "fla");
			testProposals(results, [
				["flar", "flar : Number"]
			]);
		};

		// TODO this one is an open question.  Should we allow reassignment of
		// explicitly typed variables and parameters?  Currently, we do.
		tests["test reassignment jsdoc2"] = function() {
			var results = computeContentAssist(
				"/** @type {Number} xx2\n */" +
				"var flar;\n" +
				"flar = '';\n" +
				"fla", "fla");
			testProposals(results, [
				["flar", "flar : String"]
			]);
		};

		// reassignment shouldn't happen here since uninteresting type is being assigned
		tests["test reassignment jsdoc3"] = function() {
			var results = computeContentAssist(
				"/** @type {Number} xx2\n */" +
				"var flar;\n" +
				"flar = iDontKnow();\n" +
				"fla", "fla");
			testProposals(results, [
				["flar", "flar : Number"]
			]);
		};

		// SCRIPTED-138 jsdoc support for functions parameters that are in object literals
		tests["test object literal fn param jsdoc1"] = function() {
			var results = computeContentAssist(
				"var obj = {\n" +
				"  /** @param {String} foo */\n" +
				"  fun : function(foo) { foo/**/ }\n" +
				"}", "foo");
			testProposals(results, [
				["foo", "foo : String"]
			]);
		};
		tests["test object literal type jsdoc1"] = function() {
			var results = computeContentAssist(
				"var obj = {\n" +
				"  /** @type {String} foo */\n" +
				"  foo : undefined\n" +
				"};\n" +
				"obj.foo", "foo");
			testProposals(results, [
				["foo", "foo : String"]
			]);
		};
		tests["test object literal fn return jsdoc1"] = function() {
			var results = computeContentAssist(
				"var foo = {\n" +
				"  /** @return {String} foo */\n" +
				"  fun : function(foo) { }\n" +
				"}\n" +
				"var res = foo.fun();\n" +
				"res", "res");
			testProposals(results, [
				["res", "res : String"]
			]);
		};

		tests["test dotted constructor jsdoc type 1"] = function() {
			var results = computeContentAssist(
				"var obj = { Fun : function() {} };\n" +
				"/** @type obj.Fun */ var xxx;\nxx", "xx");
			testProposals(results, [
				["xxx", "xxx : obj.Fun"]
			]);
		};
		tests["test dotted constructor jsdoc type 2"] = function() {
			var results = computeContentAssist(
				"var obj = { Fun : function() { this.yyy = 9; } };\n" +
				"/** @type obj.Fun */ var xxx;\nxxx.yy", "yy");
			testProposals(results, [
				["yyy", "yyy : Number"]
			]);
		};

		// arrays and array types
		tests["test array type1"] = function() {
			var results = computeContentAssist(
				"/** @type [Number] */ var xxx;\nxxx[0].toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};
		tests["test array type2"] = function() {
			var results = computeContentAssist(
				// ignoring the second type
				"/** @type [Number,String] */ var xxx;\nxxx[0].toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};
		tests["test array type3"] = function() {
			var results = computeContentAssist(
				// ignoring the second type
				"/** @type Array.<Number> */ var xxx;\nxxx[0].toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};
		tests["test array type3a"] = function() {
			var results = computeContentAssist(
				// ignoring the second type
				"/** @type [Number] */ var xxx;\nxxx[0].toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};
		tests["test array type4"] = function() {
			var results = computeContentAssist(
				// ignoring the second type
				"/** @type Array.<{foo:Number}> */ var xxx;\nxxx[0].foo.toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};
		tests["test array type5"] = function() {
			var results = computeContentAssist(
				// ignoring the second type
				"/** @type Array.<Array.<Number>> */ var xxx;\nxxx[0][0].toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};
		tests["test array type6"] = function() {
			var results = computeContentAssist(
				// ignoring the second type
				"/** @type Array.<Array.<Array.<Number>>> */ var xxx;\nxxx[0][0][bar].toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};
		tests["test array type7"] = function() {
			var results = computeContentAssist(
				// ignoring the second type
				"/** @type {...Number} */ var xxx;\nxxx[0].toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};
		tests["test array type8"] = function() {
			var results = computeContentAssist(
				// ignoring the second type
				"/** @type {...Array.<Number>} */ var xxx;\nxxx[0][0].toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};

		tests["test jsdoc on property decl1"] = function() {
			var results = computeContentAssist(
				"var jjj = {};/** @type {Number} */\n" +
				"jjj.x = '';x.toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};
		tests["test jsdoc on property decl2"] = function() {
			var results = computeContentAssist(
				"var jjj = {x:false};/** @type {Number} */\n" +
				"jjj.x = '';x.toF", "toF");
			testProposals(results, [
				["toFixed(digits)", "toFixed(digits) : String"]
			]);
		};
	}

	/////////////////////////////////////
	// various tests for reassignment
	// reassignments are only performed
	// if the new type is not less general
	// than the old type
	/////////////////////////////////////
	/*
	 undefined -> Object yes
	 undefined -> { } yes
	 undefined -> {a} yes
	 undefined -> any yes

	 Object -> undefined no
	 Object -> { } yes
	 Object -> {a} yes
	 Object -> any yes

	 { } -> undefined no
	 { } -> Object no
	 { } -> {a} yes
	 { } -> any yes

	 {a} -> undefined no
	 {a} -> Object no
	 {a} -> { } no
	 {a} -> any yes

	 any -> undefined no
	 any -> Object no
	 any -> { } no
	 any -> {a} yes
	*/

	//undefined
	tests["test reassignment undef->Obj"] = function() {
		var results = computeContentAssist(
			"var v = { a : undefined };\n" +
			"v.a = new Object();\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : Object"]
		]);
	};
	tests["test reassignment undef->{ }"] = function() {
		var results = computeContentAssist(
			"var v = { a : undefined };\n" +
			"v.a = { };\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {}"]
		]);
	};
	tests["test reassignment undef->{a}"] = function() {
		var results = computeContentAssist(
			"var v = { a : undefined };\n" +
			"v.a = { a: 9 };\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {a:Number}"]
		]);
	};
	tests["test reassignment undef->any"] = function() {
		var results = computeContentAssist(
			"var v = { a : undefined };\n" +
			"v.a = 9;\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : Number"]
		]);
	};

	// Obj
	tests["test reassignment obj->undefined"] = function() {
		var results = computeContentAssist(
			"var v = { a : new Object() };\n" +
			"v.a = undefined;\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : Object"]
		]);
	};
	tests["test reassignment obj->{ }"] = function() {
		var results = computeContentAssist(
			"var v = { a : new Object() };\n" +
			"v.a = { };\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {}"]
		]);
	};
	tests["test reassignment obj->{a}"] = function() {
		var results = computeContentAssist(
			"var v = { a : new Object() };\n" +
			"v.a = { a: 9 };\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {a:Number}"]
		]);
	};
	tests["test reassignment obj->any"] = function() {
		var results = computeContentAssist(
			"var v = { a : new Object() };\n" +
			"v.a = 9;\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : Number"]
		]);
	};

	// { }
	tests["test reassignment { }->undefined"] = function() {
		var results = computeContentAssist(
			"var v = { a : { } };\n" +
			"v.a = undefined;\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {}"]
		]);
	};
	tests["test reassignment { }->obj"] = function() {
		var results = computeContentAssist(
			"var v = { a : { } };\n" +
			"v.a = new Object();\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {}"]
		]);
	};
	tests["test reassignment { }->{a}"] = function() {
		var results = computeContentAssist(
			"var v = { a : { } };\n" +
			"v.a = { a: 9 };\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {a:Number}"]
		]);
	};
	tests["test reassignment { }->any"] = function() {
		var results = computeContentAssist(
			"var v = { a : { } };\n" +
			"v.a = 9;\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : Number"]
		]);
	};

	// {a}
	tests["test reassignment {a}->undefined"] = function() {
		var results = computeContentAssist(
			"var v = { a : { a:9 } };\n" +
			"v.a = undefined;\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {a:Number}"]
		]);
	};
	tests["test reassignment {a}->obj"] = function() {
		var results = computeContentAssist(
			"var v = { a : {a:9 } };\n" +
			"v.a = new Object();\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {a:Number}"]
		]);
	};
	tests["test reassignment {a}->{ }"] = function() {
		var results = computeContentAssist(
			"var v = { a : {a:9} };\n" +
			"v.a = { };\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {a:Number}"]
		]);
	};
	tests["test reassignment {a}->{a}"] = function() {
		var results = computeContentAssist(
			"var v = { a : {a:9} };\n" +
			"v.a = {b:9};\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {b:Number}"]
		]);
	};
	tests["test reassignment {a}->any"] = function() {
		var results = computeContentAssist(
			"var v = { a : {a:9} };\n" +
			"v.a = 9;\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : Number"]
		]);
	};

	// any
	tests["test reassignment any->undefined"] = function() {
		var results = computeContentAssist(
			"var v = { a : 9 };\n" +
			"v.a = undefined;\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : Number"]
		]);
	};
	tests["test reassignment any->obj"] = function() {
		var results = computeContentAssist(
			"var v = { a : 9 };\n" +
			"v.a = new Object();\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : Number"]
		]);
	};
	tests["test reassignment any->{ }"] = function() {
		var results = computeContentAssist(
			"var v = { a : 9 };\n" +
			"v.a = { };\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : Number"]
		]);
	};
	tests["test reassignment any->{a}"] = function() {
		var results = computeContentAssist(
			"var v = { a : {a:9} };\n" +
			"v.a = { a: 9};\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : {a:Number}"]
		]);
	};
	tests["test reassignment any->any"] = function() {
		var results = computeContentAssist(
			"var v = { a : {a:9} };\n" +
			"v.a = '';\n" +
			"v.a", "a");
		testProposals(results, [
			["a", "a : String"]
		]);
	};

	///////////////////////////////////////////////////
	// testing default jslint options
	///////////////////////////////////////////////////
	var jsOptionsBrowser = {"options": { "browser": true }};
	var jsOptionsNoBrowser = {"options": { "browser": false }};
	var jsOptions1Global = {"global": [ "aaa" ]};
	var jsOptions2Globals = {"global": [ "aaa", "aab"]};
	var jsOptionsAndGlobals = {"global": [ "aaa", "aab"], "options": { "browser": true }};

	tests["test browser:true in options"] = function() {
		var results = computeContentAssist(
			"wind", "wind", null, jsOptionsBrowser);
		testProposals(results, [
			["window", "window : Window"]
		]);
	};

	tests["test browser:false in options"] = function() {
		var results = computeContentAssist(
			"wind", "wind", null, jsOptionsNoBrowser);
		testProposals(results, [
		]);
	};

	tests["test browser:true in options overriden by browser:false in text"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:false */\nwind", "wind", null, jsOptionsBrowser);
		testProposals(results, [
		]);
	};

	tests["test browser:false in options overriden by browser:true in text"] = function() {
		var results = computeContentAssist(
			"/*jslint browser:true */\nwind", "wind", null, jsOptionsNoBrowser);
		testProposals(results, [
			["window", "window : Window"]
		]);
	};

	tests["test 1 global in options"] = function() {
		var results = computeContentAssist(
			"aa", "aa", null, jsOptions1Global);
		testProposals(results, [
			["aaa", "aaa : {}"]
		]);
	};

	tests["test 2 globals in options"] = function() {
		var results = computeContentAssist(
			"aa", "aa", null, jsOptions2Globals);
		testProposals(results, [
			["aaa", "aaa : {}"],
			["aab", "aab : {}"]
		]);
	};

	tests["test 2 globals in options and in text"] = function() {
		var results = computeContentAssist(
			"/*global aac */\naa", "aa", null, jsOptions2Globals);
		testProposals(results, [
			["aaa", "aaa : {}"],
			["aab", "aab : {}"],
			["aac", "aac : {}"]
		]);
	};

	tests["test globals and browser1"] = function() {
		var results = computeContentAssist(
			"aa", "aa", null, jsOptionsAndGlobals);
		testProposals(results, [
			["aaa", "aaa : {}"],
			["aab", "aab : {}"]
		]);
	};

	tests["test globals and browser2"] = function() {
		var results = computeContentAssist(
			"wind", "wind", null, jsOptionsAndGlobals);
		testProposals(results, [
			["window", "window : Window"]
		]);
	};

	// SCRIPTED-100
	tests["test obj literal with underscore"] = function() {
		var results = computeContentAssist(
			"var obj = { _myFun : function() { this._/**/ } }", "_");

		testProposals("_", results, [
			// inferred as object type since invocation request is happening inside of object literal.
			["_myFun", "_myFun : Object"]
		]);
	};

	// SCRIPTED-170
	tests["test obj literal with underscore"] = function() {
		var results = computeContentAssist(
			"function hasOwnProperty() { }\n" +
			"({}).hasOwnProperty();");
		testProposals(results, [
			["Array([val])", "Array([val]) : Array"],
			["Boolean([val])", "Boolean([val]) : Boolean"],
			["Date([val])", "Date([val]) : Date"],
			["decodeURI(uri)", "decodeURI(uri) : String"],
			["decodeURIComponent(encodedURIString)", "decodeURIComponent(encodedURIString) : String"],
			["encodeURI(uri)", "encodeURI(uri) : String"],
			["encodeURIComponent(decodedURIString)", "encodeURIComponent(decodedURIString) : String"],
			["Error([err])", "Error([err]) : Error"],
			["eval(toEval)", "eval(toEval) : Object"],
			["Function()", "Function() : Function"],
			["isFinite(num)", "isFinite(num) : Boolean"],
			["isNaN(num)", "isNaN(num) : Boolean"],
			["Number([val])", "Number([val]) : Number"],
			["Object([val])", "Object([val]) : Object"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number"],
			["RegExp([val])", "RegExp([val]) : RegExp"],
			["Infinity", "Infinity : Number"],
			["JSON", "JSON : JSON"],
			["Math", "Math : Math"],
			["NaN", "NaN : Number"],
			["this", "this : Global"],
			["undefined", "undefined : undefined"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};

	// computed member expressions
	tests["test computed member expressions1"] = function() {
		var results = computeContentAssist(
			"var foo = { at: { bar: 0} };\n" +
			"foo['at'].b", "b");
		testProposals(results, [
			["bar", "bar : Number"]
		]);
	};

	tests["test computed member expressions2"] = function() {
		var results = computeContentAssist(
			"var foo = { at: { bar: 0} };\n" +
			"foo[at].b", "b");
		testProposals(results, [
		]);
	};

	tests["test computed member expressions3"] = function() {
		var results = computeContentAssist(
			"var foo = { at: { bar: 0} };\n" +
			"foo[9].at.bar.toF", "toF");
		testProposals(results, [
		]);
	};

	tests["test computed member expressions4"] = function() {
		var results = computeContentAssist(
			"var foo = { at: { bar: 0} };\n" +
			"foo['at'].bar.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	tests["test computed member expressions5"] = function() {
		var results = computeContentAssist(
			"var foo = { at: { bar: 0} };\n" +
			"foo[at.foo.bar].");
		testProposals(results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};

	tests["test computed member expressions6"] = function() {
		var results = computeContentAssist(
			"var x = 0;\n" +
			"var foo = [];\n" +
			"foo[x./**/]");
		testProposals(results, [
			["toExponential(digits)", "toExponential(digits) : String"],
			["toFixed(digits)", "toFixed(digits) : String"],
			["toPrecision(digits)", "toPrecision(digits) : String"],
			["", "---------------------------------"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : Boolean"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : Boolean"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : Boolean"],
			["toLocaleString()", "toLocaleString() : String"],
			["toString()", "toString() : String"],
			["valueOf()", "valueOf() : Object"],
			["prototype", "prototype : Object"]
		]);
	};


	/////////////////////////////////////
	// full file inferencing
	/////////////////////////////////////
	tests["test full file inferecing 1"] = function() {
		var results = computeContentAssist(
			"x/**/;\n" +
			"var x = 0;", "x");
		testProposals(results, [
			["x", "x : Number"]
		]);
	};
	tests["test full file inferecing 2"] = function() {
		var results = computeContentAssist(
			"function a() { x/**/; }\n" +
			"var x = 0;", "x");
		testProposals(results, [
			["x", "x : Number"]
		]);
	};
	tests["test full file inferecing 3"] = function() {
		var results = computeContentAssist(
			"function a() { var y = x; y/**/}\n" +
			"var x = 0;", "y");
		testProposals(results, [
			["y", "y : Number"]
		]);
	};
	tests["test full file inferecing 4"] = function() {
		var results = computeContentAssist(
			"function a() { var y = x.fff; y/**/}\n" +
			"var x = { fff : 0 };", "y");
		testProposals(results, [
			["y", "y : Number"]
		]);
	};
	tests["test full file inferecing 5"] = function() {
		var results = computeContentAssist(
			"function a() { var y = x.fff; y/**/}\n" +
			"var x = {};\n" +
			"x.fff = 8;", "y");
		testProposals(results, [
			["y", "y : Number"]
		]);
	};
	tests["test full file inferecing 6"] = function() {
		var results = computeContentAssist(
			"function a() { x.fff = ''; var y = x.fff; y/**/}\n" +
			"var x = {};\n" +
			"x.fff = 8;", "y");
		testProposals(results, [
			["y", "y : String"]
		]);
	};
	tests["test full file inferecing 7"] = function() {
		var results = computeContentAssist(
			"function a() { x.fff = ''; var y = x(); y/**/}\n" +
			"var x = function() { return 8; }", "y");
		testProposals(results, [
			["y", "y : Number"]
		]);
	};
	tests["test full file inferecing 8"] = function() {
		var results = computeContentAssist(
			"function a() { x.fff = ''; var y = z(); y/**/}\n" +
			"var x = function() { return 8; }, z = x", "y");
		testProposals(results, [
			["y", "y : Number"]
		]);
	};

	tests["test full file inferecing 9"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  function b() {\n" +
			"    x.fff = '';\n" +
			"  }\n" +
			"  x.f/**/\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};
	tests["test full file inferecing 10"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  function b() {\n" +
			"    x.fff = '';\n" +
			"  }\n" +
			"  var y = x;\n" +
			"  y.f/**/\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 11a"] = function() {
		var results = computeContentAssist(
			"var x = {};\n" +
			"function a() {\n" +
			"  var y = x;\n" +
			"  y.f/**/\n" +
			"  function b() {\n" +
			"    x.fff = '';\n" +
			"  }\n" +
			"}", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 11"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  var y = x;\n" +
			"  y.f/**/\n" +
			"  function b() {\n" +
			"    x.fff = '';\n" +
			"  }\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 12"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  var y = x;\n" +
			"  y.f/**/\n" +
			"  x.fff = '';\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 13"] = function() {
		var results = computeContentAssist(
			"function b() {\n" +
			"  x.fff = '';\n" +
			"}\n" +
			"function a() {\n" +
			"  var y = x;\n" +
			"  y.f/**/\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 14"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  var y = x;\n" +
			"  y.f/**/\n" +
			"}\n" +
			"function b() {\n" +
			"  x.fff = '';\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 15"] = function() {
		var results = computeContentAssist(
			"function b() {\n" +
			"  x.fff = '';\n" +
			"}\n" +
			"function a() {\n" +
			"  x.f/**/\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	// should still find the fff property here evem though it
	// is defined after and in another funxtion
	tests["test full file inferecing 16"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  x.f/**/\n" +
			"}\n" +
			"function b() {\n" +
			"  x.fff = '';\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};
	tests["test full file inferecing 17"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  x.f/**/\n" +
			"  function b() {\n" +
			"    x.fff = '';\n" +
			"  }\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 18"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  x.fff = '';\n" +
			"  function b() {\n" +
			"    x.f/**/\n" +
			"  }\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 19"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  function b() {\n" +
			"    x.f/**/\n" +
			"  }\n" +
			"  x.fff = '';\n" +
			"}\n" +
			"var x = {};", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	// don't find anything because assignment is in same scope, but after
	tests["test full file inferecing 20"] = function() {
		var results = computeContentAssist(
			"x./**/\n" +
			"var x = {};\n" +
			"x.fff = '';", "f");
		testProposals(results, [
		]);
	};

	tests["test full file inferecing 21"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"x.fff = '';\n" +
			"}\n" +
			"x./**/\n" +
			"var x = {}; ", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 22"] = function() {
		var results = computeContentAssist(
			"x./**/\n" +
			"function a() {\n" +
			"x.fff = '';\n" +
			"}\n" +
			"var x = {}; ", "f");
		testProposals(results, [
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 23"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  function b() {\n" +
			"    x.f/**/\n" +
			"  }\n" +
			"  x.fff = '';\n" +
			"}\n" +
			"var x = {ff2 : ''};", "f");
		testProposals(results, [
			["ff2", "ff2 : String"],
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 24"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  function b() {\n" +
			"    var y = x;\n" +
			"    y.f/**/\n" +
			"  }\n" +
			"  x.fff = '';\n" +
			"}\n" +
			"var x = {ff2 : ''};", "f");
		testProposals(results, [
			["ff2", "ff2 : String"],
			["fff", "fff : String"]
		]);
	};

	tests["test full file inferecing 25"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  function b() {\n" +
			"    x.f/**/\n" +
			"  }\n" +
			"  var y = x;\n" +
			"  y.fff = '';\n" +
			"}\n" +
			"var x = {ff2 : ''};", "f");
		testProposals(results, [
			["ff2", "ff2 : String"],
			["fff", "fff : String"]
		]);
	};


	tests["test full file inferecing 26"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  function b() {\n" +
			"    var fff = x();\n" +
			"    f/**/;\n" +
			"  }\n" +
			"}\n" +
			"function x() { return ''; }", "f");
		testProposals(results, [
			["fff", "fff : String"],
			["", "---------------------------------"],
			["Function()", "Function() : Function"]
		]);
	};

	// Not inferencing String because function decl comes after reference in same scope
	tests["test full file inferecing 27"] = function() {
		var results = computeContentAssist(
			"var fff = x();\n" +
			"f/**/;\n" +
			"function x() { return ''; }", "f");
		testProposals(results, [
			["Function()", "Function() : Function"],
			["fff", "fff : {}"]
		]);
	};

	// Not gonna work because of recursive
	tests["test full file inferecing 28"] = function() {
		var results = computeContentAssist(
			"function x() {\n" +
			"  var fff = x();\n" +
			"  f/**/;\n" +
			"  return ''; }", "f");
		testProposals(results, [
			["fff", "fff : undefined"],
			["", "---------------------------------"],
			["Function()", "Function() : Function"]
		]);
	};

	tests["test full file inferecing 29"] = function() {
		var results = computeContentAssist(
			"function a() {\n" +
			"  function b() {\n" +
			"    var fff = x();\n" +
			"    f/**/;\n" +
			"  }\n" +
			"}\n" +
			"var x = function() { return ''; }", "f");
		testProposals(results, [
			["fff", "fff : String"],
			["", "---------------------------------"],
			["Function()", "Function() : Function"]
		]);
	};

	// Not working because function decl comes after reference in same scope
	tests["test full file inferecing 30"] = function() {
		var results = computeContentAssist(
			"var fff = x();\n" +
			"f/**/;\n" +
			"var x = function() { return ''; }", "f");
		testProposals(results, [
			["Function()", "Function() : Function"],
			["fff", "fff : {}"]
		]);
	};

	// Not gonna work because of recursive
	tests["test full file inferecing 31"] = function() {
		var results = computeContentAssist(
			"var x = function() { var fff = x();\nf/**/;return ''; }", "f");
		testProposals(results, [
			["fff", "fff : undefined"],
			["", "---------------------------------"],
			["Function()", "Function() : Function"]
		]);
	};

	tests["test full file inferecing 32"] = function() {
		var results = computeContentAssist(
			"x/**/\n" +
			"function x() { return ''; }", "x");
		testProposals(results, [
			["x()", "x() : String"]
		]);
	};

	tests["test full file inferecing 33"] = function() {
		var results = computeContentAssist(
			"var xxx = {\n" +
			"	aaa: '',\n" +
			"	bbb: this.a/**/\n" +
			"};", "a");
		testProposals(results, [
			["aaa", "aaa : String"]
		]);
	};

	tests["test full file inferecing 34"] = function() {
		var results = computeContentAssist(
			"var xxx = {\n" +
			"	bbb: this.a/**/,\n" +
			"	aaa: ''\n" +
			"};", "a");
		testProposals(results, [
			["aaa", "aaa : String"]
		]);
	};

	/////////////////////////////////////
	// property read inferencing
	//
	// tests for property reads
	/////////////////////////////////////
	tests["test property read before"] = function() {
		var results = computeContentAssist(
			"var xxx;\n" +
			"xxx.lll++;\n" +
			"xxx.ll", "ll");
		testProposals(results, [
			["lll", "lll : {}"]
		]);
	};

	tests["test property read after"] = function() {
		var results = computeContentAssist(
			"var xxx;\n" +
			"xxx.ll/**/;\n" +
			"xxx.lll++;", "ll");
		testProposals(results, [
			["lll", "lll : {}"]
		]);
	};

	tests["test property read global before"] = function() {
		var results = computeContentAssist(
			"lll++;\n" +
			"ll", "ll");
		testProposals(results, [
			["lll", "lll : {}"]
		]);
	};

	tests["test property read global after"] = function() {
		var results = computeContentAssist(
			"ll/**/;\n" +
			"lll++;", "ll");
		testProposals(results, [
			["lll", "lll : {}"]
		]);
	};

	/////////////////////////////////////
	// Array parameterization
	/////////////////////////////////////
	tests["test array parameterization1"] = function() {
		var results = computeContentAssist(
			"var x = [1];\n" +
			"x[foo].toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization2"] = function() {
		var results = computeContentAssist(
			"var x = [1];\n" +
			"x[0].toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization3"] = function() {
		var results = computeContentAssist(
			"var x = [1];\n" +
			"x['foo'].toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization4"] = function() {
		var results = computeContentAssist(
			"([1, 0])[0].toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization5"] = function() {
		var results = computeContentAssist(
			"var x = [[1]];\n" +
			"x[0][0].toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization6"] = function() {
		var results = computeContentAssist(
			"var x = [{}];x[0].a = 8;\n" +
			"x[0].a.toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization7"] = function() {
		var results = computeContentAssist(
			"var a = {a : 8}; \n var x = [a];\n" +
			"x[0].a.toFi", "toFi");
			// may not work because a string
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization8"] = function() {
		var results = computeContentAssist(
			"var x = [[1]];\n" +
			"x = x[0];\nx[0].toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization9"] = function() {
		var results = computeContentAssist(
			"var x = [];\n" +
			"x[9] = 0;\nx[0].toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization10"] = function() {
		var results = computeContentAssist(
			"var x = [];\n" +
			"x[9] = '';\nx[9] = 0;\nx[0].toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization11"] = function() {
		var results = computeContentAssist(
			"var x = (function() { return [0]; })();\n" +
			"x[9] = 0;\nx[0].toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};
	tests["test array parameterization10"] = function() {
		var results = computeContentAssist(
			"var x = ['','',''];\n" +
			"x[9] = 0;\nx[0].toFi", "toFi");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : String"]
		]);
	};

	// https://github.com/scripted-editor/scripted/issues/65
	tests["test case insensitive ordering1"] = function() {
		var results = computeContentAssist(
			"var xXXX = 8;\n" +
			"var xXYZ = 8;\n" +
			"var xxxx = 8;\n" +
			"var xxyz = 8;\n" +
			"x", "x");
		testProposals(results, [
			["xXXX", "xXXX : Number"],
			["xxxx", "xxxx : Number"],
			["xXYZ", "xXYZ : Number"],
			["xxyz", "xxyz : Number"]
		]);
	};
	// https://github.com/scripted-editor/scripted/issues/65
	tests["test case insensitive ordering2"] = function() {
		var results = computeContentAssist(
			"var xXYZ = 8;\n" +
			"var xxxx = 8;\n" +
			"var xXXX = 8;\n" +
			"var xxyz = 8;\n" +
			"x", "x");
		testProposals(results, [
			["xxxx", "xxxx : Number"],
			["xXXX", "xXXX : Number"],
			["xXYZ", "xXYZ : Number"],
			["xxyz", "xxyz : Number"]
		]);
	};

	// https://github.com/scripted-editor/scripted/issues/65
	tests["test loosely match 1"] = function() {
		var results = computeContentAssist(
			"var getAnotherThing = 0;\n" +
			"gAT", "gAT");
		testProposals(results, [
			["getAnotherThing", "getAnotherThing : Number"]
		]);
	};
	tests["test loosely match 2"] = function() {
		var results = computeContentAssist(
			"var getAnotherThing = 0;\n" +
			"getan", "getan");
		testProposals(results, [
			["getAnotherThing", "getAnotherThing : Number"]
		]);
	};
	tests["test loosely match 3"] = function() {
		var results = computeContentAssist(
			"var getAnotherThing = 0;\n" +
			"getaN", "getaN");
		testProposals(results, [
		]);
	};
	tests["test loosely match 4"] = function() {
		var results = computeContentAssist(
			"var getAnotherThing = 0;\n" +
			"getAN", "getAN");
		testProposals(results, [
		]);
	};

	// Issue 221 problems with navigating to proto definitions inside of constructors
	tests['test proto ref in this1']  = function() {
		var results = computeContentAssist(
			"function TextView () {\n" +
			"	this._init/**/;\n" +
			"}\n" +
			"TextView.prototype = {\n" +
			"	_init: function() { }\n" +
			"};", "_init");
		testProposals(results, [
			["_init()", "_init() : undefined"]
		]);
	};
	tests['test proto ref in this2']  = function() {
		var results = computeContentAssist(
			"function TextView () {\n" +
			"	this._init/**/;\n" +
			"}\n" +
			"TextView.prototype._init = function() { };", "_init");
		testProposals(results, [
			["_init()", "_init() : undefined"]
		]);
	};
	tests['test proto ref in this3']  = function() {
		var results = computeContentAssist(
			"function TextView () { }\n" +
			"TextView.prototype._init = function() { };\n" +
			"new TextView()._init/**/", "_init");
		testProposals(results, [
			["_init()", "_init() : undefined"]
		]);
	};






	// See https://github.com/scripted-editor/scripted/issues/258
	tests['test invalid array type param in jsdoc']  = function() {
		var results = computeContentAssist(
			"/** @type Array.<nuthin> */\n" +
			"var graph = {};\n" +
			"graph[''].k.proto", "proto");
		testProposals(results, [
			["prototype", "prototype : Object"]
		]);
	};

	return tests;
});

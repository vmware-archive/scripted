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
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/
 
/*global require exports console */
var esprima = require("../../client/scripts/lib/esprima/esprima");

function emptyParseTree() { return {}; } 

//call esprima parser. If it throws an exception ignore it and return an empty parse tree.
function parse(text, errback) {
	if (typeof(errback)!=='function') {
		errback = function (error) {
			//Silently drop parse errors and return something suitable for most
			//contexts.
			return emptyParseTree();
		};
	}
	try {
		return esprima.parse(text);
	} catch (error) {
		return errback(error);
	}
}

function dummyparse() {
	return {};
}

exports.parse = parse;

//like parse, but when there's an error in parsing, throw an exception
exports.parseAndThrow = function (text) {
	return parse(text, function (error) {
		throw error;
	});
};

//like parse, but when there's an error in parsing, log it to the console.
exports.parseAndLog = function (text) {
	return parse(text, function (error) {
		console.log(error); //Typically only shows stack 'below' this point.
		console.trace('More stack frames'); //Shows stack 'above' this point.
		return emptyParseTree();
	});
};

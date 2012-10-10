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
 
/*global Tautologistics require define console module*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

///////////////////////////////////////////
// script-tag-finder
///////////////////////////////////////////

//htmlparser docs see: https://github.com/tautologistics/node-htmlparser

var htmlparser = require('htmlparser') || Tautologistics.NodeHtmlParser; 
									// Note: the "|| <crap>" makes it work in the browser.

var walk = require('./tree-walker').walk;

function getScriptTags(htmlText) {
	var tags = [];
	var dom = null;
	var handler = new htmlparser.DefaultHandler(function (error, gotDom) {
		if (error) {
			console.error(error);
		} else {
			dom = gotDom;
		}
    });
    new htmlparser.Parser(handler).parseComplete(htmlText);
//    console.log(JSON.stringify(dom, null, "  "));
    
    walk(dom, function (node) {
		try {
			if (node.type === 'script') {
				tags.push(node);
				return false; //assume script tags can't be nested.
			}
		} catch (err) {
		}
		return true;
    });
    
    return tags;
}

function getScriptCode(tag) {
	var code = tag && tag.children;
	code = code && code[0]; // first presumably only child
	code = code && code.data; 
	return typeof(code)==='string' && code;
}

exports.getScriptCode = getScriptCode;

exports.getScriptTags = getScriptTags;

///////////////////////////////////////////
});
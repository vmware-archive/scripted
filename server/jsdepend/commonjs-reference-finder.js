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

/*global require define console module*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

//////////////////////////////////////
//commonjs-support
//

var tm = require("./tree-matcher");
var walk = require("./tree-walker").walk;
var objectPat = tm.objectPat;
var containsPat = tm.containsPat;
//var bindMatcher = tm.bindMatcher;
//var successMatcher = tm.successMatcher;
var getFieldPat = tm.getFieldPat;
var arrayElementPat = tm.arrayElementPat;
//var successPat = tm.successPat;
var matches = tm.matches;
var variablePat = tm.variablePat;
var andPat = tm.andPat;

function dumpTree(parseTree) {
	console.log(JSON.stringify(parseTree, null, "  "));
}

var requireParam = variablePat('string');
var requirePat = objectPat({
	"type": "CallExpression",
	"callee": {
	     "type": "Identifier",
		 "name": "require"
	},
	"arguments": [ {
		"type": "Literal",
		"value": requireParam
	} ]
});

// Given a parse-tree, find references to other modules in that module. 
function findReferences(tree, callback) {

	var foundList = [];
	var foundSet = {};
	
	function addFound(name) {
		if (typeof(name)==='string') {
			if (!foundSet.hasOwnProperty(name)) {
				foundSet[name] = true;
				foundList.push(name);
			}
		}
	}
	
	walk(tree, function (node) {
		//dumpTree(node);
		if (matches(requirePat, node)) {
			var name = requireParam.value;
			addFound(name);
		}
		return true;
	});

	callback(foundList.map(function (name) {
		return {
			kind: 'commonjs',
			name: name
		};
	}));
}

exports.findReferences = findReferences;

});
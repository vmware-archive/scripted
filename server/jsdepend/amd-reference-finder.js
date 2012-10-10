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
//reference-finder:
//
//  A helper module responsible for finding references from a given module to
//  other modules but without trying to resolve the referred modules.

var tm = require("./tree-matcher");
var walk = require("./tree-walker").walk;
var objectPat = tm.objectPat;
var containsPat = tm.containsPat;
//var bindMatcher = tm.bindMatcher;
//var successMatcher = tm.successMatcher;
var getFieldPat = tm.getFieldPat;
var arrayElementPat = tm.arrayElementPat;
//var successPat = tm.successPat;
var unitPat = tm.unitPat;
var bindPat = tm.bindPat;
var arrayWithElementPat = tm.arrayWithElementPat;
var matches = tm.matches;
var variablePat = tm.variablePat;
var andPat = tm.andPat;

function dumpTree(parseTree) {
	console.log(JSON.stringify(parseTree, null, "  "));
}

//amdFinder :: TreePattern
var defineFinder = containsPat(objectPat({
	"type": "CallExpression",
	"callee": {
		"type": "Identifier",
		"name": "define"
	}
}));

var defineVar = variablePat();
var definePat = objectPat({
        "type": "CallExpression",
        "callee": {
          "type": "Identifier",
          "name": "define"
        },
        "arguments": arrayWithElementPat(objectPat({
            "type": "ArrayExpression",
            "elements": andPat([
				arrayWithElementPat(objectPat({
					"type": "Literal"
				})),
				defineVar
            ])
        }))
});

var requireParam = variablePat();
var requirePat = objectPat({
	"type": "CallExpression",
	"callee": {
	     "type": "Identifier",
		 "name": "require"
	},
	"arguments": [requireParam]
});

var stringVar = variablePat('string');
var starVar = variablePat();

var arrayExp = objectPat({
    "type": "ArrayExpression",
    "elements": starVar
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
	
	function addArrayElements(args) {
		for (var i = 0; i < args.length; i++) {
			var arg = args[i];
			if (arg.type === 'Literal' && typeof(arg.value)==='string') {
				addFound(arg.value);
			}
		}
	}
	
	walk(tree, function (node) {
		//dumpTree(node);
		if (matches(definePat, node)) {
			addArrayElements(defineVar.value);
		} else if (matches(requirePat, node)) {
			var arg = requireParam.value;
			if (arg.type === 'Literal' && typeof(arg.value)==='string') {
				addFound(arg.value);
			} else if (matches(arrayExp, arg)) {
				addArrayElements(starVar.value);
			}
		}
		return true;
	});

	callback(foundList.map(function (name) {
		return {
			kind: 'AMD',
			name: name
		};
	}));
}

exports.findReferences = findReferences;

});
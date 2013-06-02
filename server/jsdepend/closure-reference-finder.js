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
 *     Anh-Kiet Ngo
 ******************************************************************************/

/*global require define console module*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

//////////////////////////////////////
//closure-support
//

var tm = require("./tree-matcher");
var walk = require("./tree-walker").walk;
var objectPat = tm.objectPat;
var matches = tm.matches;
var variablePat = tm.variablePat;

var requireParam = variablePat('string');
var requirePat = objectPat({
	/* matches: goog.require('string') */
  "type": "CallExpression",
  "callee": {
    "type": "MemberExpression",
    "object": {
      "type": "Identifier",
      "name": "goog"
    },
    "property": {
      "type": "Identifier",
      "name": "require"
    }
  },
  "arguments": [{
    "type": "Literal",
		"value": requireParam
  }]
});

/**
 * This is adapted from common-reference-finder.js
 */
function configure(moduleType) {

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

		// TODO: Not sure if we should be doing this since we already have the
		// dependencies from Closure's DepsWriter. Keeping this in for now to
		// reduce the dependency on the the deps file, maybe in the future we
		// will support the entire pipeline without the need for DepsWriter
		walk(tree, function (node) {
			if (matches(requirePat, node)) {
				var name = requireParam.value;
				addFound(name);
			}
			return true;
		});

		callback(foundList.map(function (name) {
			return {
				kind: moduleType,
				name: name
			};
		}));
	}

	return findReferences;

}

exports.configure = configure;

});

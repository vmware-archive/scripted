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
 
/*global resolve require define esprima console module*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {
///////////////////////////////////////////////
// module-types.js
//
// Support for distinguishing / recognizing different types of modules.
///////////////////////////////////////////////

var tm = require('./tree-matcher');
var containsPat = tm.containsPat;
var objectPat = tm.objectPat;
var orPat = tm.orPat;
var arrayWithElementPat = tm.arrayWithElementPat;
var matches = tm.matches;
var notWithinPat = tm.notWithinPat;

var amdDefine = containsPat(objectPat({
	/* matches: define(..., [...], ...) */
    "type": "CallExpression",
    "callee": {
      "type": "Identifier",
      "name": orPat([objectPat("define"), objectPat("require")])
    },
    "arguments": arrayWithElementPat(objectPat({
        "type": "ArrayExpression"
    }))
}));

var commonJsDefine =  objectPat( {
	/* matches: define(function (require, ...) { ... }) */
    "type": "CallExpression",
    "callee": {
      "type": "Identifier",
      "name": "define"
    },
    "arguments": [
      {
        "type": "FunctionExpression",
        "params": [
          {
            "type": "Identifier",
            "name": "require"
          }
        ]
      }
    ]
});

var exportsAssignment = objectPat({
    "type": "AssignmentExpression",
    "operator": "=",
    "left": {
      "type": "MemberExpression",
      "object": {
        "type": "Identifier",
        "name": "exports"
      }
    }
});

// create a pattern that matches a call to a given function name
function callPat(name) {
	return objectPat( {
		"type": "CallExpression",
		"callee": {
		  "type": "Identifier",
		  "name": name
		}
	} );
}

var commonJsRequire = notWithinPat(callPat('define'), callPat('require'));
var commonJsPlain = orPat([
	containsPat(exportsAssignment),
	commonJsRequire
]);

var commonJsWrapper = containsPat(commonJsDefine);

function getModuleType(tree) {
	if (matches(amdDefine, tree)) {
		return 'AMD';
	} else if (matches(commonJsWrapper, tree)) {
		return 'commonjs,AMD';
	} else if (matches(commonJsPlain, tree)) {
		return 'commonjs';
	} else {
		return 'unknown';
	}
}

function makeLogged(f) {
	function logged() {
		var args = Array.prototype.slice.apply(arguments);
		console.log(f.name + " <= " +JSON.stringify(args));
		var r = f.apply(this, args);
		console.log(f.name + " => " +JSON.stringify(r));
		return r;
	}
	return logged;
}

//getModuleType = makeLogged(getModuleType);

exports.getModuleType = getModuleType;
exports.forTest = {
	callPat: callPat,
	commonJsRequire: commonJsRequire
};

///////////////////////////////////////////////
}); // end: define (commonsj wrapper)

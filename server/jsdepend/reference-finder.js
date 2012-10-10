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

var moduleTypes = require('./module-types');
var getModuleType = moduleTypes.getModuleType;

//////////////////////////////////////
//reference-finder:
//
//  A helper module responsible for finding references from a given module to
//  other modules but without trying to resolve the referred modules.

function dumpTree(parseTree) {
	console.log(JSON.stringify(parseTree, null, "  "));
}

var finders = {
	'AMD': require('./amd-reference-finder').findReferences,
	'commonjs': require('./commonjs-reference-finder').findReferences
};

// Given a parse-tree, find references to other modules in that module. 
// The callback will receive two parameters, the first is a list of
// references and the second is the module-type of the originating module
// (It is cheap to add this extra second param because we have to determine
// the module type)
function findReferences(tree, callback) {

	//How exactly we find references in a module depends on the module type
	var moduleType = getModuleType(tree);
	
	var finder = moduleType && finders[moduleType];
	if (finder) {
		finder(tree, function (refs) {
			callback(refs, moduleType);
		});	
	} else {
		callback([], moduleType);
	}
}

exports.findReferences = findReferences;

});

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
	'commonjs': require('./commonjs-reference-finder').configure('commonjs'),
	'commonjs,AMD': require('./commonjs-reference-finder').configure('commonjs,AMD'),
	'closure': require('./closure-reference-finder').configure('closure')
};

// Given a parse-tree, find references to other modules in that module. 
// The callback will receive two parameters, the first is a list of
// references and the second is the module-type of the originating module
// (It is cheap to add this extra second param because we have to determine
// the module type)
function findReferences(tree, moduleType, callback) {
	if (!callback) {
		callback = moduleType;
		moduleType = getModuleType(tree);
	}

	//A module may have multiple module types simultaneously 
	//If so we will use only the first module type to determine how to find references.
	var finderType = (typeof(moduleType)==='string') ? moduleType : moduleType[0]; 
	
	var finder = finderType && finders[finderType];
	if (finder) {
		finder(tree, function (refs) {
			callback(refs);
		});
	} else {
		callback([]);
	}
}

exports.findReferences = findReferences;

});

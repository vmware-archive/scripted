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

/*global require define console module setTimeout */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

//////////////////////////////////////////////////////////////////
// tree-walker.js
// 
// Very simple tree walker utility.
//////////////////////////////////////////////////////////////////

function getChildren(node) {
	if (typeof(node)==='string') {
		return [];
	} else {
		var children = [];
		for (var property in node) {
			if (node.hasOwnProperty(property)) {
				children.push(node[property]);	
			}
		}
		return children;
	}
}

//walk that allows the nodeFun to immediately abort the walk. 
//if nodeFun returns true the walk stops right away: no children or siblings of current node
//will be visited.
function abortableWalk(tree, nodeFun) {
	var abort = nodeFun(tree);
	if (!abort) {
		var children = getChildren(tree);
		for (var i = 0; !abort && i < children.length; i++) {
			abort = abortableWalk(children[i], nodeFun);
		}
	}
	return abort;
}

//walk that allows the nodefun to specifify whether children should be visited.
//if nodeFun returns true children are visited otherwise they are not.
//note that siblings of the current node will still be visited!
function walk(tree, nodeFun) {
	var visitChildren = nodeFun(tree);
	if (visitChildren) {
		var children = getChildren(tree);
		for (var i = 0; i < children.length; i++) {
			walk(children[i], nodeFun);
		}
	}
}

exports.walk = walk;
exports.abortableWalk = abortableWalk;
//////////////////////////////////////////////////////////////////////////////
});
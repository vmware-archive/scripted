/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

/**
 * This module provides tools to help wth refactoring
 */

/*global define */
define(function (require) {

	var visitor = require('plugins/esprima/esprimaVisitor');
	var findSelectedWord = require('scripted/markoccurrences').findSelectedWord;


	function inRange(range, offset) {
		return range[0] <= offset && range[1] >= offset;
	}

	/**
	 * finds all references for the given variable under the
	 * selection
	 * @param {{start:Number,end:Number}} selection the currently selected element
	 * @param String buffer the entire contents of the editor
	 * @returns [{start:Number,end:Number}] an array of elemnnts corresponding to references
	 * or null if invalid location
	 */
	return {
		findVarReferences : function (buffer, selection) {
			var expanded = findSelectedWord(selection.start, selection.end, buffer);
			if (!expanded) {
				return null;
			}
			var i;
			var root = visitor.parse(buffer);
			var parentStack = [];
			var refNodes = [];
			var declScopes = [];

			// is this node a valid reference???
			function isRef(node) {
				var parent = parentStack[parentStack.length-1];
				if (parent.type === 'Property') {
					return node === parent.value;
				}
				if (parent.type === 'MemberExpression') {
					return node === parent.object || (node === parent.property && parent.computed);
				}

				switch(parent.type) {
					case 'ArrayExpression':
					case 'AssignmentExpression':
					case 'BinaryExpression':
					case 'BlockStatement':
					case 'CallExpression':
					case 'CatchClause':
					case 'ConditionalExpression':
					case 'DoWhileStatement':
					case 'ExpressionStatement':
					case 'ForInStatement':
					case 'ForStatement':
					case 'FunctionDeclaration':
					case 'FunctionExpression':
					case 'IfStatement':
					case 'LogicalExpression':
					case 'NewExpression':
					case 'Program':
					case 'ReturnStatement':
					case 'SwitchCase':
					case 'SwitchStatement':
					case 'ThrowStatement':
					case 'TryStatement':
					case 'UnaryExpression':
					case 'UpdateExpression':
					case 'VariableDeclaration':
					case 'VariableDeclarator':
					case 'WhileStatement':
					case 'WithStatement':
						return true;

					case 'BreakStatement':
					case 'Identifier':
					case 'LabeledStatement':
					case 'Literal':
						return false;
					default: // in case there's anythign I missed
						console.warning("Unhandled expression type in refactoring: " + parent.type);
				}
			}

			visitor.visit(root, null, function(node, context) {
				if (node.type === 'Identifier' && node.name === expanded.word) {
					var parent = parentStack[parentStack.length-1];
					if (isRef(node)) {

						refNodes.push(node);

						if (parent.type === 'VariableDeclarator' || parent.type === 'FunctionDeclaration') {
							// look for enclosing scope. travel up parent stack and find enclosing
							// function decl, or just use all

							// if this is a function decl, then the name is put into the scope of the enclosing.
							// So, look two into the stack
							var startStack = (parent.type === 'FunctionDeclaration' && node === parent.id)
									? parentStack.length-2 : parentStack.length-1;
							for (i = startStack; i >= 0 ; i--) {
								if (parentStack[i].type === 'FunctionExpression' ||
									parentStack[i].type === 'FunctionDeclaration' ||
									parentStack[i].type === 'Program') {

									declScopes.push(parentStack[i].range);
									break;
								}
							}
						}
					}
				}
				parentStack.push(node);
				return true;
			}, function () { parentStack.pop(); });

			// ensure that we have found the target node (ie- it is a renamable thing
			var found;
			for (i = 0; i < refNodes.length; i++) {
				var node = refNodes[i];
				if (node.range[0] === expanded.start && node.range[1] === expanded.end) {
					found = true;
					break;
				}
			}
			if (!found) {
				return null;
			}

			// also include global scope in case a var is not explicitly declarared
			declScopes.push(root.range);

			// next, order declScopes from smallest to biggest
			declScopes.sort(function(l, r) {
				var lSize = l.end - l.start;
				var rSize = r.end - r.start;
				return rSize - lSize; // TODO reverse???
			});

			var targetScope;
			for (i = 0; i < declScopes.length; i++) {
				if (inRange(declScopes[i], selection.start)) {
					targetScope = declScopes[i];
					break;
				}
			}

			var foundRefs = [];
			refNodes.forEach(function(node) {
				// ensure not in range of any smaller scope, but in range of the target scope
				for (i = 0; i < declScopes.length; i++) {
					if (declScopes[i] === targetScope) {
						// must be in this scope
						if (inRange(targetScope, node.range[0])) {
							foundRefs.push({start: node.range[0], end:node.range[1]});
						}
						// no need to try any larget scopes
						break;
					} else {
						// must not be in this scope
						if (inRange(declScopes[i], node.range[0])) {
							break;
						}
					}
				}
			});

			return foundRefs;
		}
	};
});

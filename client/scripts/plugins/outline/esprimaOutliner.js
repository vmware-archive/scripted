/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Andy Clement (vmware) - initial API and implementation
 *     Andrew Eisenberg (vmware) - major refactoring
 *******************************************************************************/
/*global define */
define(["plugins/esprima/esprimaVisitor"], function(mVisitor) {


	function callEsprima(contents) {
		var parsedProgram = mVisitor.parse(contents, {
			range: true
		});
	}
	
	function toParamString(params) {
		if (!params || params.length === 0) {
			return "()";
		}
		var pstring = '(';
		var plen = params.length;
		for (var p = 0; p < plen; p++) {
			if (p > 0) {
				pstring += ',';
			}
			pstring += params[p].name;
		}
		pstring += ')';
		return pstring;
	}
	
	function preVisit(node, context) {
		var entry;
		switch (node.type) {
			case "FunctionDeclaration":
				entry = {
					label : node.id.name + toParamString(node.params),
					range : node.id.range,
					children : []
				};
				break;
			case "VariableDeclarator":
				if (node.init && node.init.type === 'FunctionExpression') {
					entry = {
						label : node.id.name + toParamString(node.init.params),
						range : node.id.range,
						children : []
					};
				}
				break;
			case "Property":
				if (node.value.type === 'FunctionExpression') {
					entry = {
						label : node.key.name + toParamString(node.value.params),
						range : node.key.range,
						children : []
					};
				}
				break;
			default:
		}
		
		if (entry) {
			context[context.length-1].push(entry);
			context.push(entry.children);
		}
		
		return true;
	}
	
	
	function postVisit(node, context) {
		switch (node.type) {
			case "FunctionDeclaration":
				context.pop();
				break;
			case "VariableDeclarator":
				if (node.init && node.init.type === 'FunctionExpression') {
					context.pop();
				}
				break;
			case "Property":
				if (node.value.type === 'FunctionExpression') {
					context.pop();
				}
				break;
			default:
		}
		return true;
	}
	
	function getOutline(contents) {
		var parsedProgram = mVisitor.parse(contents, {
			range: true
		});
		var outline = [[]];
		mVisitor.visit(parsedProgram, outline, preVisit, postVisit);
		
		return outline[0];
	}

	return {
		getOutline: getOutline
	};
});
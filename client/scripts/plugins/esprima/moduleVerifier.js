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
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

/*global define*/
define(["plugins/esprima/esprimaVisitor"], function(mVisitor) {

	function extractModuleArray(call) {
		var arrayElts;
		if (call.type === "CallExpression" && 
				(call.callee.name === "define" || call.callee.name === "require")) {
			var args = call["arguments"];
			if (args) {
				var constArg;
				for (var i = 0; i < Math.min(args.length, 2); i++) {
					if (args[i].type === "ArrayExpression") {
						arrayElts = args[i].elements;
					} else if (args[i].type === 'Literal') {
						constArg = args[i];
					}
				}
				if (!arrayElts && constArg) {
					arrayElts = [ constArg ];
				}
			}
		}
		return arrayElts;
	}

	function lookForMissingAsyncCall(call, indexer) {
		// array is either 0 or 1 arg
		// for each elt of array, is it resolvable?
		
		var arrayElts = extractModuleArray(call);
		if (arrayElts) {
			var missing = [];
			for (var i = 0; i < arrayElts.length; i++) {
				if (arrayElts[i].type === "Literal" && typeof arrayElts[i].value === "string") {
					if (!indexer.hasDependency(arrayElts[i].value)) {
						// module is unresolvable report it.
						missing.push({
							description : "Cannot find module '" + arrayElts[i].value + "'",
							line : arrayElts[i].loc.start.line,
							severity : "error",
							start : arrayElts[i].loc.start.column+2,
							end : arrayElts[i].loc.end.column+1
						});
					}
				}
			}
			if (missing.length > 0) {
				return missing;
			}
		}
		return null;
	}
	
	function lookForMissingSyncCall(call, indexer) {
		// TODO not yet
		// not even sure if we need this any more since 
		// I think this is covered in lookForMissingAsyncCall()
		// inside of a synchronous require call
	}
	
	/**
	 * This module defines a module verifier that checks for unresolvable modules
	 */
	 function checkModules(buffer, indexer) {
		var root = mVisitor.parse(buffer, { range: false, loc: true });
				
		var operation = function(node, missingModules) {
			// look for methods called define or require
			var maybeMissing = lookForMissingAsyncCall(node, indexer);
			if (maybeMissing) {
				missingModules.push(maybeMissing);
			} else {
				maybeMissing = lookForMissingSyncCall(node, indexer);
				if (maybeMissing) {
					missingModules.push(maybeMissing);
				}
			}
			return true;
		};
		
		// missingModules = [{start, end, message}...]
		var missingModules = [];
		mVisitor.visit(root, missingModules, operation);
		
		var flattenedMissing = [];
		for (var i = 0; i < missingModules.length; i++) {
			flattenedMissing = flattenedMissing.concat(missingModules[i]);
		}
		
		return flattenedMissing;
	 }
	 
	/**
	 * checks that offset is before the range
	 */
	function isBefore(offset, range) {
		if (!range) {
			return true;
		}
		return offset < range[0];
	}

	/**
	 * checks that offset is after the range
	 */
	function isAfter(offset, range) {
		if (!range) {
			return true;
		}
		return offset > range[1];
	}
	
	/**
	 * returns true iff start and end are inside of the range
	 */
	function coveredNyRange(start, end, range) {
		return range[0] <= start && range[1] >= end;
	}
	function findModulePath(buffer, indexer, start, end) {
		var root = mVisitor.parse(buffer, {
		    range: false,
		    loc: true
		});
		var operation = function(node) {
			if (isAfter(start, node.range)) {
				// can ignore this branch
				return false;
			}
			if (isBefore(end, node.range)) {
				// shortcut
				throw false;
			}
			
			var arrayElts = extractModuleArray(node);
			if (arrayElts) {
				// check each array element to see if it matches the 
				for (var i = 0; i < arrayElts.length; i++) {
					if (coveredNyRange(start, end, arrayElts[i].range)) {
						throw arrayElts[i].value;
					}
				}
			}
			return true;
		};

		var result;
		try {
		    mVisitor.visit(root, null, operation);
		} catch (done) {
		    if (typeof done === 'string') {
		        result = done;
			} else if (typeof done === 'boolean') {
				// do nothing
			} else {
		        throw done;
		    }
		}
		var path = indexer.hasDependency(result);
		if (path) {
			return { path : path , range : [0,0] };
		} else {
			return null;
		}
	 }
	 
	return {
		checkModules : checkModules,
		findModulePath : findModulePath
	};
	
});
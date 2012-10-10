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
 *     Andy Clement (VMware) - initial API and implementation
 *     Andrew Eisenberg (VMware) - implemented visitor pattern
 ******************************************************************************/

/*global define require eclipse esprima window scriptedLogger doctrine */
define("plugins/esprima/esprimaJsContentAssist", ["plugins/esprima/esprimaVisitor", "plugins/esprima/types", "esprima/esprima", "doctrine/doctrine"], 
		function(mVisitor, mTypes) {
	
	/** @type {function(obj):Boolean} a safe way of checking for arrays */
	var isArray = Array.isArray;
	if (!isArray) {
	    isArray = function isArray(ary) {
	        return Object.prototype.toString.call(ary) === '[object Array]';
	    };
	}
	
	/**
	 * @param {String} char a string of at least one char14acter
	 * @return {boolean} true iff uppercase ascii character
	 */
	function isUpperCaseChar(c) {
		if (c.length < 1) {
			return false;
		}
		var charCode = c.charCodeAt(0);
		if (isNaN(charCode)) {
			return false;
		}
		return charCode >= 65 && charCode <= 90;
	}
	
	/** constant that defines generated type name prefixes */
	var GEN_NAME = "gen~";
	
	/**
	 * finds the right-most segment of a dotted MemberExpression
	 * if it is an identifier, or null otherwise
	 * @return {{name:String}}
	 */
	function findRightMost(node) {
		if (!node) {
			return null;
		} else if (node.type === "Identifier") {
			return node;
		} else if (node.type === "MemberExpression") {
			return findRightMost(node.property);
		} else {
			return null;
		}
	}
	
	/**
	 * Recursively generates a name based on the given expression
	 * @param {{type:String,name:String}} node
	 * @return {String}
	 */
	function findDottedName(node) {
		if (!node) {
			return "";
		} else if (node.type === "Identifier") {
			return node.name;
		} else if (node.type === "MemberExpression") {
			var left = findDottedName(node.object);
			var right = findDottedName(node.property);
			if (left.length > 0 && right.length > 0) {
				return left + "." + right;
			}
			return left + right;
		} else if (node.type === "CallExpression") {
			return findDottedName(node.callee);
		} else {
			return "";
		}
	}
	
	/**
	 * Convert an array of parameters into a string and also compute linked editing positions
	 * @param {String} name name of the function
	 * @param {String} type the type of the function using the following structure '?Type:arg1,arg2,...'
	 * @param {Number} offset offset
	 * @return {{ completion:String, positions:Array.<Number> }}
	 */
	function calculateFunctionProposal(name, type, offset) {
		var paramsOffset = type.lastIndexOf(":"), paramsStr, params;
		paramsStr = paramsOffset > 0 ? type.substring(paramsOffset+1) : "";
		params = paramsStr.split(",");
		if (!paramsStr || params.length === 0) {
			return {completion: name + "()", positions:[]};
		}
		var positions = [];
		var completion = name + '(';
		var plen = params.length;
		for (var p = 0; p < plen; p++) {
			if (p > 0) {
				completion += ', ';
			}
			var argName;
			if (typeof params[p] === "string") {
				// need this because jslintworker.js augments the String prototype with a name() function
				// don't want confusion
				argName = params[p];
			} else if (params[p].name) {
				argName = params[p].name();
			} else {
				argName = params[p];
			}
			positions.push({offset:offset+completion.length+1, length: argName.length});
			completion += argName;
		}
		completion += ')';
		return {completion: completion, positions: positions};
	}
	
	/**
	 * checks that offset overlaps with the given range
	 * Since esprima ranges are zero-based, inclusive of 
	 * the first char and exclusive of the last char, must
	 * use a +1 at the end.
	 * eg- (^ is the line start)
	 *       ^x    ---> range[0,0]
	 *       ^  xx ---> range[2,3]
	 */
	function inRange(offset, range, includeEdge) {
		return range[0] <= offset && (includeEdge ? range[1] >= offset : range[1] > offset);
	}
	/**
	 * checks that offset is before the range
	 * @return Boolean
	 */
	function isBefore(offset, range) {
		if (!range) {
			return true;
		}
		return offset < range[0];
	}
	
	/**
	 * checks that offset is after the range
	 * @return Boolean
	 */
	function isAfter(offset, range) {
		if (!range) {
			return true;
		}
		return offset > range[1];
	}

	/**
	 * Determines if the offset is inside this member expression, but after the '.' and before the 
	 * start of the property.
	 * eg, the following returns true:
	 *   foo   .^bar	 
	 *   foo   .  ^ bar
	 * The following returns false:
	 *   foo   ^.  bar
	 *   foo   .  b^ar
	 * @return Boolean
	 */
	function afterDot(offset, memberExpr, contents) {
		// check for broken AST
		var end;
		if (memberExpr.property) {
			end = memberExpr.property.range[0];
		} else {
			// no property expression, use the end of the memberExpr as the end to look at
			// in this case assume that the member expression ends just after the dot
			// this allows content assist invocations to work on the member expression when there
			// is no property
			end = memberExpr.range[1] + 2;
		}
		// we are not considered "after" the dot if the offset
		// overlaps with the property expression or if the offset is 
		// after the end of the member expression
		if (!inRange(offset-1, memberExpr.range) ||
			inRange(offset-1, memberExpr.object.range) ||
			offset > end) {
			return false;
		}
		
		var dotLoc = memberExpr.object.range[1];
		while (contents.charAt(dotLoc) !== "." && dotLoc < end) {
			dotLoc++;
		}
		
		if (contents.charAt(dotLoc) !== ".") {
			return false;
		}
		
		return dotLoc < offset;
	}
	
	/**
	 * @return "top" if we are at a start of a new expression fragment (eg- at an empty line, 
	 * or a new parameter).  "member" if we are after a dot in a member expression.  false otherwise
	 * @return {Boolean|String}
	 */
	function shouldVisit(root, offset, prefix, contents) {
		/**
		 * A visitor that finds the parent stack at the given location
		 * @param node the AST node being visited
		 * @param parents stack of parent nodes for the current node
		 * @param isInitialVisit true iff this is the first visit of the node, false if this is
		 *   the end visit of the node
		 */ 
		var findParent = function(node, parents, isInitialVisit) {
			// extras prop is where we stuff everything that we have added
			if (!node.extras) {
				node.extras = {};
			}
			
			if (!isInitialVisit) {
			
				// if we have reached the end of an inRange block expression then 
				// this means we are completing on an empty expression
				if (node.type === "Program" || (node.type === "BlockStatement") &&
						inRange(offset, node.range)) {
					throw "done";
				}
			
				parents.pop();
				// return value is ignored
				return false;
			}
			
			// the program node is always in range even if the range numbers do not line up
			if ((node.range && inRange(offset-1, node.range)) || node.type === "Program") {
				if (node.type === "Identifier") {
					throw "done";
				}
				parents.push(node);
				if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression") && 
						node.nody && isBefore(offset, node.body.range)) {
					// completion occurs on the word "function"
					throw "done";
				}
				// special case where we are completing immediately after a '.' 
				if (node.type === "MemberExpression" && !node.property && afterDot(offset, node, contents)) {
					throw "done";
				}
				return true;
			} else {
				return false;
			}
		};
		var parents = [];
		try {
			mVisitor.visit(root, parents, findParent, findParent);
		} catch (done) {
			if (done !== "done") {
				// a real error
				throw(done);
			}
		}

		if (parents && parents.length) {
			var parent = parents.pop();
			if (parent.type === "MemberExpression") {
				if (parent.property && inRange(offset-1, parent.property.range)) {
					// on the right hand side of a property, eg: foo.b^
					return "member";
				} else if (inRange(offset-1, parent.range) && afterDot(offset, parent, contents)) {
					// on the right hand side of a dot with no text after, eg: foo.^
					return "member";
				}
			} else if (parent.type === "Program" || parent.type === "BlockStatement") {
				// completion at a new expression
				if (!prefix) {
				}
			} else if (parent.type === "VariableDeclarator" && (!parent.init || isBefore(offset, parent.init.range))) {
				// the name of a variable declaration
				return false;
			} else if ((parent.type === "FunctionDeclaration" || parent.type === "FunctionExpression") && 
					isBefore(offset, parent.body.range)) {
				// a function declaration
				return false;
			}
		}
		return "top";
	}	
	
	/**
	 * finds the final return statement of a function declaration
	 * @param node an ast statement node
	 * @return the lexically last ReturnStatment AST node if there is one, else
	 * null if there is no return statement
	 */
	function findReturn(node) {
		if (!node) {
			return null;
		}
		var type = node.type, maybe, i, last;
		// since we are finding the last return statement, start from the end
		switch(type) {
		case "BlockStatement":
			if (node.body && node.body.length > 0) {
				last = node.body[node.body.length-1];
				if (last.type === "ReturnStatement") {
					return last;
				} else {
					return findReturn(last);
				}
			}
			return null;
		case "WhileStatement": 
		case "DoWhileStatement":
		case "ForStatement":
		case "ForInStatement":
		case "CatchClause":
			
			return findReturn(node.body);
		case "IfStatement":
			maybe = findReturn(node.alternate);
			if (!maybe) {
				maybe = findReturn(node.consequent);
			}
			return maybe;
		case "TryStatement":
			maybe = findReturn(node.finalizer);
			var handlers = node.handlers;
			if (!maybe && handlers) {
				// start from the last handler
				for (i = handlers.length-1; i >= 0; i--) {
					maybe = findReturn(handlers[i]);
					if (maybe) {
						break;
					}
				}
			}
			if (!maybe) {
				maybe = findReturn(node.block);
			}
			return maybe;
		case "SwitchStatement":
			var cases = node.cases;
			if (cases) {
				// start from the last handler
				for (i = cases.length-1; i >= 0; i--) {
					maybe = findReturn(cases[i]);
					if (maybe) {
						break;
					}
				}
			}
			return maybe;
		case "SwitchCase":
			if (node.consequent && node.consequent.length > 0) {
				last = node.consequent[node.consequent.length-1];
				if (last.type === "ReturnStatement") {
					return last;
				} else {
					return findReturn(last);
				}
			}
			return null;
			
		case "ReturnStatement":
			return node;
		default:
			// don't visit nested functions
			// expression statements, variable declarations,
			// or any other kind of node
			return null;
		} 
	}
	
	/**
	 * updates a function type to include a new return type.
	 * function types are specified like this: ?returnType:[arg-n...]
	 * return type is the name of the return type, arg-n is the name of
	 * the nth argument.
	 */
	function updateReturnType(originalFunctionType, newReturnType) {
		if (! originalFunctionType) {
			// not a valid function type
			return newReturnType;
		}
		
		var firstChar = originalFunctionType.charAt(0);
		if (firstChar !== "?" && firstChar !== "*") {
			// not a valid function type
			return newReturnType;
		}
		
		var end = originalFunctionType.lastIndexOf(":");
		if (!end) {
			// not a valid function type
			return newReturnType;
		}
		return firstChar + newReturnType + originalFunctionType.substring(end);
	}
	/**
	 * checks to see if this file looks like an AMD module
	 * Assumes that there are one or more calls to define at the top level
	 * and the first statement is a define call
	 * @return true iff there is a top-level call to 'define'
	 */
	function checkForAMD(node) {
		var body = node.body;
		if (body && body.length >= 1 && body[0]) {
			if (body[0].type === "ExpressionStatement" && 
				body[0].expression &&
				body[0].expression.type === "CallExpression" && 
				body[0].expression.callee.name === "define") {
				
				// found it.
				return body[0].expression;
			}
		}
		return null;
	}
	/**
	 * checks to see if this file looks like a wrapped commonjs module
	 * Assumes that there are one or more calls to define at the top level
	 * and the first statement is a define call
	 * @return true iff there is a top-level call to 'define'
	 */
	function checkForCommonjs(node) {
		var body = node.body;
		if (body && body.length >= 1) {
			for (var i = 0; i < body.length; i++) {
				if (body[i] && 
					body[i].type === "ExpressionStatement" && 
					body[i].expression &&
					body[i].expression.type === "CallExpression" && 
					body[i].expression.callee.name === "define") {
					
					var callee = body[i].expression;
					if (callee["arguments"] && 
						callee["arguments"].length === 1 && 
						callee["arguments"][0].type === "FunctionExpression" &&
						callee["arguments"][0].params.length === 3) {
						
						var params = callee["arguments"][0].params;
						if (params[0].name === "require" &&
							params[1].name === "exports" &&
							params[2].name === "module") {

							// found it.
							return body[i].expression;
						}
					}
				}
			}
		}
		return null;
	}
	
	/**
	 * if this method call ast node is a call to require with a single string constant 
	 * argument, then look that constant up in the indexer to get a summary
	 * if a summary is found, then apply it to the current scope
	 */
	function extractRequireModule(call, env) {
		if (!env.indexer) {
			return;	
		}
		if (call.type === "CallExpression" && call.callee.type === "Identifier" && 
			call.callee.name === "require" && call["arguments"].length === 1) {
		
			var arg = call["arguments"][0];
			if (arg.type === "Literal" && typeof arg.value === "string") {
				// we're in business
				var summary = env.indexer.retrieveSummary(arg.value);
				if (summary) {
					var typeName;
					var mergeTypeName;
					if (typeof summary.provided === "string") {
						mergeTypeName = typeName = summary.provided;
					} else {
						// module provides a composite type
						// must create a type to add the summary to
						mergeTypeName = typeName = env.newScope();
						env.popScope();
					}
					env.mergeSummary(summary, mergeTypeName);
					return typeName;
				}
			}
		}
		
		return;
	}
	
	function isFunctionOrConstructor(typeName) {
		return typeName.charAt(0) === "?" || typeName.charAt(0) === "*";
	}
	
	/**
	 * if the type passed in is a function type, extracts the return type
	 * otherwise returns as is
	 */
	function extractReturnType(fnType) {
		if (isFunctionOrConstructor(fnType)) {
			var typeEnd = fnType.lastIndexOf(':');
			typeEnd = typeEnd >0 ? typeEnd : fnType.length;
			fnType = fnType.substring(1,typeEnd);
		}
		return fnType;	
	}
	
	/**
	 * checks to see if this function is a module definition
	 * and if so returns an array of module definitions
	 * 
	 * if this is not a module definition, then just return an array of Object for each type
	 */
	function findModuleDefinitions(fnode, env) {
		var paramTypes = [], params = fnode.params, i;
		if (params.length > 0) {
			if (!fnode.extras) {
				fnode.extras = {};
			}
			if (env.indexer && fnode.extras.amdDefn) {
				var args = fnode.extras.amdDefn["arguments"]; 
				// the function definition must be the last argument of the call to define or require
				if (args.length > 1 && args[args.length-1] === fnode) {
					// the module names could be the first or second argument
					var moduleNames = null;
					if (args.length === 3 && args[0].type === "Literal" && args[1].type === "ArrayExpression") {
						moduleNames = args[1].elements;
					} else if (args.length === 2 && args[0].type === "ArrayExpression") {
						moduleNames = args[0].elements;
					}
					if (moduleNames) {
						for (i = 0; i < params.length; i++) {
							if (i < moduleNames.length && moduleNames[i].type === "Literal") {
								// resolve the module name from the indexer
								var summary = env.indexer.retrieveSummary(moduleNames[i].value);
								if (summary) {
									var typeName;
									var mergeTypeName;
									if (typeof summary.provided === "string") {
										mergeTypeName = typeName = summary.provided;
									} else {
										// module provides a composite type
										// must create a type to add the summary to
										mergeTypeName = typeName = env.newScope();
										env.popScope();
									}
									env.mergeSummary(summary, mergeTypeName);
									paramTypes.push(typeName);
								} else {
									paramTypes.push(env.newFleetingObject());
								}
							} else {
								paramTypes.push("Object");
							}
						}
					}
				}
			}
		}
		if (paramTypes.length === 0) {
			for (i = 0; i < params.length; i++) {
				paramTypes.push(env.newFleetingObject());
			}
		}
		return paramTypes;
	}
	
	/**
	 * Finds the closest doc comment to this node
	 * @param {} node
	 * @param {Array} comments
	 */
	function findAssociatedCommentBlock(node, doccomments) {
//		look for closest doc comment that is before the start of this node
//		just shift all the other ones
		var candidate;
		while (doccomments.length > 0 && doccomments[0].range[0] < node.range[0]) {
			candidate = doccomments.shift().value;
		}
		return candidate;
	}
	
	function parseJSDocComment(commentText) {
		var result = { };
		result.params = {};
		if (commentText) {
			try {
				var rawresult = doctrine.parse("/*" + commentText + "*/", {unwrap : true, tags : ['param', 'type', 'return']});
				// transform result into something more manageable
				var rawtags = rawresult.tags;
				if (rawtags) {
					for (var i = 0; i < rawtags.length; i++) {
						switch (rawtags[i].title) {
							case "typedef":
							case "define":
							case "type":
								result.type = rawtags[i].type;
								break;
							case "return":
								result.rturn = rawtags[i].type;
								break;
							case "param":
								result.params[rawtags[i].name] = rawtags[i].type;
								break;
						}
					}
				}
			} catch (e) {
				if (typeof scriptedLogger !== "undefined") {
					scriptedLogger.error(e.message, "CONTENT_ASSIST");
					scriptedLogger.error(e.stack, "CONTENT_ASSIST");
				} else {
					// TODO FIXADE not sure if we want to throw, or just log
					throw (e);
				}
			}
		}
		return result;
	}
	
	/**
	 * Best effort to recursively convert from a jsdoc type specification to a scripted type name.
	 * 
	 * See here: https://developers.google.com/closure/compiler/docs/js-for-compiler
	 * should handle:
			NullableLiteral
			AllLiteral
			NullLiteral
			UndefinedLiteral
			VoidLiteral
			UnionType
			ArrayType
			RecordType
			FieldType
			FunctionType
			ParameterType
			RestType
			NonNullableType
			OptionalType
			NullableType
			NameExpression
			TypeApplication
	 * @return {String} if the type is found, then return string, otherwise null
	 */
	function convertJsDocType(jsdocType, env) {
		var allTypes = env.getAllTypes();
		if (!jsdocType) {
			return null;
		}
	
		var i;
		switch (jsdocType.type) {
			case 'NullableLiteral':
			case 'AllLiteral':
			case 'NullLiteral':
				return "Object";

			case 'UndefinedLiteral':
			case 'VoidLiteral':
				return "undefined";

			case 'UnionType':
				// TODO no direct handling of union types
				// for now, just return the first of the union
				if (jsdocType.elements && jsdocType.elements.length > 0) {
					return convertJsDocType(jsdocType.elements[0], env);
				}
				return "Object";
				
			case 'RestType':
			case 'ArrayType':
				// TODO should be parameterizing the array type
				return "Array";

			case 'FunctionType':
				var ret = convertJsDocType(jsdocType.result, env);
				if (!ret) {
					ret = "Object";
				}
				var params = [];
				if (jsdocType.params) {
					for (i = 0; i < jsdocType.params.length; i++) {
						// this means that if no name is used, then the type name is used (if a simple type)
						var param = jsdocType.params[i].name;
						if (!param) {
							param = convertJsDocType(jsdocType.params[i], env);
							if (!param) {
								param = 'arg'+i;
							}
						}
						params.push(param);
					}
				}
				// TODO FIXADE must also handle @constructor
				var funcConstr;
				if (jsdocType['new'] && jsdocType['this']) {
					// this is actually a constructor
					var maybeRet = convertJsDocType(jsdocType['this'], env);
					if (maybeRet) {
						ret = maybeRet;
					}
					funcConstr = "*";
				} else {
					funcConstr = "?";
				}
				return funcConstr + ret + ":" + params.join(',');

			case 'TypeApplication':
				// TODO ignoring the type parameter for now.  just using the raw type
			case 'ParameterType':
			case 'NonNullableType':
			case 'OptionalType':
			case 'NullableType':
				return convertJsDocType(jsdocType.expression, env);
				
			case 'NameExpression':
				var name = jsdocType.name;
				name = name.trim();
				if (allTypes[name]) {
					return name;
				} else {
					var capType = name[0].toUpperCase() + name.substring(1);
					if (allTypes[capType]) {
						return capType;
					}
				}
				return null;
			case 'RecordType':
				var fields = { };
				for (i = 0; i < jsdocType.fields.length; i++) {
					var field = jsdocType.fields[i];
					var fieldType = convertJsDocType(field, env);
					fields[field.key] = fieldType ? fieldType : "Object";
				}
				// create a new type to store the record
				var obj = env.newFleetingObject();
				for (var prop in fields) {
					if (fields.hasOwnProperty(prop)) {
						// add the variable to the new object, which happens to be the top-level scope
						env.addVariable(prop, obj, fields[prop]);
					}
				}
				return obj;
			case 'FieldType':
				return convertJsDocType(jsdocType.value, env);
		}
		return null;
	}

	/**
	 * This function takes the current AST node and does the first inferencing step for it.
	 * @param node the AST node to visit
	 * @param env the context for the visitor.  See computeProposals below for full description of contents
	 */
	function inferencer(node, env) {
		var type = node.type, oftype, name, i, property, params, newTypeName, jsdocResult, jsdocType;
		
		// extras prop is where we stuff everything that we have added
		if (!node.extras) {
			node.extras = {};
		}

		// fail fast if part of an unineresting place in a VariableDeclaraion
		if (type === "VariableDeclaration" && isBefore(env.offset, node.range)) {
			return false;
		}
		
		switch(type) {
		case "Program":
			// check for module kind
			env.commonjsModule = checkForCommonjs(node);
			if (!env.commonjsModule) {
				// can't be both amd and commonjs
				env.amdModule = checkForAMD(node);
			}
			break;
		case "BlockStatement":
			node.extras.inferredType = env.newScope();
			break;
		case "Literal":
			oftype = (typeof node.value);
			node.extras.inferredType = oftype[0].toUpperCase() + oftype.substring(1, oftype.length);
			break;
		case "ArrayExpression":
			node.extras.inferredType = "Array";
			break;
		case "ObjectExpression":
			if (node.extras.fname) {
				// this object expression is contained inside another object expression
				env.pushName(node.extras.fname);
			}

			// for object literals, create a new object type so that we can stuff new properties into it.
			// we might be able to do better by walking into the object and inferring each RHS of a 
			// key-value pair
			newTypeName = env.newObject(null, node.range);
			node.extras.inferredType = newTypeName;
			for (i = 0; i < node.properties.length; i++) {
				property = node.properties[i];
				// only remember if the property is an identifier
				if (property.key && property.key.name) {
					// first just add as an object property (or use jsdoc if exists).
					// after finishing the ObjectExpression, go and update 
					// all of the variables to reflect their final inferred type
					jsdocResult = parseJSDocComment(findAssociatedCommentBlock(property.key, env.comments));	
					jsdocType = convertJsDocType(jsdocResult.type, env);
					var keyType = jsdocType ? jsdocType : "Object";
					env.addVariable(property.key.name, node, keyType, property.key.range);
					if (!property.key.extras) {
						property.key.extras = {};
					}
					// remember that this is the LHS so that we don't add the identifier to global scope
					property.key.extras.isLHS = true;
					
					if (property.value.type === "FunctionExpression" || property.value.type === "ObjectExpression") {
						if (!property.value.extras) {
							property.value.extras = {};
						}
						// RHS is a function, remember the name in case it is a constructor
						property.value.extras.fname = property.key.name;
						property.value.extras.cname = env.getQualifiedName() + property.key.name;
						
						if (property.value.type === "FunctionExpression") {
							// now remember the jsdocResult so it doesn't need to be recomputed
							property.value.extras.jsdocResult = jsdocResult;
						}
					}
				}
			}
			break;
		case "FunctionDeclaration":
		case "FunctionExpression":
			var nameRange;
			if (node.id) {
				// true for function declarations
				name = node.id.name;
				nameRange = node.id.range;
			} else if (node.extras.fname) {
				// true for rhs of assignment to function expression
				name = node.extras.fname;
				nameRange = node.range;
			}
			params = [];
			if (node.params) {
				for (i = 0; i < node.params.length; i++) {
					params[i] = node.params[i].name;
				}
			}
			
			if (node.extras.jsdocResult) {
				jsdocResult = node.extras.jsdocResult;
			} else {
				jsdocResult = parseJSDocComment(findAssociatedCommentBlock(node, env.comments));	
			}

			// assume that function name that starts with capital is 
			// a constructor
			var isConstuctor;
			if (name && node.body && isUpperCaseChar(name)) {
				if (node.extras.cname) {
					// RHS of assignment
					name = node.extras.cname;
				}
				// create new object so that there is a custom "this"
				newTypeName = env.newObject(name, node.range);
				isConstuctor = true;
			} else {
				var jsdocReturn = convertJsDocType(jsdocResult.rturn, env);
				if (jsdocReturn) {
					// keep track of the return type for the way out
					node.extras.jsdocReturn = jsdocReturn;
					newTypeName = jsdocReturn;
					node.extras.inferredType = jsdocReturn;
				} else {
					// temporarily use "undefined" as type, but this may change once we 
					// walk through to get to a return statement
					newTypeName = "undefined";
				}
				isConstuctor = false;
			}
			if (!node.body.extras) {
				node.body.extras = {};
			}
			node.body.extras.isConstructor = isConstuctor;
			var functionTypeName = (isConstuctor ? "*" : "?") + newTypeName + ":" + params;
			if (isConstuctor) {
				env.createConstructor(functionTypeName, newTypeName);
				// TODO FIXADE assume that constructor will be available from global scope using qualified name
				// this is not correct in all cases
				env.addOrSetGlobalVariable(name, functionTypeName, nameRange);
			}

			node.extras.inferredType = functionTypeName;
			
			if (name && !isBefore(env.offset, node.range)) {
				// if we have a name, then add it to the scope
				env.addVariable(name, node.extras.target, functionTypeName, nameRange);
			}
			
			// now add the scope for inside the function
			env.newScope();
			env.addVariable("arguments", node.extras.target, "Arguments", node.range);

			// now determine if we need to add 'this'.  If this function has an appliesTo, the we know it is being assigned as a property onto something else
			// the 'something else' is the 'this' type.
			// eg- var obj={};var obj.fun=function() { ... };
			var appliesTo = node.extras.appliesTo;
			if (appliesTo) {
				var appliesToOwner = appliesTo.extras.target;
				if (appliesToOwner) {
					var ownerTypeName = env.scope(appliesToOwner);
					// for the special case of adding to the prototype, we want to make sure that we also add to the 'this' of
					// the instantiated types
					if (ownerTypeName.indexOf("*") === 0 && ownerTypeName.lastIndexOf('~proto') === ownerTypeName.length - '~proto'.length) {
						ownerTypeName = ownerTypeName.substring(1, ownerTypeName.lastIndexOf(':'));
					}
					env.addVariable("this", node.extras.target, ownerTypeName, node.range);
				}
			}
			
			// add parameters to the current scope
			if (params.length > 0) {
				var moduleDefs = findModuleDefinitions(node, env);
				for (i = 0; i < params.length; i++) {
					// choose jsdoc tags over module definitions
					var jsDocParam = jsdocResult.params[params[i]];
					var typeName = null;
					if (jsDocParam) {
						typeName = convertJsDocType(jsDocParam, env);
					}
					if (!typeName) {
						typeName = moduleDefs[i];
					}
					env.addVariable(params[i], node.extras.target, typeName, node.params[i].range);
				}	
			}
			break;
		case "VariableDeclarator":
			if (node.id.name) {
				// remember that the identifier is an LHS
				// so, don't create a type for it
				if (!node.id.extras) {
					node.id.extras = {};
				}
				node.id.extras.isLHS = node.id.extras.isLHSAssign = true;
				if (node.init && !node.init.extras) {
					node.init.extras = {};
				}
				if (node.init && node.init.type === "FunctionExpression") {
					// RHS is a function, remember the name in case it is a constructor
					node.init.extras.fname = node.id.name;
					node.init.extras.cname = env.getQualifiedName() + node.id.name;
					node.init.extras.fnameRange = node.id.range;
				} else {
					// not the RHS of a function, check for jsdoc comments
					jsdocResult = parseJSDocComment(findAssociatedCommentBlock(node, env.comments));
					jsdocType = convertJsDocType(jsdocResult.type, env);
					if (jsdocType) {
						node.extras.inferredType = jsdocType;
						node.extras.jsdocType = jsdocType;
						env.addVariable(node.id.name, node.extras.target, jsdocType, node.id.range);
					}
				}
			}
			env.pushName(node.id.name);
			break;
		case "AssignmentExpression":
			var rightMost = findRightMost(node.left);
			var qualName = env.getQualifiedName() + findDottedName(node.left);
			if (rightMost && rightMost.type === "Identifier") {
				if (!rightMost.extras) {
					rightMost.extras = {};
				}
				rightMost.extras.isLHSAssign = true;
				if (node.right.type === "FunctionExpression") {
					// RHS is a function, remember the name in case it is a constructor
					if (!node.right.extras) {
						node.right.extras = {};
					}
					node.right.extras.appliesTo = rightMost;
					node.right.extras.fname = rightMost.name;
					node.right.extras.cname = qualName;
					node.right.extras.fnameRange = rightMost.range;
					
					if (!node.left.extras) {
						node.left.extras = {};
					}
				}
			}
			env.pushName(qualName);
			break;
		case "CatchClause":
			// create a new scope for the catch parameter
			node.extras.inferredType = env.newScope();
			if (node.param) {	
				if (!node.param.extras) {
					node.param.extras = {};
				}
				node.param.extras.inferredType = "Error";
				env.addVariable(node.param.name, node.extras.target, "Error", node.param.range);
			}
			break;
		case "MemberExpression":
			if (node.property) {
				// keep track of the target of the property expression
				// so that its type can be used as the seed for finding properties
				if (!node.property.extras) {
					node.property.extras = {};
				}
				node.property.extras.target = node.object;
			}
			break;
		case "CallExpression":
			if (node.callee.name === "define" || node.callee.name === "require") {
				// check for AMD definition
				var args = node["arguments"];
				if (args.length > 1 && 
					args[args.length-1].type === "FunctionExpression" &&
					args[args.length-2].type === "ArrayExpression") {
					
					// assume definition
					if (!args[args.length-1].extras) {
						args[args.length-1].extras = {};
					}
					args[args.length-1].extras.amdDefn = node;
				}
			}
			break;
		}
		return true;
	}
	
	/**
	 * called as the post operation for the proposalGenerator visitor.
	 * Finishes off the inferencing and adds all proposals
	 */
	function inferencerPostOp(node, env) {
		var type = node.type, name, inferredType, newTypeName, rightMost, kvps, i;
		
		switch(type) {
		case "Program":
			// if we've gotten here and we are still in range, then 
			// we are completing as a top-level entity with no prefix
			env.shortcutVisit();
			break;
		case "BlockStatement":
		case "CatchClause":
			if (inRange(env.offset, node.range)) {
				// if we've gotten here and we are still in range, then 
				// we are completing as a top-level entity with no prefix
				env.shortcutVisit();
			}
		
			env.popScope();
			break;
		case "MemberExpression":
			if (afterDot(env.offset, node, env.contents)) {
				// completion after a dot with no prefix
				env.shortcutVisit(env.scope(node.object));
			}
			// inferred type is the type of the property expression
			// node.propery will be null for mal-formed asts
			node.extras.inferredType = node.property ? node.property.extras.inferredType : node.object.extras.inferredType;
			break;
		case "CallExpression":
			// first check to see if this is a require call
			var fnType = extractRequireModule(node, env);
			
			// otherwise, apply the function
			if (!fnType) {
				fnType = node.callee.extras.inferredType;
				fnType = extractReturnType(fnType);
			}
			node.extras.inferredType = fnType;
			break;
		case "NewExpression":
			// FIXADE we have a problem here.
			// constructors that are called like this: new foo.Bar()  should have an inferred type of foo.Bar,
			// This ensures that another constructor new baz.Bar() doesn't conflict.  However, 
			// we are only taking the final prefix and assuming that it is unique.
			node.extras.inferredType = extractReturnType(node.callee.extras.inferredType);
			break;
		case "ObjectExpression":
			// now that we know all the types of the values, use that to populate the types of the keys
			kvps = node.properties;
			for (i = 0; i < kvps.length; i++) {
				if (kvps[i].hasOwnProperty("key")) {
					// only do this for keys that are identifiers
					// set the proper inferred type for the key node
					// and also update the variable
					name = kvps[i].key.name;
					if (name) {
						// now check for the special case where the rhs value is an identifier.
						// we want to shortcut the navigation and go through to the definition 
						// of the identifier, BUT only do this if the identifier points to a function 
						// and the key and value names match.
						var range = null;
						if (name === kvps[i].value.name) {
							var def = env.lookupName(kvps[i].value.name, null, false, true);
							if (def && def.range && (isFunctionOrConstructor(def.typeName))) {
								range = def.range;
							}
						}
						if (!range) {
							range = kvps[i].key.range;
						}
						
						inferredType = kvps[i].value.extras.inferredType;
						kvps[i].key.extras.inferredType = inferredType;
						env.addVariable(name, node, inferredType, range);
					}
				}
			}
			if (node.extras.fname) {
				// this object expression is contained inside another object expression
				env.popName();
			}
			env.popScope();
			break;
		case "LogicalExpression":
		case "BinaryExpression":
			switch (node.operator) {
				case '+':
					// special case: if either side is a string, then result is a string
					if (node.left.extras.inferredType === "String" ||
						node.right.extras.inferredType === "String") {
						
						node.extras.inferredType = "String";
					} else {
						node.extras.inferredType = "Number";
					}
					break;
				case '-':
				case '/':
				case '*':
				case '%':
				case '&':
				case '|':
				case '^':
				case '<<':
				case '>>':
				case '>>>':
					// Numeric and bitwise operations always return a number
					node.extras.inferredType = "Number";
					break;
				case '&&':
				case '||':
					// will be the type of the left OR the right
					// for now arbitrarily choose the left
					node.extras.inferredType = node.left.extras.inferredType;
					break;
					
				case '!==':
				case '!=':
				case '===':
				case '==':
				case '<':
				case '<=':
				case '>':
				case '>=':
					node.extras.inferredType = "Boolean";
					break;
				
				
				default:
					node.extras.inferredType = "Object";
			}
			break;
		case "UpdateExpression":
		case "UnaryExpression":
			if (node.operator === '!') {
				node.extras.inferredType = "Boolean";
			} else {
				// includes all unary operations and update operations
				// ++ -- - and ~
				node.extras.inferredType = "Number";
			}
			break;
		case "FunctionDeclaration":
		case "FunctionExpression":
			env.popScope();
			if (node.body) {
				var fnameRange;
				if (node.body.extras.isConstructor) {
					if (node.id) {
						fnameRange = node.id.range;
					} else {
						fnameRange = node.extras.fnameRange;
					}
					
					// an extra scope was created for the implicit 'this'
					env.popScope();

					// now add a reference to the constructor
					env.addOrSetVariable(extractReturnType(node.extras.inferredType), node.extras.target, node.extras.inferredType, fnameRange);
				} else {
					// a regular function.  if we don't already know the jsdoc return,
					// try updating to a more explicit return type
					if (!node.extras.jsdocReturn) {
						var returnStatement = findReturn(node.body);
						var returnType;
						if (returnStatement) {
							returnType = returnStatement.extras.inferredType;
						} else {
							returnType = "undefined";
						}
						node.extras.inferredType = updateReturnType(node.extras.inferredType, returnType);
					}
					// if there is a name, then update that as well
					var fname;
					if (node.id) {
						// true for function declarations
						fname = node.id.name;
						fnameRange = node.id.range;
					} else if (node.extras.appliesTo) {
						// true for rhs of assignment to function expression
						fname = node.extras.fname;
						fnameRange = node.extras.fnameRange;
					}
					if (fname) {
						env.addOrSetVariable(fname, node.extras.target, node.extras.inferredType, fnameRange);
					}				
				}
			}
			break;
		case "VariableDeclarator":
			if (node.init) {
				inferredType = node.init.extras.inferredType;
			} else {
				inferredType = "Object";
			}
			node.id.extras.inferredType = inferredType;
			if (!node.extras.jsdocType) {
				node.extras.inferredType = inferredType;
				env.addVariable(node.id.name, node.extras.target, inferredType, node.id.range);
			}
			if (inRange(env.offset-1, node.id.range)) {
				// we are finished.  didn't shortcut the visit in earlier
				// since we need to wait for the type to be applied to the rightMost
				env.shortcutVisit(env.scope(node.id.extras.target));
			}
			env.popName();
			break;
		case "AssignmentExpression":
			if (node.operator === '=') {
				// standard assignment
				inferredType = node.right.extras.inferredType;
			} else {
				// +=, -=, *=, /=, >>=, <<=, >>>=, &=, |=, or ^=.
				if (node.operator === '+=' && node.left.extras.inferredType === 'String') {
					inferredType = "String";	
				} else {
					inferredType = "Number";
				}
			}
			node.extras.inferredType = inferredType;
			// when we have 'this.that.theOther.f' need to find the right-most identifier
			rightMost = findRightMost(node.left);
			if (rightMost) {
				rightMost.extras.inferredType = inferredType;
				env.addOrSetVariable(rightMost.name, rightMost.extras.target, inferredType, rightMost.range);				
				if (inRange(env.offset-1, rightMost.range)) {
					// we are finished.  didn't shortcut the visit in earlier
					// since we need to wait for the type to be applied to the rightMost
					env.shortcutVisit(env.scope(rightMost.extras.target));
				}
			}
			env.popName();
			break;
		case 'Identifier':
			name = node.name;
			newTypeName = env.lookupName(name, node.extras.target);
			if (newTypeName) {
				// name already exists
				node.extras.inferredType = newTypeName;
			} else if (!node.extras.target && !node.extras.isLHS && isAfter(env.offset, node.range)) {
				// If name doesn't already exist, then create a new object for it
				// and use that as the inferred type 
				// only want to do this when accessing an unknown identifier.
				// Should not be LHS of an assisgnment or variable declarator
				// will be added to global scope
				// Also, only add the variable if offset is after node range
				// we don't want variables used after the fact appearing in content assist
//				if (!env.lookupName(name)) {
					// name doesn't exist, add to global
					node.extras.inferredType = env.addOrSetGlobalVariable(name, null, node.range);
//				}
			}
			
			// if this node is an LHS of an assignment, shortcut the visit here.
			// We must apply the type of the RHS first.  This happens
			// in the enclosing assignment or variable declarator expressions
			if (!node.extras.isLHSAssign && inRange(env.offset-1, node.range)) {
				// We're finished compute all the proposals
				env.shortcutVisit(env.scope(node.extras.target));
			}
			break;
		case "ThisExpression":
			node.extras.inferredType = env.lookupName("this");
			break;
		case "ReturnStatement":
			if (node.argument) {
				node.extras.inferredType = node.argument.extras.inferredType;
			}
			break;
		}
		
		if (!node.extras.inferredType) {
			node.extras.inferredType = "Object";
		}
	}

	
	/**
	 * add variable names from inside a jslint global directive
	 */
	function addJSLintGlobals(env, jsLintOptions) {
		var i, globName;
		if (jsLintOptions && isArray(jsLintOptions.global)) {
			for (i = 0; i < jsLintOptions.global.length; i++) {
				globName = jsLintOptions.global[i];
				if (!env.lookupName(globName)) {
					env.addOrSetVariable(globName);
				}
			}
		}
		var comments = env.comments;
		if (comments) {
			for (i = 0; i < comments.length; i++) {
				var range = comments[i].range;
				if (comments[i].type === "Block" && comments[i].value.substring(0, "global".length) === "global") {
					var globals = comments[i].value;
					var splits = globals.split(/\s+/);
					// start with 1 to avoid 'global'
					for (var j = 1; j < splits.length; j++) {
						if (splits[j].length > 0) {
							var colonIdx = splits[j].indexOf(':');
							if (colonIdx >= 0) {
								globName = splits[j].substring(0,colonIdx).trim();
							} else {
								globName = splits[j].trim();
							}
							if (!env.lookupName(globName)) {
								env.addOrSetVariable(globName, null, null, range);
							}
						}
					}
					break;
				}
			}
		}
	}
	
	/**
	 * Adds global variables defined in dependencies
	 */
	function addIndexedGlobals(env) {
		// no indexer means that we should not consult indexes for extra type information
		if (env.indexer) {
			// get the list of summaries relevant for this file
			// add it to the global scope
			var summaries = env.indexer.retrieveGlobalSummaries();
			for (var fileName in summaries) {
				if (summaries.hasOwnProperty(fileName)) {
					env.mergeSummary(summaries[fileName], env.globalTypeName());
				}
			}
		} 
	}
	
	/**
	 * the prefix of a completion should not be included in the completion itself
	 * must explicitly remove it
	 */
	function removePrefix(prefix, string) {
		return string.substring(prefix.length);
	}
	
	/**
	 * creates a human readable type name from the name given
	 */
	function createReadableType(typeName, env, useFunctionSig, depth) {
		var first = typeName.charAt(0);
		if (first === "?" || first === "*") {
			// a function
			var nameEnd = typeName.lastIndexOf(":");
			if (nameEnd === -1) {
				nameEnd = typeName.length;
			}
			var funType = typeName.substring(1, nameEnd);
			if (useFunctionSig) {
				// convert into a function signature
				var prefix = first === "?" ? "" : "new";
				var args = typeName.substring(nameEnd+1, typeName.length);
				return prefix + "(" + args + ") -> " + createReadableType(funType, env, useFunctionSig, 1);
			} else {
				// use the return type
				return createReadableType(funType, env, useFunctionSig, 0);
			}
		} else if (typeName.indexOf("gen~") === 0) {
			// a generated object
			// create a summary
			var type = env.findType(typeName);
			var res = "{ ";
			for (var val in type) {
				if (type.hasOwnProperty(val) && val !== "$$proto") {
					if (res.length > 2) {
						res += ", ";
					}
					var name;
					// don't show inner objects
					if (!depth) {
						name = createReadableType(type[val].typeName, env, false, 1);
					} else {
						name = "{...}";
					}
					res += val + " : " + name;
				}
			}
			return res + " }";
		} else {
			return typeName;
		}
	}

	/**
	 * Determines if the left type name is more general than the right type name.  
	 * Generality (>) is defined as follows:
	 * undefined > Object > Generated empty type > all other types
	 *
	 * A generated empty type is a generated type that has only a $$proto property
	 * added to it.  Additionally, the type specified in the $$proto property is
	 * either empty or is Object
	 * 
	 * @param String leftTypeName
	 * @param String rightTypeName
	 * @param {{getAllTypes:function():Object}} env
	 * 
	 * @return Boolean
	 */
	function leftTypeIsMoreGeneral(leftTypeName, rightTypeName, env) {
		function isEmpty(generatedTypeName) {
			if (generatedTypeName === "Object" || generatedTypeName === "undefined") {
				return true;
			} else if (leftTypeName.substring(0, GEN_NAME.length) !== GEN_NAME) {
				return false;
			}
			
			
			var type = env.getAllTypes()[generatedTypeName];
			var popCount = 0;
			// type should have a $$proto only and nothing else if it is empty
			for (var property in type) {
				if (type.hasOwnProperty(property)) {
					popCount++;
					if (popCount > 1) {
						break;
					}
				}
			}
			if (popCount === 1) {
				// we have an empty object literal, must check parent
				// must traverse prototype hierarchy to make sure empty
				return isEmpty(type.$$proto.typeName);
			}
			return false;
		}
		
		function convertToNumber(typeName) {
			if (typeName === "undefined") {
				return 0;
			} else if (typeName === "Object") {
				return 1;
			} else if (isEmpty(typeName)) {
				return 2;
			} else {
				return 3;
			}
		}
		
		if (!rightTypeName) {
			return false;
		}
		
		var leftNum = convertToNumber(leftTypeName);
		// avoid calculating the rightNum if possible
		if (leftNum === 0) {
			return rightTypeName !== "undefined";
		} else if (leftNum === 1) {
			return rightTypeName !== "undefined" && rightTypeName !== "Object";
		} else if (leftNum === 2) {
			return rightTypeName !== "undefined" && rightTypeName !== "Object" && !isEmpty(rightTypeName);
		} else {
			return false;
		}
	}
	
	/**
	 * @return boolean true iff the type contains 
	 * prop.  prop must not be coming from Object
	 */
	function typeContainsProperty(type, prop) {
		if (! (prop in type)) {
			return false;
		}
		if (Object.hasOwnProperty(prop)) {
			// the propery may be re-defined in the current type
			// check that here
			return !type.hasOwnProperty(prop);
		}
		return true;
	}

	/**
	 * Creates the environment object that stores type information
	 * Called differently depending on what job this content assistant is being called to do.
	 */
	function createEnvironment(options) {
		var buffer = options.buffer, uid = options.uid, offset = options.offset, indexer = options.indexer, isInBrowser = options.isBrowser;
		if (!offset) {
			offset = buffer.length+1;
		}
		
		// must copy comments because the array is mutable
		var comments = [];
		if (options.comments) {
			for (var i = 0; i < options.comments.length; i++) {
				comments[i] = options.comments[i];
			}
		}
		
		// prefix for generating local types
		// need to add a unique id for each file so that types defined in dependencies don't clash with types
		// defined locally
		var namePrefix = GEN_NAME + uid + "~";

		return {
			/** Each element is the type of the current scope, which is a key into the types array */
			_scopeStack : [(isInBrowser ? "Window" : "Global")],
			/** 
			 * a map of all the types and their properties currently known 
			 * when an indexer exists, local storage will be checked for extra type information
			 */
			_allTypes : new mTypes.Types(isInBrowser),
			/** a counter used for creating unique names for object literals and scopes */
			_typeCount : 0,
			
			_nameStack : [],
			
			/** if this is an AMD module, then the value of this property is the 'define' call expression */
			amdModule : null,	
			/** if this is a wrapped commonjs module, then the value of this property is the 'define' call expression */
			commonjsModule : null,	
			/** the indexer for thie content assist invocation.  Used to track down dependencies */
			indexer: indexer,
			/** the offset of content assist invocation */
			offset : offset, 
			/** the entire contents being completed on */
			contents : buffer,
			uid : uid === 'local' ? null : uid,
			
			/** List of comments in the AST*/
			comments : comments,
			
			newName: function() {
				return namePrefix + this._typeCount++;
			},
			/** 
			 * Creates a new empty scope and returns the name of the scope
			 * must call this.popScope() when finished with this scope
			 */
			newScope: function(range) {
				// the prototype is always the currently top level scope
				var targetType = this.scope();
				var newScopeName = this.newName();
				this._allTypes[newScopeName] = {
					$$proto : new mTypes.Definition(targetType, range, this.uid)
				};
				this._scopeStack.push(newScopeName);
				return newScopeName;
			},
			
			pushName : function(name) {
				this._nameStack.push(name);
			},
			
			popName : function() {
				this._nameStack.pop();
			},
			
			getQualifiedName : function() {
				var name = this._nameStack.join('.');
				return name.length > 0 ? name + '.' : name;
			},
			
			/**
			 * Creates a new empty object scope and returns the name of this object 
			 * must call this.popScope() when finished
			 */
			newObject: function(newObjectName, range) {
				// object needs its own scope
				this.newScope();
				// if no name passed in, create a new one
				newObjectName = newObjectName? newObjectName : this.newName();
				// assume that objects have their own "this" object
				// prototype of Object
				this._allTypes[newObjectName] = {
					$$proto : new mTypes.Definition("Object", range, this.uid)
				};
				this.addVariable("this", null, newObjectName, range);
				
				return newObjectName;
			},
			
			/**
			 * like a call to this.newObject(), but the 
			 * object created has not scope added to the scope stack
			 */
			newFleetingObject : function(name, range) {
				var newObjectName = name ? name : this.newName();
				this._allTypes[newObjectName] = {
					$$proto : new mTypes.Definition("Object", range, this.uid)
				};
				return newObjectName;
			},
			
			/** removes the current scope */
			popScope: function() {
				// Can't delete old scope since it may have been assigned somewhere
				// but must remove "this" when outside of the scope
				this.removeVariable("this");
				var oldScope = this._scopeStack.pop();
				return oldScope;
			},
			
			/**
			 * @param {ASTNode|String} target 
			 * returns the type name for the current scope
			 * if a target is passed in (optional), then use the
			 * inferred type of the target instead (if it exists)
			 */
			scope : function(target) {
				if (typeof target === "string") {
					return target;
				}
			
				if (target && target.extras.inferredType) {
					// check for function literal
					var inferredType = target.extras.inferredType;
					// hmmmm... will be a problem here if there are nested ~protos
					if (isFunctionOrConstructor(inferredType) && inferredType.indexOf("~proto") === -1) {
						var noArgsType = inferredType.substring(0, inferredType.lastIndexOf(':')+1);
						if (this._allTypes[noArgsType]) {
							return noArgsType;
						} else {
							return "Function";
						}
					} else {
						return inferredType;
					}
				} else {
					// grab topmost scope
					return this._scopeStack[this._scopeStack.length -1];
				}
			},
			
			globalScope : function() {
				return this._allTypes[this._scopeStack[0]];
			},
			
			globalTypeName : function() {
				return this._scopeStack[0];
			},
			
			/** 
			 * adds the name to the target type.
			 * if target is passed in then use the type corresponding to 
			 * the target, otherwise use the current scope
			 * 
			 * Will not override an existing variable if the new typeName is "Object" or "undefined"
			 * Will not add to a built in type
			 * 
			 * @param {String} name
			 * @param {String} typeName
			 * @param {Object} target
			 * @param {Array.<Number>} range
			 */
			addVariable : function(name, target, typeName, range) {
				if (this._allTypes.Object["$_$" + name]) {
					// this is a built in property of object.  do not redefine
					return;
				}
				var type = this._allTypes[this.scope(target)];
				// do not allow augmenting built in types
				if (!type.$$isBuiltin) {
					// if new type name is not more general than old type, do not replace
					if (typeContainsProperty(type, name) && leftTypeIsMoreGeneral(typeName, type[name].typeName, this)) {
						// do nuthin
					} else {
						type[name] = new mTypes.Definition(typeName ? typeName : "Object", range, this.uid);
					}
				}
			},
			
			addOrSetGlobalVariable : function(name, typeName, range) {
				if (this._allTypes.Object["$_$" + name]) {
					// this is a built in property of object.  do not redefine
					return;
				}
				return this.addOrSetVariable(name, 
					// mock an ast node with a global type
					{ extras : { inferredType : this.globalTypeName() } }, typeName, range);
			},
			
			/** 
			 * like add variable, but first checks the prototype hierarchy
			 * if exists in prototype hierarchy, then replace the type
			 * 
			 * Will not override an existing variable if the new typeName is "Object" or "undefined"
			 */
			addOrSetVariable : function(name, target, typeName, range) {
				if (name === 'prototype') {
					name = '$$proto';
				} else if (this._allTypes.Object["$_$" + name]) {
					// this is a built in property of object.  do not redefine
					return;
				}

				var targetType = this.scope(target);
				var current = this._allTypes[targetType], found = false;
				// if no type provided, create a new type
				typeName = typeName ? typeName : this.newFleetingObject();
				while (current) {
					if (typeContainsProperty(current, name)) {
						// found it, just overwrite
						// do not allow overwriting of built in types
						// 3 cases to avoid: 
						//  1. properties of builtin types cannot be set 
						//  2. builtin types cannot be redefined
						//  3. new type name is more general than old type
						if (!current.$$isBuiltin && current.hasOwnProperty(name) && 
								!leftTypeIsMoreGeneral(typeName, current[name].typeName, this)) {
							current[name].typeName = typeName;
						}
						found = true;
						break;
					} else if (current.$$proto) {
						current = this._allTypes[current.$$proto.typeName];
					} else {
						current = null;
					}
				}
				
				if (!found) {
					// not found, so just add to current scope
					// do not allow overwriting of built in types
					var type = this._allTypes[targetType];
					if (!type.$$isBuiltin) {
						type[name] = new mTypes.Definition(typeName, range, this.uid);
					}
				}
				return typeName;
			},
						
			/** looks up the name in the hierarchy */
			lookupName : function(name, target, applyFunction, includeDefinition) {
			
				// translate function names on object into safe names
				var swapper = function(name) {
					switch (name) {
						case "prototype":
							return "$$proto";
						case "toString":
						case "hasOwnProperty":
						case "toLocaleString":
						case "valueOf":
						case "isProtoTypeOf":
						case "propertyIsEnumerable":
							return "$_$" + name;
						default:
							return name;
					}
				};
			
				var innerLookup = function(name, type, allTypes) {
					var res = type[name];
					
					var proto = type.$$proto;
					if (res) {
						return includeDefinition ? res : res.typeName;
					} else if (proto) {
						return innerLookup(name, allTypes[proto.typeName], allTypes);
					} else {
						return null;
					}
				};
				var targetType = this._allTypes[this.scope(target)];
				var res = innerLookup(swapper(name), targetType, this._allTypes);
				return res;
			},
			
			/** removes the variable from the current type */
			removeVariable : function(name, target) {
				// do not allow deleting properties of built in types
				var type = this._allTypes[this.scope(target)];
				// 2 cases to avoid: 
				//  1. properties of builtin types cannot be deleted
				//  2. builtin types cannot be deleted from global scope
				if (!type.$$isBuiltin && type[name] && !(type[name] && !type.hasOwnProperty(name))) {
					delete type[name];
				}
			},
			
			/**
			 * adds a file summary to this module
			 */
			mergeSummary : function(summary, targetTypeName) {
			
				// add the extra types that don't already exists
				for (var type in summary.types) {
					if (summary.types.hasOwnProperty(type) && !this._allTypes[type]) {
						this._allTypes[type] = summary.types[type];
					}
				}
				
				// now augment the target type with the provided properties
				// but only if a composite type is exported
				var targetType = this._allTypes[targetTypeName];
				if (typeof summary.provided !== 'string') {
					for (var providedProperty in summary.provided) {
						if (summary.provided.hasOwnProperty(providedProperty)) {
							// the targetType may already have the providedProperty defined
							// but should override
							targetType[providedProperty] = summary.provided[providedProperty];
						}
					}
				}
			},
			
			/**
			 * takes the name of a constructor and converts it into a type.
			 * We need to ensure that ConstructorName.prototype = { ... } does the
			 * thing that we expect.  This is why we set the $$proto property of the types
			 */
			createConstructor : function(constructorName, rawTypeName) {
				// don't include the parameter names since we don't want them confusing things when exported
				constructorName = constructorName.substring(0,constructorName.lastIndexOf(":")+1);
				this.newFleetingObject(constructorName);
				var flobj = this.newFleetingObject(constructorName + "~proto");
				this._allTypes[constructorName].$$proto = new mTypes.Definition(flobj, this.uidj);
				this._allTypes[rawTypeName].$$proto = new mTypes.Definition(constructorName, this.uid);
			},
			
			findType : function(typeName) {
				// trim arguments if a constructor, careful to avoid a constructor prototypes
				if (typeName.charAt(0) === "?") {
					typeName = typeName.substring(0, typeName.lastIndexOf(':')+1);
					
					if (!this._allTypes[typeName]) {
						// function type has not been explicitly added to list
						// just return function instead
						return this._allTypes.Function;
					}
				}
				return this._allTypes[typeName];
			},
			
			getAllTypes : function() {
				return this._allTypes;
			},
			
			/**
			 * call this function to end the visit
			 * all visits end with calling this method
			 */
			shortcutVisit : function(targetType) {
				if (!targetType) {
					targetType = this.scope();
				}
				throw targetType;
			}
		};
	}
	
	function createProposalDescription(propName, propType, env) {
		return propName + " : " + createReadableType(propType, env);
	}
	
	function createInferredProposals(targetTypeName, env, completionKind, prefix, replaceStart, proposals, relevance) {
		var prop, propName, propType, res, type = env.findType(targetTypeName), proto = type.$$proto;
		if (!relevance) {
			relevance = 100;
		}
		// start at the top of the prototype hierarchy so that duplicates can be removed
		if (proto) {
			createInferredProposals(proto.typeName, env, completionKind, prefix, replaceStart, proposals, relevance - 10);
		}
		
		// add a separator proposal
		proposals['---dummy' + relevance] = {
			proposal: '',
			description: '---------------------------------',
			relevance: relevance -1,
			style: 'hr',
			unselectable: true
		};

		// need to look at prototype for global and window objects
		// so need to traverse one level up prototype hierarchy if 
		// the next level is not Object
		var realProto = Object.getPrototypeOf(type);
		var protoIsObject = !Object.getPrototypeOf(realProto);
		for (prop in type) {
			if (type.hasOwnProperty(prop) || (!protoIsObject && realProto.hasOwnProperty(prop))) {
				if (prop.charAt(0) === "$" && prop.charAt(1) === "$") {
					// special property
					continue;
				}
				if (!proto && prop.indexOf("$_$") === 0) {
					// no prototype that means we must decode the property name
					propName = prop.substring(3);
				} else {
					propName = prop;
				}
				if (propName === "this" && completionKind === "member") {
					// don't show "this" proposals for non-top-level locations
					// (eg- this.this is wrong)
					continue;
				}
				if (!type[prop].typeName) {
					// minified files sometimes have invalid property names (eg- numbers).  Ignore them)
					continue;
				}
				if (propName.indexOf(prefix) === 0) {
					propType = type[prop].typeName;
					var first = propType.charAt(0);
					if (first === "?" || first === "*") {
						// we have a function
						res = calculateFunctionProposal(propName, 
								propType, replaceStart - 1);
						var funcDesc = res.completion + " : " + createReadableType(propType, env);
						proposals["$"+propName] = {
							proposal: removePrefix(prefix, res.completion), 
							description: funcDesc,
							positions: res.positions, 
							escapePosition: replaceStart + res.completion.length,
							// prioritize methods over fields
							relevance: relevance + 5,
							style: 'emphasis'
						};
					} else {
						proposals["$"+propName] = { 
							proposal: removePrefix(prefix, propName),
							relevance: relevance,
							description: createProposalDescription(propName, propType, env),
							style: 'emphasis'
						};
					}
				}
			}
		}
	}
	
	function createNoninferredProposals(environment, prefix, replaceStart, proposals) {
		var proposalAdded = false;
		// a property to return is one that is 
		//  1. defined on the type object 
		//  2. prefixed by the prefix
		//  3. doesn't already exist
		//  4. is not an internal property
		function isInterestingProperty(type, prop) {
			return type.hasOwnProperty(prop) && prop.indexOf(prefix) === 0 && !proposals['$' + prop] && prop !== '$$proto'&& prop !== '$$isBuiltin';
		}
		function forType(type) {
			for (var prop in type) {
				if (isInterestingProperty(type, prop)) {
					var propType = type[prop].typeName;
					var first = propType.charAt(0);
					if (first === "?" || first === "*") {
						var res = calculateFunctionProposal(prop, propType, replaceStart - 1);
						proposals[prop] = {
							proposal: removePrefix(prefix, res.completion), 
							description: createProposalDescription(prop, propType, environment),
							positions: res.positions, 
							escapePosition: replaceStart + res.completion.length,
							// prioritize methods over fields
							relevance: -99,
							style: 'noemphasis'
						};
						proposalAdded = true;
					} else {
						proposals[prop] = {
							proposal: removePrefix(prefix, prop),
							description: createProposalDescription(prop, propType, environment),
							relevance: -100,
							style: 'noemphasis'
						};
						proposalAdded = true;
					}
				}
			}
		}
		var allTypes = environment.getAllTypes();
		for (var typeName in allTypes) {
			// need to traverse into the prototype
			if (allTypes[typeName].$$proto) {
				forType(allTypes[typeName]);
			}
		}
		
		if (proposalAdded) {
			proposals['---dummy'] = {
				proposal: '',
				description: 'Non-inferred proposals',
				relevance: -98,
				style: 'noemphasis',
				unselectable: true
			};
		}
	}
	
	function findUnreachable(currentTypeName, allTypes, alreadySeen) {
		var currentType = allTypes[currentTypeName];
		if (currentType) {
			for(var prop in currentType) {
				if (currentType.hasOwnProperty(prop) && prop !== '$$isBuiltin' ) {
					var propType = currentType[prop].typeName;
					while (isFunctionOrConstructor(propType)) {
						if (!alreadySeen[propType]) {
							alreadySeen[propType] = true;
							findUnreachable(propType, allTypes, alreadySeen);
						}
						propType = extractReturnType(propType);					
					}
					if (!alreadySeen[propType]) {
						alreadySeen[propType] = true;
						findUnreachable(propType, allTypes, alreadySeen);
					}
				}
			}
		}
	}
	
	/**
	 * filters types from the environment that should not be exported
	 */
	function filterTypes(environment, kind, moduleTypeName) {
		var allTypes = environment.getAllTypes();
		if (kind === "global") {
			// for global dependencies must keep the global scope, but remove all builtin global variables
			allTypes.clearDefaultGlobal();
		} else {
			delete allTypes.Global;
		}

		// recursively walk the type tree to find unreachable types and delete them, too
		var reachable = { };
		// if we have a function, then the function return type and its prototype are reachable 
		// in the module, so add them
		if (isFunctionOrConstructor(moduleTypeName)) {
			var retType = moduleTypeName;
			while (isFunctionOrConstructor(retType)) {
				retType = retType.substring(0,retType.lastIndexOf(':')+1);
				reachable[retType] = true;
				var constrType;
				if (retType.charAt(0) === "?") {
					// this is a function, not a constructor, but we also
					// need to expose the constructor if one exists.
					constrType = "*" + retType.substring(1);
					reachable[constrType] = true;
				} else {
					constrType = retType;
				}
				reachable[constrType + "~proto"] = true;
				retType = extractReturnType(retType);
			}
			reachable[retType] = true;
		}
		findUnreachable(moduleTypeName, allTypes, reachable);
		for (var prop in allTypes) {
			if (allTypes.hasOwnProperty(prop) && !reachable[prop]) {
				delete allTypes[prop];
			}
		}
	}
	
	function isBrowser(comments, jsLintOptions) {
	
		for (var i = 0; i < comments.length; i++) {
			var comment = comments[i];
			if (comment.type === "Block" && comment.value.substring(0, "jslint".length) === "jslint") {
				var commentText = comment.value;
				// the jslint options seciton.  now look for the browser
				var browserIndex = comment.value.indexOf('browser');
				if (browserIndex > 0) {
					var colonIndex = commentText.indexOf(':', browserIndex);
					if (colonIndex > 0) {
						var trueIndex = commentText.indexOf('true', colonIndex);
						var commaIndex = commentText.indexOf(',', colonIndex);
						if (trueIndex > 0 && (trueIndex < commaIndex || commaIndex === -1)) {
							return true;
						} else {
							return false;
						}
					}
				}
			}
		}
		if (jsLintOptions && jsLintOptions.options) {
			return jsLintOptions.options.browser;
		} else {
			return false;
		}
	}
	
	function filterAndSortProposals(proposalsObj) {
		// convert from object to array
		var proposals = [];
		for (var prop in proposalsObj) {
			if (proposalsObj.hasOwnProperty(prop)) {
				proposals.push(proposalsObj[prop]);
			}
		}
		proposals.sort(function(l,r) {
			// sort by relevance and then by name
			if (l.relevance > r.relevance) {
				return -1;
			} else if (r.relevance > l.relevance) {
				return 1;
			}
			if (l.description < r.description) {
				return -1;
			} else if (r.description < l.description) {
				return 1;
			}
			return 0;
		});
		
		// filter trailing and leading dummies, as well as double dummies
		var toRemove = [];
		
		// now remove any leading or trailing dummy proposals as well as double dummies
		var i = proposals.length -1;
		while (i >= 0 && proposals[i].description.indexOf('---') === 0) {
			toRemove[i] = true;
			i--;
		}
		i = 0;
		while (i < proposals.length && proposals[i].description.indexOf('---') === 0) {
			toRemove[i] = true;
			i++;
		}
		i += 1;
		while (i < proposals.length) {
			if (proposals[i].description.indexOf('---') === 0 && proposals[i-1].description.indexOf('---') === 0) {
				toRemove[i] = true;
			}
			i++;
		}
		
		var newProposals = [];
		for (i = 0; i < proposals.length; i++) {
			if (!toRemove[i]) {
				newProposals.push(proposals[i]);
			}
		}
		
		return newProposals;
	}
	

	/**
	 * indexer is optional.  When there is no indexer passed in
	 * the indexes will not be consulted for extra references
	 * @param {{hasDependency,performIndex,retrieveSummary,retrieveGlobalSummaries}} indexer
	 * @param {{global:[],options:{browser:Boolean}}=} jsLintOptions optional set of extra jslint options that can be overridden in the source
	 */
	function EsprimaJavaScriptContentAssistProvider(indexer, jsLintOptions) {
		this.indexer = indexer;
		this.jsLintOptions = jsLintOptions;
	}
	
	/**
	 * Main entry point to provider
	 */
	EsprimaJavaScriptContentAssistProvider.prototype = {
	
		_doVisit : function(root, environment) {
			// first augment the global scope with things we know
			addJSLintGlobals(environment, this.jsLintOptions);
			addIndexedGlobals(environment);
			
			// now we can remove all non-doc comments from the comments list
			var newComments = [];
			for (var i = 0; i < environment.comments.length; i++) {
				if (environment.comments[i].value.charAt(0) === '*') {
					newComments.push(environment.comments[i]);
				}
			}
			environment.comments = newComments;
			
			try {
				mVisitor.visit(root, environment, inferencer, inferencerPostOp);
			} catch (done) {
				if (typeof done !== "string") {
					// a real error
					throw done;
				}
				return done;
			}
			throw new Error("The visit function should always end with a throwable");
		},
		
		/**
		 * implements the Orion content assist API
		 */
		computeProposals: function(buffer, offset, context) {
			try {
				var root = mVisitor.parse(buffer);
				// note that if selection has length > 0, then just ignore everything past the start
				var completionKind = shouldVisit(root, offset, context.prefix, buffer);
				if (completionKind) {
					var environment = createEnvironment({ buffer: buffer, uid : "local", offset : offset, indexer : this.indexer, isBrowser : isBrowser(root.comments, this.jsLintOptions), comments : root.comments });
					var target = this._doVisit(root, environment);
					var proposalsObj = { };
					createInferredProposals(target, environment, completionKind, context.prefix, offset - context.prefix.length, proposalsObj);
					if (!context.inferredOnly) {
						// include the entire universe as potential proposals
						createNoninferredProposals(environment, context.prefix, offset - context.prefix.length, proposalsObj);
					}
					return filterAndSortProposals(proposalsObj);
				} else {
					// invalid completion location
					return [];
				}
			} catch (e) {
				if (typeof scriptedLogger !== "undefined") {
					scriptedLogger.error(e.message, "CONTENT_ASSIST");
					scriptedLogger.error(e.stack, "CONTENT_ASSIST");
				}
				throw (e);
			}
		},
		
		
		_internalFindDefinition : function(buffer, offset, findName) {
			var toLookFor;
			var root = mVisitor.parse(buffer);
			var environment = createEnvironment({ buffer: buffer, uid : "local", offset : offset, indexer : this.indexer, isBrowser : isBrowser(root.comments, this.jsLintOptions), comments : root.comments });
			var findIdentifier = function(node) {
				if ((node.type === "Identifier" || node.type === "ThisExpression") && inRange(offset, node.range, true)) {
					toLookFor = node;
					// cut visit short
					throw "done";
				}
				// FIXADE esprima bug...some call expressions have incorrect slocs.
				// This is fixed in trunk of esprima.
				// after next upgrade of esprima if the following has correct slocs, then 
				// can remove the second part of the && 
				//    mUsers.getUser().name
				if (node.range[0] > offset &&
						(node.type === "ExpressionStatement" || 
						 node.type === "ReturnStatement" ||
						 node.type === "ifStatement" ||
						 node.type === "WhileStatement" ||
						 node.type === "Program")) {
					// not at a valid hover location
					throw "no hover";
				}
				return true;
			};
			
			try {
				mVisitor.visit(root, {}, findIdentifier);
			} catch (e) {
				if (e === "no hover") {
					// not at a valid hover location
					return null;
				} else if (e === "done") {
					// valid hover...continue
				} else {
					// a real exception
					throw e;
				}
			}
			if (!toLookFor) {
				// no hover target found
				return null;
			}
			
			this._doVisit(root, environment);
			var lookupName = toLookFor.type === "Identifier" ? toLookFor.name : 'this';
			var maybeType = environment.lookupName(lookupName, toLookFor.extras.target, false, true);
			if (maybeType) {
				var hover = lookupName + " :: " + createReadableType(maybeType.typeName, environment, true);
				if (findName) {
					return hover;
				} else {
					maybeType.hover = lookupName + " :: " + createReadableType(maybeType.typeName, environment, true);
					return maybeType;
				}
			} else {
				return null;
			}
		
		},
		/**
		 * Computes the hover information for the provided offset
		 */
		computeHover: function(buffer, offset) {
			return this._internalFindDefinition(buffer, offset, true);
		},
		
		findDefinition : function(buffer, offset) {
			return this._internalFindDefinition(buffer, offset, false);
		},
		
		/**
		 * Computes a summary of the file that is suitable to be stored locally and used as a dependency 
		 * in another file
		 * @param {String} buffer
		 * @param {String} fileName
		 */
		computeSummary: function(buffer, fileName) {
			var root = mVisitor.parse(buffer);
			var environment = createEnvironment({ buffer: buffer, uid : fileName, isBrowser : isBrowser(root.comments, this.jsLintOptions), comments : root.comments, indexer : this.indexer });
			try {
				this._doVisit(root, environment);
			} catch (e) {
				if (typeof scriptedLogger !== "undefined") {
					scriptedLogger.error(e.message, "CONTENT_ASSIST");
					scriptedLogger.error(e.stack, "CONTENT_ASSIST");
				}
				throw (e);
			}
			var provided;
			var kind;
			var modType;
			if (environment.amdModule) {
				// provide the exports of the AMD module
				// the exports is the return value of the final argument
				var args = environment.amdModule["arguments"];
				if (args && args.length > 0) {
					modType = extractReturnType(args[args.length-1].extras.inferredType);
				} else {
					modType = "Object";
				}
				kind = "AMD";
			} else if (environment.commonjsModule) {
				// a wrapped commonjs module
				// we have already checked the correctness of this function
				var exportsParam = environment.commonjsModule["arguments"][0].params[1];
				modType = exportsParam.extras.inferredType;
				provided = provided = environment.findType(modType);
					
			} else {
				// assume a non-module
				provided = environment.globalScope();
				
				if (provided.exports) {
					// actually, commonjs
					kind = "commonjs";
					modType = provided.exports.typeName;
				} else {
					kind = "global";
					modType = environment.globalTypeName();
				}
			}
			
			// simplify the exported type
			if (isFunctionOrConstructor(modType) || environment.findType(modType).$$isBuiltin) {
				// this module provides a built in type or a function
				provided = modType;
			} else {
				// this module provides a composite type
				provided = environment.findType(modType);
			}


			// now filter the builtins since they are always available
			filterTypes(environment, kind, modType);
			
			var allTypes = environment.getAllTypes();
			
			return {
				provided : provided,
				types : allTypes,
				kind : kind
			};
		}
	};
	return {
		EsprimaJavaScriptContentAssistProvider : EsprimaJavaScriptContentAssistProvider
	};
});

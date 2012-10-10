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
// tree-matcher.js
// 

var abortableWalk = require('./tree-walker').abortableWalk;

// Tree = <tree from esprima>
// Pattern = Tree -> Matcher
// Matcher = (successCallback, failCallback) -> void
// successCallback = MatchInfo -> Whatever
// failCallback = () -> Whatever


// This function avoids very deep recursion by not calling the function directly, 
// but asking node to call it later (but as soon as possible).
// This is a workaround for the fact that node has no tail call optimization.
function tailcall(thunk) {
	thunk();
//	setTimeout(thunk, 0);
}

//typePat :: String -> Pattern  
// Create a pattern that matches only trees of a given type.
// the success function will be called with the matching node.
function typePat(name) {
	return function (tree) {
		return function (success, fail) {
			//console.log('typePatMatch on : '+tree);
			if (tree && tree.type===name) {
				success(tree);
			} else {
				tailcall(fail);
			}
		};
	};
}

//failMatcher :: Matcher
function failMatcher(success, fail) {
	tailcall(fail);
}

//successMatcher :: Value -> Matcher
//creates a matcher that allways succeeds and passes a given value to
//success function.
function successMatcher(value) {
	return function(success, fail) {
		success(value);
	};
}

function variablePat(type) {
	var me;
	if (type) {
		me = function(tree) {
			if (typeof(tree)===type) {
				me.value = tree;
				return successMatcher(tree);
			} else {
				return failMatcher;
			}
		};
		return me;
	} else {
		me = function (tree) {
			me.value = tree;
			return successMatcher(tree);
		};
		return me;
	}
}

//failPat :: Pattern
function failPat(tree) {
	return failMatcher;
}

//succesPat :: Pattern
function successPat(tree) {
	return successMatcher(tree);
}

function getChildren(object) {
	var children = [];
	if (typeof(object)==='object') {
		for (var property in object) {
			if (object.hasOwnProperty(property)) {
				children.push(object[property]);
			}
		}
	}
	return children;
}

//equalPat :: Value -> Pattern
//Creates a pattern that matches only when matched object is equal to given value.
function equalPat(value) {
	return function(tree) {
		if (value===tree) {
			return successMatcher(tree);
		} else {
			return failMatcher;
		}
	};
}

function isPattern(x) {
	//TODO: lot's of things that aren't patterns are functions.
	// find a better way to 'recognize' patterns.
	return typeof(x)==='function';
}

//fieldPat :: (String, Pattern) -> Pattern
//create a pattern that matches any object that has a field with given name and who's
//field value matches a given pattern.
//success function will receive the matching tree node (the one that has the field, not the value of the field).
function fieldPat(name, valueOrPat) {
	if (isPattern(valueOrPat)) {
		var valuePat = valueOrPat;
		return function(tree) {
			if (tree!==null && typeof(tree)==='object' && tree.hasOwnProperty(name)) {
				return function (success, fail) {
					valuePat(tree[name])(
						/*success*/
						function (value) {
							success(tree);
						},
						fail
					);
				};
			} else {
				return failMatcher;
			}
		};
	} else if (typeof(valueOrPat)==='string') {
		return fieldPat(name, equalPat(valueOrPat));
	} else {
		throw 'non-supported type of argument for fieldPat: '+valueOrPat; 
	}
}

//andPat :: [Pattern] -> Pattern
//create a pattern that only matches if all of its children match
function andPat(patterns) {

	if (!patterns || !patterns.hasOwnProperty('length')) {
		throw 'argument to andPat should be an array';
	}

	function andPat2(p1, p2) {
		return function(tree) {
			return function(success, fail) {
				p1(tree)(
					/*p1.success*/
					function (p1result) {
						p2(tree)(
							/*p2.success*/
							function (p2result) {
								success(p1result && p2result);
							},
							fail
						);
					},
					fail
				);
			};
		};
	}

	function help(i) {
		if (i<patterns.length) {
			if (i===patterns.length-1) {
				//only one pattern left
				return patterns[i];
			} else {
				//more than one pattern left. Reduce with binary and
				return andPat2(patterns[i], help(i+1));
			}
		} else {
			//no patterns left. 
			return successPat;
		}
	}
	return help(0);
}

//objectPat :: Object -> Pattern
//Creates a pattern that matches a node in the tree that looks like the given object.
//A node is deemed to look like a given object if it has all of the fields of the
//object. And the values attached to the fields in the tree also match the values in
//the object. 
function objectPat(obj) {
	if (typeof(obj)==='object') {
		var childPatterns = [];
		for (var property in obj) {
			if (obj.hasOwnProperty(property)) {
				childPatterns.push(fieldPat(property, objectPat(obj[property])));
			}
		}
		return andPat(childPatterns);
	} else if (typeof(obj)==='string') {
		return equalPat(obj);	
	} else if (isPattern(obj)) {
		return obj;
	} else {
		throw 'unsupported argument for objectPat: '+obj;
	}
}

function toPattern(x) {
	if (isPattern(x)) {
		return x;
	}
	return objectPat(x);
}

//orPat :: [Pattern] -> Pattern
//create a pattern that matches if any of its children match
//the children are tried left-to-right and the result is
//that returned by the first matching child.
function orPat(patterns) {

	function orPat2(p1, p2) {
		return function(tree) {
			return function(success, fail) {
				p1(tree)(success,
					/*p1.fail*/
					function () {
						p2(tree)(success,fail);
					}
				);
			};
		};
	}

	function help(i) {
		if (i<patterns.length) {
			if (i===patterns.length-1) {
				//only one pattern left
				return toPattern(patterns[i]);
			} else {
				//more than one pattern left. Reduce with binary or
				return orPat2(toPattern(patterns[i]), help(i+1));
			}
		} else {
			//no patterns 
			return failPat;
		}
	}
	return help(0);
}

//orMatcher :: [Matcher] -> Matcher
//Creates a matcher that matches if any one of a list of given matcher's matches.
//the result passed to the success function will be the result of the first
//successful sub-matchers.
function orMatcher(matchers) {
	function or2(m1, m2) {
		return function(success, fail) {
			m1(success,
				function () {
					m2(success, fail);
				}
			);
		};
	}

	function help(i) {
		if (i<matchers.length) {
			if (i===matchers.length-1) {
				//only one left
				return matchers[i];
			} else {
				//more than one left. Reduce with binary and
				return or2(matchers[i], help(i+1));
			}
		} else {
			//nothing left. 
			return failMatcher;
		}
	}
	return help(0);
}

//bindMatcher :: (Macher a, (a -> Matcher b)) -> Matcher b
//Chain a matcher with a function that consumes a successfull result
//and produces a new matcher based on the result.
function bindMatcher(m, f) {
	return function(success, fail) {
		m(
			/*success*/
			function (a) {
				f(a)(success, fail);
			},
			/*fail*/
			fail
		);
	};
}

function bindPat(pat, f) {
	return function(tree) {
		return function (success, fail) {
			pat(tree)(
				function (a) {
					f(a)(tree)(success, fail);
				},
				fail
			);
		};
	};
}

//getFieldPat :: (Pattern, String) -> Pattern
//create a pattern that matches if a given pattern matches and the match result
//can be dereferenced with given field name. In that case, the value of the field
//will be passed to the success function.
function getFieldPat(pat, name) {
	return function (tree) {
		return bindMatcher(pat(tree), function (node) {
			if (typeof(node)==='object' && node.hasOwnProperty(name)) {
				return successMatcher(node[name]);				
			} else {
				return failMatcher;
			}
		});
	};
}

//arrayElementPat :: (Pattern, Pattern) -> Pattern
//Create a pattern that matches if the first pattern finds an array and the second
//pattern matches an element in that array. The result of a successfull match is
//the matching element in the array.
function arrayElementPat(pat, elPat) {
	return function (tree) {
		return bindMatcher(pat(tree), function (node) {
			if (Object.prototype.toString.call( node ) === '[object Array]') {
				var submatchers = [];
				for (var i = 0; i < node.length; i++) {
					submatchers.push(elPat(node[i]));
				}
				return orMatcher(submatchers);
			} else {
				return failMatcher;
			}
		});
	};
}

//arrayWithElementPat :: Pattern -> Pattern
//Creates a pattern that matches a node if the node is an array and one
//of its elements matches the elPat. The value of the elPat is returned
function arrayWithElementPat(elPat) {
	return arrayElementPat(objectPat([]), elPat);
}

function unitPat(matchResult) {
	return function(tree) {
		return successMatcher(matchResult);
	};
}

//function debugMsg(pat, target, success) {
//	var msg = pat.debug;
//	if (msg) {
//		console.log('matching: '+msg);
//		console.log(JSON.stringify(target, null, '  '));
//		console.log('==> '+success);
//	}
//}

function matches(pat, target) {
	var success = null;
	pat(target)(
		function (value) {
			success = value || true;
		},
		function () {
			success = false;
		}
	);
//	debugMsg(pat, target, success);
	return success;
}

//containsPat :: Pattern -> Pattern
// creates a pattern that matches if its child pattern matches at this node
// of the tree, or any children of the tree.
function containsPat(childPattern) {
	return function(tree) {
		return function (success, fail) {
			var matched = false;
			abortableWalk(tree, function(tree) {
				matched = matches(childPattern, tree);
				return matched; //stop visiting on the first match
			});
			if (matched) {
				success(matched);
			} else {
				fail();
			}
		};
	};
}

//notWithinPat :: (Pattern, Pattern) -> Pattern
//create a pattern that matches if a tree contains a given 'targetPat'
//in an area of the tree that is *not* nested within a match of 'avoidPat'
function notWithinPat(avoidPat, targetPat) {
	var walk = require('./tree-walker').walk;
	return function(tree) {
		return function(success, fail) {
			var found = null;
			walk(tree, function (tree) {
				if (found || matches(avoidPat, tree)) {
					return false; // stop visitor for this branch
				}
				found = found || matches(targetPat, tree);
				return !found;
			});
			if (found) {
				success(found);
			} else {
				fail();
			}
		};
	};
}

exports.andPat = andPat;
exports.arrayElementPat = arrayElementPat;
exports.arrayWithElementPat = arrayWithElementPat;
exports.bindMatcher = bindMatcher;
exports.bindPat = bindPat;
exports.containsPat = containsPat;
exports.equalPat = equalPat;
exports.failMatcher = failMatcher;
exports.failPat = failPat;
exports.fieldPat = fieldPat;
exports.getFieldPat = getFieldPat;
exports.matches = matches;
exports.notWithinPat = notWithinPat;
exports.objectPat = objectPat;
exports.orPat = orPat;
exports.orMatcher = orMatcher;
exports.successMatcher = successMatcher;
exports.successPat = successPat;
exports.typePat = typePat;
exports.unitPat = unitPat;
exports.variablePat = variablePat;
//////////////////////////////////////////////////////////////////////////////
});
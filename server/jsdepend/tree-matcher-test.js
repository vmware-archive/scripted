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

/*global console __dirname exports require*/
var tm = require('./tree-matcher.js');
var esprima = require('./parser');
var configuration = require('./configuration');

var andPat = tm.andPat;
var arrayElementPat = tm.arrayElementPat;
var arrayWithElementPat = tm.arrayWithElementPat;
var containsPat = tm.containsPat;
var equalPat = tm.equalPat;
var failMatcher = tm.failMatcher;
var failPat = tm.failPat;
var fieldPat = tm.fieldPat;
var getFieldPat = tm.getFieldPat;
var matches = tm.matches;
var notWithinPat = tm.notWithinPat;
var objectPat = tm.objectPat;
var orMatcher = tm.orMatcher;
var orPat = tm.orPat;
var successMatcher = tm.successMatcher;
var successPat = tm.successPat;
var toCompareString = require('./utils').toCompareString;
var typePat = tm.typePat;

function dumpTree(parseTree) {
	console.log(JSON.stringify(parseTree, null, "  "));
}

function makeApi(relpath) {
	var conf = configuration.withBaseDir(__dirname+'/test-resources/'+relpath);
	conf.sloppy = false;
	return require("./api").configure(conf);
}

exports.failPatTest = function (test) {
	var tree = { type: 'Dontcare' };
	var matcher = failPat(tree);
	matcher(
		//Success
		function (result) {
			throw 'failPat should never call success callback';
		},
		//Fail
		function () {
			//What we expected!
			test.done();
		}
	);
};

exports.typePatSuccess = function (test) {
	var tree = { 
		type: 'bangra',
	    child: { type: 'album'
	    }
	};
	var pat = typePat('bangra');
	var matcher = pat(tree);
	matcher(
		/*success*/
		function (node) {
			test.equals(node, tree);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.typePatFailure = function (test) {
	var tree = { 
		type: 'bangra',
	    child: { type: 'album'
	    }
	};
	var pat = typePat('zorro');
	var matcher = pat(tree);
	matcher(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.containsPatSuccess = function (test) {
	var api = makeApi('simple-web');
	api.getContents("bork.js", function (contents) {
		var tree = esprima.parse(contents);
		var pat = containsPat(typePat('CallExpression'));
		var matcher = pat(tree);
		matcher(
			/*success*/
			function (node) {
				test.equals(node.type, 'CallExpression');
				//dumpTree(node);
				test.done();
			},
			/*fail*/
			function () {
				throw "fail function should not be called";
			}
		);
	});
};

exports.containsPatFailure = function (test) {
	var api = makeApi('simple-web');
	api.getContents("bork.js", function (contents) {
		var tree = esprima.parse(contents);
		var pat = containsPat(typePat('DoesnNotExist'));
		var matcher = pat(tree);
		matcher(
			/*success*/
			function (node) {
				throw "success function should not be called";
			},
			/*fail*/
			function () {
				test.done();
			}
		);
	});
};

exports.equalsPatSuccess = function (test) {
	var tree = 'banana';
	var pat = equalPat('banana');
	pat(tree)(
		/*success*/
		function (node) {
			test.equals(node, tree);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.equalsPatFailure = function (test) {
	var tree = 'banana';
	var pat = equalPat('orange');
	pat(tree)(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.fieldPatSuccess = function (test) {
	var tree = {
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "define"
		}
	};
	var pat = fieldPat("type", "CallExpression");
	var matcher = pat(tree);
	matcher(
		/*success*/
		function (node) {
			test.equals(node, tree);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.fieldPatFailMissing = function (test) {
	var tree = {
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "define"
		}
	};
	var pat = fieldPat("missing", "CallExpression");
	var matcher = pat(tree);
	matcher(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.fieldPatFailMismatching = function (test) {
	var tree = {
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "define"
		}
	};
	var pat = fieldPat("type", "Different");
	var matcher = pat(tree);
	matcher(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.andPatNoArgs = function (test) {
	var pat = andPat([]);
	var tree = 'no one cares what this is';
	pat(tree)(
		/*success*/
		function (node) {
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.andPatSuccess = function (test) {
	var tree = {
		"a": "aa",
		"b": "bb"
	};
	var a = fieldPat("a", "aa");
	var b = fieldPat("b", "bb");
	var pat = andPat([a, b]);
	pat(tree)(
		/*success*/
		function (node) {
			test.equals(node, tree);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.andPatFailFirst = function (test) {
	var tree = {
		"a": "aa",
		"b": "bb"
	};
	var a = fieldPat("a", "bad");
	var b = fieldPat("b", "bb");
	var pat = andPat([a, b]);
	pat(tree)(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.andPatFailSecond = function (test) {
	var tree = {
		"a": "aa",
		"b": "bb"
	};
	var a = fieldPat("a", "aa");
	var b = fieldPat("b", "bad");
	var pat = andPat([a, b]);
	pat(tree)(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.orPatNoArgs = function (test) {
	var tree = 'do not care';
	var pat = orPat([]);
	pat(tree)(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.simpleContainsPat = function (test) {
	var tree = {
		"a": "aa",
		"b": "bb"
	};
	var pat = containsPat(objectPat("aa"));
	pat(tree)(
		/*success*/
		function (node) {
			test.equals("aa", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};


exports.orPatSucceedFirst = function (test) {
	var tree = {
		"a": "aa",
		"b": "bb"
	};
	var a = containsPat(objectPat("aa"));
	var b = containsPat(objectPat("bb"));
	var pat = orPat([a, b]);
	pat(tree)(
		/*success*/
		function (node) {
			test.equals("aa", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.orPatSucceedSecond = function (test) {
	var tree = {
		"a": "aa",
		"b": "bb"
	};
	var a = containsPat(objectPat("BAD"));
	var b = containsPat(objectPat("bb"));
	var pat = orPat([a, b]);
	pat(tree)(
		/*success*/
		function (node) {
			test.equals("bb", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.orPatFail = function (test) {
	var tree = {
		"a": "aa",
		"b": "bb"
	};
	var a = fieldPat("a", "BAD");
	var b = fieldPat("b", "BAD");
	var pat = orPat([a, b]);
	pat(tree)(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.orPatWithStringsSuccessOnFirst = function (test) {
	var tree = "abc";
	var pat = orPat(["abc", "foo"]);
	pat(tree)(
		/*success*/
		function (node) {
			test.equals("abc", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.orPatWithStringsSuccessOnSecond = function (test) {
	var tree = "abc";
	var pat = orPat(["hello", "abc"]);
	pat(tree)(
		/*success*/
		function (node) {
			test.equals("abc", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.orPatWithStringsFail = function (test) {
	var tree = "abc";
	var pat = orPat(["hello", "foo"]);
	pat(tree)(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.orPatWithOneString = function (test) {
	var tree = "abc";
	var pat = orPat(["abc"]);
	pat(tree)(
		/*success*/
		function (node) {
			test.equals("abc", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.objectPatSuccess = function (test) {
	var tree = {
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "define"
		}
	};
	var pat = objectPat(tree);
	var matcher = pat(tree);
	matcher(
		/*success*/
		function (node) {
			test.equals(node, tree);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.objectPatSuccess = function (test) {
	var tree = {
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "define"
		}
	};
	var pat = objectPat(tree);
	var matcher = pat(tree);
	matcher(
		/*success*/
		function (node) {
			test.equals(node, tree);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.objectPatFailure = function (test) {
	var tree = {
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "define"
		}
	};
	var pat = objectPat({
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "BAD"
		}
	});
	var matcher = pat(tree);
	matcher(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.orMatcherNoArgs = function (test) {
	var matcher = orMatcher([]);
	matcher(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.orMatcherSuccessBoth = function (test) {
	var a = successMatcher("a");
	var b = successMatcher("b");

	var matcher = orMatcher([a, b]);
	matcher(
		/*success*/
		function (node) {
			test.equals("a", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.orMatcherSuccessFirst = function (test) {
	var a = successMatcher("a");
	var b = failMatcher;

	var matcher = orMatcher([a, b]);
	matcher(
		/*success*/
		function (node) {
			test.equals("a", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.orMatcherSuccessSecond = function (test) {
	var a = failMatcher;
	var b = successMatcher("b");

	var matcher = orMatcher([a, b]);
	matcher(
		/*success*/
		function (node) {
			test.equals("b", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.orMatcherFail = function (test) {
	var a = failMatcher;
	var b = failMatcher;

	var matcher = orMatcher([a, b]);
	matcher(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.getFieldPatSuccess = function (test) {
	var tree = {
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "define"
		},
		"arguments" : "TOFIND"
	};
	var pat = objectPat({
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "define"
		}
	});
	pat = getFieldPat(pat, "arguments");

	pat(tree)(
		/*success*/
		function (node) {
			test.equals("TOFIND", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.getFieldPatNoSuchField = function (test) {
	var tree = {
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "define"
		}
	};
	var pat = objectPat({
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "define"
		}
	});
	pat = getFieldPat(pat, "arguments");

	pat(tree)(
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.getFieldPatOnFailed = function (test) {
	var tree = 'don not care';
	var pat = getFieldPat(failPat, "foo");
	pat(tree)(		
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.arrayElementPat = function (test) {
	var tree = [ "a", "b", "c" ];
	var el = equalPat("b");
	var pat = arrayElementPat(successPat, el);
	pat(tree)(		
		/*success*/
		function (node) {
			test.equals("b", node);
			test.done();
		},
		/*fail*/
		function () {
			throw "fail function should not be called";
		}
	);
};

exports.arrayElementPatOnFailed = function (test) {
	var tree = [ "a", "b", "c" ];
	var el = equalPat("b");
	var pat = arrayElementPat(failPat, el);
	pat(tree)(		
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

exports.arrayElementPatElementNotFound = function (test) {
	var tree = [ "a", "b", "c" ];
	var el = equalPat("missing");
	var pat = arrayElementPat(failPat, el);
	pat(tree)(		
		/*success*/
		function (node) {
			throw "success function should not be called";
		},
		/*fail*/
		function () {
			test.done();
		}
	);
};

//Test to confirm that matcher does everything in 'one go' in the same 'thread'.
//No js doesn't have threads. So what I really mean is that no work is scheduled for a
//later time and the call ot the matcher actually returns to the current calling context
//only when the matching processes is in fact complete (either with a fail or a success).
exports.sameThreadMatching = function (test) {
	var found = null;

	var pattern = containsPat(objectPat({
        "type": "CallExpression",
        "callee": {
          "type": "Identifier",
          "name": "require"
        },
        "arguments": [ {
            "type": "ObjectExpression",
            "properties": arrayWithElementPat(objectPat({
                "type": "Property",
                "key": {
                  "type": "Identifier",
                  "name": "baseUrl"
                 },
                 "value": {
                   "type": "Literal",
                   "value": function (value) {
                      if (typeof(value)==='string') {
                         found = value;
                         return successMatcher(true);
                      } else {
						 return failMatcher;
                      }
                   }
                 }
            }))
        } ]
	}));
	
	var tree = { 
		"type": "Program",
		"children": [
			{
		        "type": "CallExpression",
		        "callee": {
		          "type": "Identifier",
		          "name": "require"
		        },
		        "arguments": [ {
		            "type": "ObjectExpression",
		            "properties": [ 'a', 'b', {
		                "type": "Property",
		                "key": {
		                  "type": "Identifier",
		                  "name": "baseUrl"
		                 },
		                 "value": {
		                   "type": "Literal",
		                   "value": "LOOKING FOR THIS"
		                 }
		            } ]
		         } ]
			}
		]
	};
	var success;
	pattern(tree)(
		function () {
			success = true;
		}, 
		function () {
			success = false;
		}
	);
	test.equals(success, true);
	test.equals(found, "LOOKING FOR THIS");
	test.done();
};

exports.notWithinPatFail = function(test) {
	var tree = [ {
		foo: [
			'bork',
			{
			   bar: 'hoho'
			}
		]
	} ];
	
	var fooField = fieldPat('foo', successPat);
	var barField = fieldPat('bar', successPat);
	var pattern = notWithinPat(fooField, barField);
	
	test.equals(false, matches(pattern, tree));
	test.done();
};

exports.notWithinPat = function(test) {
	var tree = [
		{ 
			foo: [
				'bork',
				{
					notBar: 'hoho'
				}
			]
		},
		{
			outside: [ {
				bar: 'barVal'
			} ]
		}
	];
	
	var fooField = fieldPat('foo', successPat);
	var barField = fieldPat('bar', successPat);
	var pattern = notWithinPat(fooField, barField);
	
	test.equals(toCompareString({ bar: 'barVal' }),
		toCompareString(matches(pattern, tree))
	);
	test.done();
};

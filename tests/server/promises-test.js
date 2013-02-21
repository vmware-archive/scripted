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

var promiseUtils = require('../../server/utils/promises');
var until = promiseUtils.until;
var filter = promiseUtils.filter;
var findFirst = promiseUtils.findFirst;
var when = require('when');
var toCompareString = require('../../server/jsdepend/utils').toCompareString;

exports.emptyArray = function (test) {
	when(
		until([], function (e) {return "Who cares";}),
		function () {
			test.ok(false, "The promise shoule reject but it resolved");
		},
		function () {
			test.done();
		}
	);
};

exports.oneElementThatReturnsAValue = function (test) {
	when(
		until([1], function (e) {return e+100;}),
		function (r) {
			test.equals(101, r);
			test.done();
		},
		function (err) {
			test.ok(false, err);
		}
	);
};

exports.oneElementThatReturnsAPromise = function (test) {
	when(
		until([1], function (e) {return when.resolve(100+e);}),
		function (r) {
			test.equals(101, r);
			test.done();
		},
		function (err) {
			test.ok(false, err);
		}
	);
};

exports.allElementsFail = function (test) {
	when(
		until([1,2,3,4], function (e) {
			if (e>10) {
				return when.resolve(e+100);
			} else {
				return when.reject(e+' is too small');
			}
		}),
		function (r) {
			test.ok(false, "The promise should reject but it resolved");
		},
		function (err) {
			test.done();
		}
	);
};

exports.lastElementSucceeds = function (test) {
	when(
		until([1,2,3,40], function (e) {
			if (e>10) {
				return when.resolve(e+100);
			} else {
				return when.reject(e+' is too small');
			}
		}),
		function (r) {
			test.equals(140, r);
			test.done();
		},
		function (err) {
			test.ok(false, "Should resolve but it rejects");
		}
	);
};

exports.severalElementsSucceed = function (test) {
	when(
		until([1,20,3,40], function (e) {
			if (e>10) {
				return when.resolve(e+100);
			} else {
				return when.reject(e+' is too small');
			}
		}),
		function (r) {
			test.equals(120, r);
			test.done();
		},
		function (err) {
			test.ok(false, "Should resolve but it rejects");
		}
	);
};

exports.promiseArray = function (test) {
	when(
		until(when.resolve([1,2,3,40]), function (e) {
			if (e>10) {
				return when.resolve(e+100);
			} else {
				return when.reject(e+' is too small');
			}
		}),
		function (r) {
			test.equals(140, r);
			test.done();
		},
		function (err) {
			test.ok(false, "Should resolve but it rejects");
		}
	);
};

/**
 * Create a helper that works like the 'when' function but also adds some basic boilerplate
 * to avoid errors being swallowed by the when library.
 *
 * Use this as the last call to the when library inside a test.
 * Errors not yet captured at this point will be logged and make the test
 * fail.
 */
function run(test) {
	return function(promise, thn, els) {
		return when(promise, thn, els).otherwise(function (err) {
			if (err) {
				console.log(err);
				if (err.stack) {
					console.log(err.stack);
				}
			}
			test.ok(false);
		}).always(function () {
			test.done();
		});
	};
}

exports.findFirstOnEmpty = function (test) {
	run(test)(
		findFirst([], function (el) {
			return el > 0;
		}),
		function (result) {
			test.ok(false, 'Should have rejected but found: '+result);
		},
		function (err) {
			//Expected behavior: Can't find anything in an empty array.
			test.ok(true);
		}
	);
};

exports.findFirstMatchesOnFirst = function (test) {
	run(test)(
		findFirst([10,20,30], function (el) {
			return el > 5;
		}),
		function (found) {
			test.equals(10, found);
		}
	);
};

exports.findFirstMatchesOnLast = function (test) {
	run(test)(
		findFirst([10,20,30], function (el) {
			return el > 25;
		}),
		function (found) {
			test.equals(30, found);
		}
	);
};

exports.findFirstNoMatch = function (test) {
	run(test)(
		findFirst([10,20,30], function (el) {
			return el > 100;
		}),
		function (found) {
			test.ok(false, 'Should reject but found: '+found);
		},
		function (err) {
			//Expected behavior: reject because no element matches the test.
			test.ok(true);
		}
	);
};

// The same tests again but with the predicate using rejections to signify
// 'false' and resolving to true values instead of returning them.

/**
 * Helper function to convert boolean value to a rejected/resolved
 * promise.
 */
function false2reject(bool) {
	if (bool) {
		return when.resolve(bool);
	} else {
		return when.reject(bool);
	}
}

exports.findFirstResolvesOnFirst = function (test) {
	run(test)(
		findFirst([10,20,30], function (el) {
			return false2reject(el > 5);
		}),
		function (found) {
			test.equals(10, found);
		}
	);
};

exports.findFirstResolvesOnLast = function (test) {
	run(test)(
		findFirst([10,20,30], function (el) {
			return false2reject(el > 25);
		}),
		function (found) {
			test.equals(30, found);
		}
	);
};

exports.findFirstRejectsAll = function (test) {
	run(test)(
		findFirst([10,20,30], function (el) {
			return false2reject(el > 100);
		}),
		function (found) {
			test.ok(false, 'Should reject but found: '+found);
		},
		function (err) {
			//Expected behavior: reject because no element matches the test.
			test.ok(true);
		}
	);
};

exports.filter = function (test) {
	run(test)(
		filter([1, 101, 2, 102], function (x) {
			return when.resolve(x < 50);
		}),
		function (result) {
			test.equals(toCompareString(result), toCompareString([
				1, 2
			]));
		}
	);

};

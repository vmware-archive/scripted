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

var until = require('../../server/utils/promises').until;
var when = require('when');

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


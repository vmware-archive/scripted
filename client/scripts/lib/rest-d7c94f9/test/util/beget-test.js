/*
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

(function (buster, define) {
	'use strict';

	var assert, refute;

	assert = buster.assert;
	refute = buster.refute;

	define('rest/util/beget-test', function (require) {

		var beget = require('rest/util/beget');

		buster.testCase('rest/util/beget', {
			'should return an emtpy object for no args': function () {
				var result, prop;
				result = beget();
				assert(result);
				for (prop in result) {
					/*jshint forin:false */
					refute(result.hasOwnProperty(prop));
				}
			},
			'should return new object with same properties': function () {
				var orig, suppliment, result;
				orig = {};
				suppliment = { foo: 'bar' };
				result = beget(orig, suppliment);
				refute.same(orig, result);
				assert.equals(suppliment, result);
			},
			'should return new object, suplimented': function () {
				var orig, suppliment, result;
				orig = { foo: 'bar', 'proto': 'protoValue' };
				suppliment = { foo: 'foo', mine: 'mineValue' };
				result = beget(orig, suppliment);
				assert.equals('foo', result.foo);
				assert.equals('protoValue', result.proto);
				refute(result.hasOwnProperty('proto'));
				assert.equals('mineValue', result.mine);
				assert(result.hasOwnProperty('mine'));
			}
		});
	});

}(
	this.buster || require('buster'),
	typeof define === 'function' && define.amd ? define : function (id, factory) {
		var packageName = id.split(/[\/\-]/)[0], pathToRoot = id.replace(/[^\/]+/g, '..');
		pathToRoot = pathToRoot.length > 2 ? pathToRoot.substr(3) : pathToRoot;
		factory(function (moduleId) {
			return require(moduleId.indexOf(packageName) === 0 ? pathToRoot + moduleId.substr(packageName.length) : moduleId);
		});
	}
	// Boilerplate for AMD and Node
));

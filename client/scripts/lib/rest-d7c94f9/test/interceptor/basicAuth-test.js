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

	assert = buster.assertions.assert;
	refute = buster.assertions.refute;

	define('rest/interceptor/basicAuth-test', function (require) {

		var basicAuth, rest;

		basicAuth = require('rest/interceptor/basicAuth');
		rest = require('rest');

		buster.testCase('rest/interceptor/basicAuth', {
			'should authenticate the requst from the config': function (done) {
				var client = basicAuth(
					function (request) { return { request: request }; },
					{ username: 'user', password: 'pass'}
				);
				client({}).then(function (response) {
					assert.equals('Basic dXNlcjpwYXNz', response.request.headers.Authorization);
				}).always(done);
			},
			'should authenticate the requst from the request': function (done) {
				var client = basicAuth(
					function (request) { return { request: request }; }
				);
				client({ username: 'user', password: 'pass'}).then(function (response) {
					assert.equals('Basic dXNlcjpwYXNz', response.request.headers.Authorization);
				}).always(done);
			},
			'should not authenticate without a username': function (done) {
				var client = basicAuth(
					function (request) { return { request: request }; }
				);
				client({}).then(function (response) {
					refute.defined(response.request.headers.Authorization);
				}).always(done);
			},
			'should have the default client as the parent by default': function () {
				assert.same(rest, basicAuth().skip());
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

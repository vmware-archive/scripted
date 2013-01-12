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

	var assert, refute, fail;

	assert = buster.assert;
	refute = buster.refute;

	fail = function () {
		buster.assertions.fail('should never be called');
	};

	define('rest/client/jsonp-test', function (require) {

		var client, jsonpInterceptor, rest;

		client = require('rest/client/jsonp');
		jsonpInterceptor = require('rest/interceptor/jsonp');
		rest = require('rest');

		buster.testCase('rest/client/jsonp', {
			'should make a GET by default': function (done) {
				var request = { path: 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0', params: { q: 'javascript' } };
				client(request).then(
					function (response) {
						assert(response.entity.responseData);
						assert.same(request, response.request);
						refute(request.canceled);
						refute(response.raw.parentNode);
					}
				).always(done);
			},
			'should use the jsonp client from the jsonp interceptor by default': function (done) {
				var request = { path: 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0', params: { q: 'html5' } };
				jsonpInterceptor()(request).then(
					function (response) {
						assert(response.entity.responseData);
						assert.same(request, response.request);
						refute(request.canceled);
						refute(response.raw.parentNode);
					}
				).always(done);
			},
			'should abort the request if canceled': function (done) {
				var request = { path: 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0', params: { q: 'html5' } };
				client(request).then(
					fail,
					function (response) {
						assert.same(request, response.request);
						assert(request.canceled);
						refute(response.raw.parentNode);
					}
				).always(done);
				refute(request.canceled);
				request.cancel();
			},
			'should propogate request errors': function (done) {
				var request = { path: 'http://localhost:1234' };
				client(request).then(
					fail,
					function (response) {
						assert.same('loaderror', response.error);
					}
				).always(done);
			},
			'should not make a request that has already been canceled': function (done) {
				var request = { canceled: true, path: 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0', params: { q: 'javascript' } };
				client(request).then(
					fail,
					function (response) {
						assert.same(request, response.request);
						assert(request.canceled);
						assert.same('precanceled', response.error);
					}
				).always(done);
			},
			'should not be the default client': function () {
				refute.same(client, rest);
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

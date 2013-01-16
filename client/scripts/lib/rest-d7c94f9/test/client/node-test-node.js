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

		var rest, client, http, server;

		rest = require('rest');
		client = require('rest/client/node');
		http = require('http');
		server = http.createServer();

		buster.testCase('rest/client/node', {
			setUp: function () {
				server.on('request', function (request, response) {
					var requestBody = '';
					request.on('data', function (chunk) {
						requestBody += chunk;
					});
					request.on('end', function () {
						var responseBody = requestBody ? requestBody : 'hello world';
						response.writeHead(200, 'OK', {
							'content-length': responseBody.length,
							'content-type': 'text/plain'
						});
						response.write(responseBody);
						response.end();
					});
					request.on('error', function () { console.log('server error'); });
				});

				// TODO handle port conflicts
				server.listen(8080);
			},
			tearDown: function () {
				server.close();
			},
			
			'should make a GET by default': function (done) {
				var request = { path: 'http://localhost:8080/' };
				client(request).then(
					function (response) {
						assert(response.raw.request instanceof http.ClientRequest);
						// assert(response.raw.response instanceof http.ClientResponse);
						assert(response.raw.response);
						assert.same(request, response.request);
						assert.equals(response.request.method, 'GET');
						assert.equals(response.entity, 'hello world');
						assert.equals(response.status.code, 200);
						assert.equals('text/plain', response.headers['Content-Type']);
						assert.equals(response.entity.length, parseInt(response.headers['Content-Length'], 10));
						refute(request.canceled);
					}
				).always(done);
			},
			'should make an explicit GET': function (done) {
				var request = { path: 'http://localhost:8080/', method: 'GET' };
				client(request).then(
					function (response) {
						assert.same(request, response.request);
						assert.equals(response.request.method, 'GET');
						assert.equals(response.entity, 'hello world');
						assert.equals(response.status.code, 200);
						refute(request.canceled);
					}
				).always(done);
			},
			'should make a POST with an entity': function (done) {
				var request = { path: 'http://localhost:8080/', entity: 'echo' };
				client(request).then(
					function (response) {
						assert.same(request, response.request);
						assert.equals(response.request.method, 'POST');
						assert.equals(response.entity, 'echo');
						assert.equals(response.status.code, 200);
						assert.equals('text/plain', response.headers['Content-Type']);
						assert.equals(response.entity.length, parseInt(response.headers['Content-Length'], 10));
						refute(request.canceled);
					}
				).always(done);
			},
			'should make an explicit POST with an entity': function (done) {
				var request = { path: 'http://localhost:8080/', entity: 'echo', method: 'POST' };
				client(request).then(
					function (response) {
						assert.same(request, response.request);
						assert.equals(response.request.method, 'POST');
						assert.equals(response.entity, 'echo');
						refute(request.canceled);
					}
				).always(done);
			},
			'should abort the request if canceled': function (done) {
				var request = { path: 'http://localhost:8080/' };
				client(request).then(
					fail,
					function (/* response */) {
						assert(request.canceled);
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
						assert(response.error);
					}
				).always(done);
			},
			'should not make a request that has already been canceled': function (done) {
				var request = { canceled: true, path: 'http://localhost:1234' };
				client(request).then(
					fail,
					function (response) {
						assert.same(request, response.request);
						assert(request.canceled);
						assert.same('precanceled', response.error);
					}
				).always(done);
			},
			'should be the default client': function () {
				assert.same(client, rest);
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

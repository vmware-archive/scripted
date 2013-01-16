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

	define('rest/wire-test', function (require) {

		var clientPlugin, wire, when;

		clientPlugin = require('rest/wire');
		wire = require('wire');
		when = require('when');

		buster.testCase('rest/wire', {
			'should use default client! config': function (done) {
				var spec, client;
				client = function (request) {
					return { request: request, status: { code: 200 }, headers: { 'Content-Type': 'application/json' }, entity: '{"foo":"bar"}' };
				};
				spec = {
					client: { $ref: 'client!', client: client },
					plugins: [{ module: 'rest/wire' }]
				};
				wire(spec).then(function (spec) {
					spec.client({}).then(function (response) {
						assert.equals('bar', response.foo);
					});
				}).always(done);
			},
			'should use client! config with entity interceptor disabled': function (done) {
				var spec, client;
				client = function (request) {
					return { request: request, status: { code: 200 }, headers: { 'Content-Type': 'application/json' }, entity: '{"foo":"bar"}' };
				};
				spec = {
					client: { $ref: 'client!path', client: client, accept: 'text/plain', entity: false },
					plugins: [{ module: 'rest/wire' }]
				};
				wire(spec).then(function (spec) {
					spec.client({ path: 'to/somewhere' }).then(function (response) {
						assert.equals('path/to/somewhere', response.request.path);
						assert.equals('text/plain', response.request.headers.Accept);
						assert.equals('bar', response.entity.foo);
					});
				}).always(done);
			},
			'should be rejected for a server error status code': function (done) {
				var spec, client;
				client = function (request) {
					return { request: request, status: { code: 500 }, headers: { 'Content-Type': 'application/json' }, entity: '{"foo":"bar"}' };
				};
				spec = {
					client: { $ref: 'client!', client: client },
					plugins: [{ module: 'rest/wire' }]
				};
				wire(spec).then(function (spec) {
					spec.client({}).then(
						undefined,
						function (response) {
							assert.equals('bar', response.foo);
						}
					);
				}).always(done);
			},
			'should ignore status code when errorCode interceptor is disabled': function (done) {
				var spec, client;
				client = function (request) {
					return { request: request, status: { code: 500 }, headers: { 'Content-Type': 'application/json' }, entity: '{"foo":"bar"}' };
				};
				spec = {
					client: { $ref: 'client!', client: client, errorCode: false },
					plugins: [{ module: 'rest/wire' }]
				};
				wire(spec).then(function (spec) {
					spec.client({}).then(function (response) {
						assert.equals('bar', response.foo);
					});
				}).always(done);
			},
			'should ignore Content-Type and entity when mime interceptor is disabled': function (done) {
				var spec, client;
				client = function (request) {
					return { request: request, status: { code: 200 }, headers: { 'Content-Type': 'application/json' }, entity: '{"foo":"bar"}' };
				};
				spec = {
					client: { $ref: 'client!', client: client, mime: false },
					plugins: [{ module: 'rest/wire' }]
				};
				wire(spec).then(function (spec) {
					spec.client({}).then(function (response) {
						assert.isString(response);
					});
				}).always(done);
			},
			'should use x-www-form-urlencoded as the default Content-Type for POSTs': function (done) {
				var spec, client;
				client = function (request) {
					return { request: request, status: { code: 200 }, headers: { 'Content-Type': 'application/json' }, entity: '{"foo":"bar"}' };
				};
				spec = {
					client: { $ref: 'client!', client: client, entity: false },
					plugins: [{ module: 'rest/wire' }]
				};
				wire(spec).then(function (spec) {
					spec.client({ method: 'post', entity: { bleep: 'bloop' } }).then(function (response) {
						assert.equals('bleep=bloop', response.request.entity);
						assert.equals(0, response.request.headers.Accept.indexOf('application/x-www-form-urlencoded'));
						assert.equals('application/x-www-form-urlencoded', response.request.headers['Content-Type']);
					});
				}).always(done);
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

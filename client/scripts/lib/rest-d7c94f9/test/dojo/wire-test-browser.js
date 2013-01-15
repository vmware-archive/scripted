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

	define('rest/dojo/wire-test', function (require) {

		var resourcePlugin, RestStore, wire, when;

		resourcePlugin = require('rest/dojo/wire');
		RestStore = require('rest/dojo/RestStore');
		wire = require('wire');
		when = require('when');

		function client(request) {
			return when({
				request: request,
				status: { code: 200 },
				headers: {
					'Content-Type': 'application/json'
				},
				entity: '{"foo":"bar"}'
			});
		}

		buster.testCase('rest/dojo/wire', {
			'should create a RestStore for resource!': function (done) {
				var spec;
				spec = {
					store: { $ref: 'resource!', client: client },
					plugins: [{ module: 'rest/dojo/wire' }]
				};
				wire(spec).then(function (spec) {
					assert(spec.store instanceof RestStore);
				}).always(done);
			},
			'should get with resource! returning a promise': function (done) {
				var spec;
				spec = {
					resource: { $ref: 'resource!test/dojo', get: 'hello.json', entity: false, client: client },
					plugins: [{ module: 'rest/dojo/wire' }]
				};
				wire(spec).then(function (spec) {
					spec.resource.then(function (resource) {
						assert.equals('bar', resource.entity.foo);
						assert.equals('test/dojo/hello.json', resource.request.path);
					});
				}).always(done);
			},
			'should get with resource! returning data': function (done) {
				var spec;
				spec = {
					resource: { $ref: 'resource!test/dojo', get: 'hello.json', entity: false, wait: true, client: client },
					plugins: [{ module: 'rest/dojo/wire' }]
				};
				wire(spec).then(function (spec) {
					assert.equals('bar', spec.resource.entity.foo);
					assert.equals('test/dojo/hello.json', spec.resource.request.path);
				}).always(done);
			},
			'should support client!': function (done) {
				var spec;
				spec = {
					client: { $ref: 'client!', client: client },
					plugins: [{ module: 'rest/dojo/wire' }]
				};
				wire(spec).then(function (spec) {
					spec.client({}).then(
						function (response) {
							assert.equals('bar', response.foo);
						}
					);
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

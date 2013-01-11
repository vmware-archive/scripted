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

	define('rest/dojo/RestStore-test', function (require) {

		var RestStore, when;

		RestStore = require('rest/dojo/RestStore');
		when = require('when');

		function client(request) {
			return when({
				request: request
			});
		}

		buster.testCase('rest/dojo/RestStore', {
			'should use "id" as the default idProperty': function () {
				var store = new RestStore();
				assert.equals('id', store.idProperty);
				assert.equals(42, store.getIdentity({ id: 42 }));
			},
			'should work with custom idProperty': function () {
				var store = new RestStore({ idProperty: 'key'});
				assert.equals('key', store.idProperty);
				assert.equals(42, store.getIdentity({ key: 42 }));
			},
			'should apply query params to the query string': function (done) {
				var store = new RestStore({ client: client });
				store.query({ q: 'what is the meaning of life?' }).then(
					function (response) {
						assert.equals('what is the meaning of life?', response.request.params.q);
					}
				).always(done);
			},
			'should get based on the id': function (done) {
				var store = new RestStore({ client: client });
				store.get(42).then(
					function (response) {
						assert.equals('42', response.request.path);
						refute(response.request.method);
					}
				).always(done);
			},
			'should remove based on the id': function (done) {
				var store = new RestStore({ client: client });
				store.remove(42).then(
					function (response) {
						assert.equals('42', response.request.path);
						assert.equals('delete', response.request.method);
					}
				).always(done);
			},
			'should add a record without an ID': function (done) {
				var store = new RestStore({ client: client });
				store.add({ foo: 'bar' }).then(
					function (response) {
						assert.equals('', response.request.path);
						assert.equals('post', response.request.method);
						assert.equals('*', response.request.headers['If-None-Match']);
						assert.equals('bar', response.request.entity.foo);
					}
				).always(done);
			},
			'should add a record with an explicit ID': function (done) {
				var store = new RestStore({ client: client });
				store.add({ foo: 'bar' }, { id: 42 }).then(
					function (response) {
						assert.equals('42', response.request.path);
						assert.equals('put', response.request.method);
						assert.equals('*', response.request.headers['If-None-Match']);
						assert.equals('bar', response.request.entity.foo);
						refute.equals('42', response.request.entity.id);
					}
				).always(done);
			},
			'should add a record with an implicit ID': function (done) {
				var store = new RestStore({ client: client });
				store.add({ foo: 'bar', id: 42 }).then(
					function (response) {
						assert.equals('42', response.request.path);
						assert.equals('put', response.request.method);
						assert.equals('*', response.request.headers['If-None-Match']);
						assert.equals('bar', response.request.entity.foo);
						assert.equals('42', response.request.entity.id);
					}
				).always(done);
			},
			'should add a record ignoring the ID': function (done) {
				var store = new RestStore({ client: client, ignoreId: true });
				store.add({ foo: 'bar', id: 42 }).then(
					function (response) {
						assert.equals('', response.request.path);
						assert.equals('post', response.request.method);
						assert.equals('*', response.request.headers['If-None-Match']);
						assert.equals('bar', response.request.entity.foo);
						assert.equals('42', response.request.entity.id);
					}
				).always(done);
			},
			'should put overwriting target': function (done) {
				var store = new RestStore({ client: client });
				store.put({ foo: 'bar', id: 42 }, { overwrite: true }).then(
					function (response) {
						assert.equals('42', response.request.path);
						assert.equals('put', response.request.method);
						assert.equals('*', response.request.headers['If-Match']);
					}
				).always(done);
			},
			'should put without overwriting target': function (done) {
				var store = new RestStore({ client: client });
				store.put({ foo: 'bar', id: 42 }, { overwrite: false }).then(
					function (response) {
						assert.equals('42', response.request.path);
						assert.equals('put', response.request.method);
						assert.equals('*', response.request.headers['If-None-Match']);
					}
				).always(done);
			},
			'should put with default config': function (done) {
				var store = new RestStore({ client: client });
				store.put({ foo: 'bar', id: 42 }).then(
					function (response) {
						assert.equals('42', response.request.path);
						assert.equals('put', response.request.method);
						refute(response.request.headers['If-None-Match']);
						refute(response.request.headers['If-Match']);
					}
				).always(done);
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

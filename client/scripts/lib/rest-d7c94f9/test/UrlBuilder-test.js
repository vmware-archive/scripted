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

	var assert, refute, undef;

	assert = buster.assert;
	refute = buster.refute;

	define('rest/UrlBuilder-test', function (require) {

		var UrlBuilder = require('rest/UrlBuilder');

		buster.testCase('rest/UrlBuilder', {
			'should use the provided template': function () {
				assert.equals('/foo/bar', new UrlBuilder('/foo/bar').build());
			},
			'should replace values in the provided template': function () {
				assert.equals('/foo/bar', new UrlBuilder('/foo/{foo}', { foo: 'bar' }).build());
			},
			'should add unused params to the query string': function () {
				assert.equals('/foo/bar?foo=bar', new UrlBuilder('/foo/bar', { foo: 'bar' }).build());
			},
			'should add only name of unused param to query string if value is null': function () {
				assert.equals('/foo/bar?foo', new UrlBuilder('/foo/bar', { foo: null }).build());
			},
			'should add only name of unused param to query string if value is undefined': function () {
				assert.equals('/foo/bar?foo', new UrlBuilder('/foo/bar', { foo: undef }).build());
			},
			'should add unused params to an exsisting query string': function () {
				assert.equals('/foo/bar?bleep=bloop', new UrlBuilder('/foo/{foo}', { foo: 'bar', bleep: 'bloop' }).build());
			},
			'should url encode all param names and values added to the url': function () {
				assert.equals('/foo/bar?bl%25eep=bl%20oop', new UrlBuilder('/foo/bar', { 'bl%eep': 'bl oop' }).build());
			},
			'should return a built url for string concatination': function () {
				assert.equals('/prefix/foo/bar', '/prefix' + new UrlBuilder('/foo/bar'));
			},
			'should append additional template to the current template': function () {
				var foo, bar;
				foo = new UrlBuilder('/foo');
				bar = foo.append('/bar');
				refute.same(foo, bar);
				assert.equals('/foo', foo.build());
				assert.equals('/foo/bar', bar.build());
			},
			'should add or override praram with appended values': function () {
				var foo, bar;
				foo = new UrlBuilder('/{foo}', { foo: '' });
				bar = foo.append('/bar', { foo: 'foo', bleep: 'bloop' });
				refute.same(foo, bar);
				assert.equals('/', foo.build());
				assert.equals('/foo/bar?bleep=bloop', bar.build());
			}
			// TODO test .absolute()
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

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

(function (buster, define, global) {
	'use strict';

	var assert, refute;

	assert = buster.assertions.assert;
	refute = buster.assertions.refute;

	define('rest/interceptor/oAuth-test', function (require) {

		var oAuth, rest, pubsub;

		oAuth = require('rest/interceptor/oAuth');
		pubsub = require('rest/util/pubsub');
		rest = require('rest');

		buster.testCase('rest/interceptor/oAuth', {
			'should authenticate the request for a known token': function (done) {
				var client;

				client = oAuth(
					function (request) { return { request: request, status: { code: 200 } }; },
					{ token: 'bearer abcxyz' }
				);

				client({}).then(function (response) {
					assert.equals('bearer abcxyz', response.request.headers.Authorization);
				}).always(done);
			},
			'should use implicit flow to authenticate the request': function (done) {
				var client, windowStrategy, windowStrategyClose, oAuthCallbackName;

				oAuthCallbackName = 'oAuthCallback' + Math.round(Math.random() * 100000);
				windowStrategyClose = this.spy(function () {});
				windowStrategy = function (url) {
					var state;
					assert(url.indexOf('https://www.example.com/auth?response_type=token&redirect_uri=http%3A%2F%2Flocalhost%2FimplicitHandler&client_id=user&scope=openid&state=') === 0);
					state = url.substring(url.lastIndexOf('=') + 1);
					setTimeout(function () {
						global[oAuthCallbackName]('#state=' + state + '&=token_type=bearer&access_token=abcxyz');
					}, 10);
					return windowStrategyClose;
				};

				client = oAuth(
					function (request) {
						return { request: request, status: { code: 200 } };
					},
					{
						clientId: 'user',
						authorizationUrlBase: 'https://www.example.com/auth',
						redirectUrl: 'http://localhost/implicitHandler',
						scope: 'openid',
						windowStrategy: windowStrategy,
						oAuthCallbackName: oAuthCallbackName
					}
				);

				client({}).then(function (response) {
					assert.equals('bearer abcxyz', response.request.headers.Authorization);
					assert.called(windowStrategyClose);
				}).always(done);
			},
			'should have the default client as the parent by default': function () {
				assert.same(rest, oAuth({ token: 'bearer abcxyz' }).skip());
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
	},
	typeof global === 'undefined' ? this : global
	// Boilerplate for AMD and Node
));

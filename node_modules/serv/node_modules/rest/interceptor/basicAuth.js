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

(function (define) {
	'use strict';

	define(function (require) {

		var interceptor, base64;

		interceptor = require('../interceptor');
		base64 = require('../util/base64');

		/**
		 * Authenticates the request using HTTP Basic Authentication (rfc2617)
		 *
		 * @param {Client} [client] client to wrap
		 * @param {string} config.username username
		 * @param {string} [config.password=''] password for the user
		 *
		 * @returns {Client}
		 */
		return interceptor({
			request: function handleRequest(request, config) {
				var headers, username, password;

				headers = request.headers || (request.headers = {});
				username = request.username || config.username;
				password = request.password || config.password || '';

				if (username) {
					headers.Authorization = 'Basic ' + base64.encode(username + ':' + password);
				}

				return request;
			}
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

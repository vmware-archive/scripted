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

		var interceptor;

		interceptor = require('../interceptor');

		/**
		 * Follows the Location header in a response, if present. The response
		 * returned is for the subsequent request.
		 *
		 * Most browsers will automatically follow HTTP 3xx redirects, however,
		 * they will not automatically follow 2xx locations.
		 *
		 * Note: this interceptor will only follow the Location header for the
		 * originating request. If nested redirects should be followed, install
		 * this interceptor twice. There is no infinite redirect detection
		 *
		 * @param {Client} [client] client to wrap
		 * @param {Client} [config.client] client to use for subsequent request
		 *
		 * @returns {Client}
		 */
		return interceptor({
			success: function (response, config, client) {
				if (response.headers && response.headers.Location) {
					return (config.client || client.skip())({
						method: 'GET',
						path: response.headers.Location
					});
				}
				return response;
			}
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

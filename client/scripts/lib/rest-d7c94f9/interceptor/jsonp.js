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

		var interceptor, jsonpClient;

		interceptor = require('../interceptor');
		jsonpClient = require('../client/jsonp');

		/**
		 * Allows common configuration of JSONP clients.
		 *
		 * Values provided to this interceptor are added to the request, if the
		 * request dose not already contain the property.
		 *
		 * The rest/client/jsonp client is used by default instead of the
		 * common default client for the platform.
		 *
		 * @param {Client} [client=rest/client/jsonp] custom client to wrap
		 * @param {string} [config.callback.param] the parameter name for which the callback function name is the value
		 * @param {string} [config.callback.prefix] prefix for the callback function, as the callback is attached to the window object, a unique, unobtrusive prefix is desired
		 *
		 * @returns {Client}
		 */
		return interceptor({
			client: jsonpClient,
			request: function (request, config) {
				config.callback = config.callback || {};
				request.callback = request.callback || {};
				request.callback.param = request.callback.param || config.callback.param;
				request.callback.prefix = request.callback.prefix || config.callback.prefix;
				return request;
			}
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

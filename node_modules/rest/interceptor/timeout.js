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

		var interceptor, when, delay;

		interceptor = require('../interceptor');
		when = require('when');
		delay = require('when/delay');

		/**
		 * Cancels a request if it takes longer then the timeout value.
		 *
		 * @param {Client} [client] client to wrap
		 * @param {number} [config.timeout=0] duration in milliseconds before canceling the request. Non-positive values disable the timeout
		 *
		 * @returns {Client}
		 */
		return interceptor({
			request: function (request, config) {
				var timeout, abortTrigger;
				timeout = 'timeout' in request ? request.timeout : 'timeout' in config ? config.timeout : 0;
				if (timeout <= 0) {
					return request;
				}
				abortTrigger = when.defer();
				delay(timeout).then(function () {
					abortTrigger.resolver.reject({ request: request, error: 'timeout' });
					if (request.cancel) {
						request.cancel();
					}
					else {
						request.canceled = true;
					}
				});
				return [request, abortTrigger.promise];
			}
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

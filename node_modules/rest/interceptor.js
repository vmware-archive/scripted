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

		var defaultClient, when;

		defaultClient = require('../rest');
		when = require('when');

		/**
		 * Interceptors have the ability to intercept the request and/org response
		 * objects.  They may augment, prune, transform or replace the
		 * request/response as needed.  Clients may be composed by chaining
		 * together multiple interceptors.
		 *
		 * Configured interceptors are functional in nature.  Wrapping a client in
		 * an interceptor will not affect the client, merely the data that flows in
		 * and out of that client.  A common configuration can be created once and
		 * shared; specialization can be created by further wrapping that client
		 * with custom interceptors.
		 *
		 * @param {Client} [client] client to wrap
		 * @param {Object} [config] configuration for the interceptor, properties will be specific to the interceptor implementation
		 * @returns {Client} A client wrapped with the interceptor
		 *
		 * @class Interceptor
		 */

		function defaultRequestHandler(request /*, config */) {
			return request;
		}

		function defaultResponseHandler(response /*, config, interceptor */) {
			return response;
		}

		function whenFirst(promisesOrValues) {
			// TODO this concept is likely to be added to when in the near future
			var d = when.defer();
			promisesOrValues.forEach(function (promiseOrValue) {
				when.chain(promiseOrValue, d.resolver);
			});
			return d.promise;
		}

		/**
		 * Create a new interceptor for the provided handlers.
		 *
		 * @param {Function} [handlers.request] request handler
		 * @param {Function} [handlers.response] response handler regardless of error state
		 * @param {Function} [handlers.success] response handler when the request is not in error
		 * @param {Function} [handlers.error] response handler when the request is in error, may be used to 'unreject' an error state
		 * @param {Function} [handlers.client] the client to use if otherwise not specified, defaults to platform default client
		 *
		 * @returns {Interceptor}
		 */
		return function (handlers) {

			var requestHandler, successResponseHandler, errorResponseHandler;

			handlers = handlers || {};

			requestHandler         = handlers.request || defaultRequestHandler;
			successResponseHandler = handlers.success || handlers.response || defaultResponseHandler;
			errorResponseHandler   = handlers.error   || function () {
				// Propagate the rejection, with the result of the handler
				return when.reject((handlers.response || defaultResponseHandler).apply(this, arguments));
			};

			return function (client, config) {
				var interceptor;

				if (typeof client === 'object') {
					config = client;
				}
				if (typeof client !== 'function') {
					client = handlers.client || defaultClient;
				}
				config = config || {};

				interceptor = function (request) {
					request = request || {};
					return when(requestHandler(request, config)).then(function (request) {
						var response, abort;
						if (request instanceof Array) {
							// unpack compound value
							abort = request[1];
							request = request[0];
						}
						response = when(request, function (request) {
							return when(
								client(request),
								function (response) {
									return successResponseHandler(response, config, interceptor);
								},
								function (response) {
									return errorResponseHandler(response, config, interceptor);
								}
							);
						});
						return abort ? whenFirst([response, abort]) : response;
					});
				};
				interceptor.skip = function () {
					return client;
				};

				return interceptor;
			};
		};

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

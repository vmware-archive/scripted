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

		var interceptor, registry, when;

		interceptor = require('../interceptor');
		registry = require('../mime/registry');
		when = require('when');

		/**
		 * MIME type support for request and response entities.  Entities are
		 * (de)serialized using the converter for the MIME type.
		 *
		 * Request entities are converted using the desired converter and the 'Accept' request header prefers this MIME.
		 *
		 * Response entities are converted based on the Content-Type response header.
		 *
		 * @param {Client} [client] client to wrap
		 * @param {string} [config.mime='text/plain'] MIME type to encode the request entity
		 * @param {string} [config.accept] Accept header for the request
		 *
		 * @returns {Client}
		 */
		return interceptor({
			request: function (request, config) {
				var mime, headers, serializer, requestReady;

				headers = request.headers || (request.headers = {});
				mime = headers['Content-Type'] || config.mime || 'text/plain';
				headers.Accept = headers.Accept || config.accept || mime + ', application/json;q=0.8, text/plain;q=0.5, */*;q=0.2';

				if (!('entity' in request)) {
					return request;
				}

				serializer = registry.lookup(mime);
				requestReady = when.defer();

				when(serializer, function (serializer) {
					request.entity = serializer.write(request.entity);
					headers['Content-Type'] = mime;

					requestReady.resolve(request);
				});

				return requestReady.promise;
			},
			response: function (response) {
				if (!(response.headers && response.headers['Content-Type'] && response.entity)) {
					return response;
				}

				var mime, serializer, responseReady;

				mime = response.headers['Content-Type'];

				responseReady = when.defer();
				serializer = registry.lookup(mime);

				when(serializer, function (serializer) {
					response.entity = serializer.read(response.entity);
					responseReady.resolve(response);
				});

				return responseReady.promise;
			}
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

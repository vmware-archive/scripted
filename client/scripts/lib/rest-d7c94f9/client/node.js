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

		var parser, http, https, when, UrlBuilder, normalizeHeaderName, httpsExp;

		parser = require('url');
		http = require('http');
		https = require('https');
		when = require('when');
		UrlBuilder = require('../UrlBuilder');
		normalizeHeaderName = require('../util/normalizeHeaderName');

		httpsExp = /^https/i;

		function node(request) {

			var d, options, clientRequest, client, url, headers, entity, response;

			response = {};
			response.request = request;

			if (request.canceled) {
				response.error = 'precanceled';
				return when.reject(response);
			}

			d = when.defer();

			url = new UrlBuilder(request.path || '', request.params).build();
			client = url.match(httpsExp) ? https : http;

			options = parser.parse(url);
			entity = request.entity;
			request.method = request.method || (entity ? 'POST' : 'GET');
			options.method = request.method;
			headers = options.headers = {};
			Object.keys(request.headers || {}).forEach(function (name) {
				headers[normalizeHeaderName(name)] = request.headers[name];
			});
			if (!headers['Content-Length']) {
				headers['Content-Length'] = entity ? Buffer.byteLength(entity, 'utf8') : 0;
			}

			request.canceled = false;
			request.cancel = function cancel() {
				request.canceled = true;
				clientRequest.abort();
			};

			clientRequest = client.request(options, function (clientResponse) {
				response.raw = {
					request: clientRequest,
					response: clientResponse
				};
				response.status = {
					code: clientResponse.statusCode
					// node doesn't provide access to the status text
				};
				response.headers = {};
				Object.keys(clientResponse.headers).forEach(function (name) {
					response.headers[normalizeHeaderName(name)] = clientResponse.headers[name];
				});

				clientResponse.on('data', function (data) {
					if (!('entity' in response)) {
						response.entity = '';
					}
					// normalize Buffer to a string
					response.entity += data.toString();
				});
				clientResponse.on('end', function () {
					d.resolve(response);
				});
			});
				
			clientRequest.on('error', function (e) {
				response.error = e;
				d.reject(response);
			});

			if (entity) {
				clientRequest.write(entity);
			}
			clientRequest.end();

			return d.promise;
		}

		return node;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

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

(function (define, global, document) {
	'use strict';

	define(function (require) {

		var when, UrlBuilder;

		when = require('when');
		UrlBuilder = require('../UrlBuilder');

		// consider abstracting this into a util module
		function clearProperty(scope, propertyName) {
			try {
				delete scope[propertyName];
			}
			catch (e) {
				// IE doesn't like to delete properties on the window object
				if (propertyName in scope) {
					scope[propertyName] = undefined;
				}
			}
		}

		function cleanupScriptNode(response) {
			if (response.raw && response.raw.parentNode) {
				response.raw.parentNode.removeChild(response.raw);
			}
		}

		function registerCallback(prefix, resolver, response) {
			var name;

			do {
				name = prefix + Math.floor(new Date().getTime() * Math.random());
			}
			while (name in global);

			global[name] = function jsonpCallback(data) {
				response.entity = data;
				clearProperty(global, name);
				cleanupScriptNode(response);
				if (!response.request.canceled) {
					resolver.resolve(response);
				}
			};

			return name;
		}

		/**
		 * Executes the request as JSONP.
		 *
		 * @param {string} request.path the URL to load
		 * @param {Object} [request.params] parameters to bind to the path
		 * @param {string} [request.callback.param='callback'] the parameter name for which the callback function name is the value
		 * @param {string} [request.callback.prefix='jsonp'] prefix for the callback function, as the callback is attached to the window object, a unique, unobtrusive prefix is desired
		 *
		 * @returns {Promise<Response>}
		 */
		function jsonp(request) {
			var d, callbackName, callbackParams, script, firstScript, response;

			response = {
				request: request
			};

			if (request.canceled) {
				response.error = 'precanceled';
				return when.reject(response);
			}

			d = when.defer();
			request.callback = request.callback || {};
			callbackName = registerCallback(request.callback.prefix || 'jsonp', d.resolver, response);
			callbackParams = {};
			callbackParams[request.callback.param || 'callback'] = callbackName;

			request.canceled = false;
			request.cancel = function cancel() {
				request.canceled = true;
				cleanupScriptNode(response);
				d.reject(response);
			};

			script = document.createElement('script');
			script.type = 'text/javascript';
			script.async = true;
			script.src = new UrlBuilder(request.path, request.params).build(callbackParams);

			script.onload = script.onerror = script.onreadystatechange = function (e) {
				// script tag load callbacks are completely non-standard
				if ((e && (e.type === 'load' || e.type === 'error')) || script.readyState === 'loaded') {
					if (global[callbackName]) {
						response.error = 'loaderror';
						d.reject(response);
					}
				}
			};

			response.raw = script;
			firstScript = document.getElementsByTagName('script')[0];
			firstScript.parentNode.insertBefore(script, firstScript);

			return d.promise;
		}

		return jsonp;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); },
	this,
	this.document
	// Boilerplate for AMD and Node
));

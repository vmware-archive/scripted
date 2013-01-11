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

		var when, load, registry;

		when = require('when');

		// include text/plain and application/json by default
		registry = {
			'text/plain': require('./type/text/plain'),
			'application/json': require('./type/application/json')
		};

		/**
		 * Lookup the converter for a MIME type
		 *
		 * @param {string} mime the MIME type
		 * @return the converter for the MIME type
		 */
		function lookup(mime) {
			// ignore charset if included
			mime = mime.split(';')[0].trim();
			if (!registry[mime]) {
				return register(mime, load(mime));
			}
			return registry[mime];
		}

		/**
		 * Register a custom converter for a MIME type
		 *
		 * @param {string} mime the MIME type
		 * @param converter the converter for the MIME type
		 * @return the converter
		 */
		function register(mime, converter) {
			return registry[mime] = converter;
		}

		function loadAMD(mime) {
			var d, timeout;

			d = when.defer();
			timeout = setTimeout(function () {
				// HOPE reject on a local require would be nice
				clearTimeout(timeout);
				timeout = null;
				d.reject();
			}, 1000);

			// 'define' is a bit of a hack, but other options are non-standard
			define('rest/mime/type/' + mime + '-' + Math.random(), ['./type/' + mime], function (m) {
				clearTimeout(timeout);
				timeout = null;
				d.resolve(m);
			});

			return d.promise;
		}

		function loadNode(mime) {
			var d = when.defer();

			try {
				d.resolve(require('./type/' + mime));
			}
			catch (e) {
				d.reject(e);
			}

			return d.promise;
		}

		/**
		 * Attempts to resolve a new converter
		 *
		 * @param {string} mime the MIME type
		 * @return the converter for the MIME type
		 */
		load = typeof require === 'function' && require.amd ? loadAMD : loadNode;

		return {
			lookup: lookup,
			register: register
		};

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

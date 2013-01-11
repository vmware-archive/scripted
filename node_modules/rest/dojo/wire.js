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

		var RestStore, clientPlugin, mixin, when;

		RestStore = require('./RestStore');
		clientPlugin = require('../wire');
		mixin = require('../util/mixin');
		when = require('when');

		/**
		 * If wait === true, waits for dataPromise to complete and resolves
		 * the reference to the resulting concrete data.  If wait !== true,
		 * resolves the reference to dataPromise.
		 *
		 * @param dataPromise
		 * @param resolver
		 * @param wait
		 */
		function resolveData(dataPromise, resolver, wait) {
			if (wait === true) {
				dataPromise.then(
					function (data) {
						resolver.resolve(data);
					},
					function (err) {
						resolver.reject(err);
					}
				);
			}
			else {
				resolver.resolve(dataPromise);
			}
		}

		return {
			wire$plugin: function restPlugin(/* ready, destroyed, options */) {

				var plugin;

				plugin = {
					resolvers: mixin({}, clientPlugin.wire$plugin.apply(clientPlugin, arguments).resolvers)
				};

				/**
				 * Resolves a RestStore client for the specified path and scopes, e.g. resource!url/to/resource
				 *
				 * @param resolver
				 * @param name
				 * @param refObj
				 * @param wire
				 */
				function resolveResource(resolver, name, refObj, wire) {
					var client;

					client = when.defer();
					plugin.resolvers.client(client.resolver, name, refObj, wire);

					when(client, function (client) {
						var args, store;

						args = { client: client };
						if (refObj.idProperty) { args.idProperty = refObj.idProperty; }

						store = new RestStore(args);
						if (refObj.get) {
							// If get was specified, get it, and resolve with the resulting item.
							resolveData(store.get(refObj.get), resolver, refObj.wait);

						}
						else if (refObj.query) {
							// Similarly, query and resolve with the result set.
							resolveData(store.query(refObj.query), resolver, refObj.wait);

						}
						else {
							// Neither get nor query was specified, so resolve with
							// the store itself.
							resolver.resolve(store);
						}
					});
				}

				plugin.resolvers.resource = resolveResource;

				return plugin;
			}

		};

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

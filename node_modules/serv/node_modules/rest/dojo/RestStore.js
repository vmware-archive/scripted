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

		var defaultClient, mixin, queryResults;

		defaultClient = require('../../rest');
		mixin = require('../util/mixin');
		queryResults = require('dojo/store/util/QueryResults');

		/**
		 * A REST based object store.
		 *
		 * The base path for requests is commonly provided by the `rest/interceptor/prefix` interceptor.
		 *
		 * @param {RestStore} [options] configuration information that will be mixed into the store
		 */
		function RestStore(options) {
			mixin(this, options);
			this.client = this.client || defaultClient;
		}

		RestStore.prototype = {

			/**
			 * @field {Client} client rest client for this store
			 */
			client: null,

			/**
			 * @field {string} [idProperty='id'] property to use as the identity property. The values of this property should be unique.
			 */
			idProperty: 'id',

			/**
			 * @field {boolean} [ignoreId=false] if true, add() will always do a POST even if the data item already has an id
			 */
			ignoreId: false,

			/**
			 * Retrieves an object by its identity. This will trigger a GET request to the server using the url `id`.
			 *
			 * @param {string|number} id identity to use to lookup the object
			 * @param {Object} [options] reserved for future use
			 *
			 * @returns {Object} record in the store that matches the given id
			 */
			get: function (id /*, options */) {
				return this.client({
					path: id
				});
			},

			/**
			 * Resolves a records identity using the configured idProperty
			 *
			 * @param object to get the identity for
			 *
			 * @returns {string|number} the identity
			 */
			getIdentity: function (object) {
				return object[this.idProperty];
			},

			/**
			 * Stores a record.
			 *
			 * Will trigger a PUT request to the server if the object has an id, otherwise it will trigger a POST request.  Unless ignoreId is configured true, in which case POST will always be used.
			 *
			 * @param {Object} object record to store
			 * @param {string|number} [options.id] explicit ID for the record
			 * @param {boolean} [options.ignoreId] treat the record as if it does not have an ID property
			 * @param {boolean} [options.overwrite] adds If-Match or If-None-Match header to the request
			 * @param {boolean} [options.incremental=false] uses POST intead of PUT for a record with an ID
			 *
			 * @returns {Promise<Response>} promissed response
			 */
			put: function (object, options) {
				var id, hasId, headers, ignoreId;

				options = options || {};

				ignoreId = ('ignoreId' in options) ? options.ignoreId : this.ignoreId;
				id = ('id' in options) ? options.id : this.getIdentity(object);

				hasId = !ignoreId && typeof id !== 'undefined';
				headers = {};

				if ('overwrite' in options) {
					headers[options.overwrite ? 'If-Match' : 'If-None-Match'] = '*';
				}

				return this.client({
					method: hasId && !options.incremental ? 'put' : 'post',
					path: hasId ? id : '',
					entity: object,
					headers: headers
				});
			},

			/**
			 * Stores a new record.
			 *
			 * Will trigger a PUT request to the server if the object has an id, otherwise it will trigger a POST request.  Unless ignoreId is configured true, in which case POST will always be used.
			 *
			 * @param {Object} object record to add
			 * @param {string|number} [options.id] explicit ID for the record
			 * @param {boolean} [options.ignoreId] treat the record as if it does not have an ID property
			 * @param {boolean} [options.incremental=false] uses POST intead of PUT for a record with an ID
			 *
			 * @returns {Promise<Response>} promissed response
			 */
			add: function (object, options) {
				options = options || {};
				options.overwrite = false;
				return this.put(object, options);
			},

			/**
			 * Deletes a record by its identity. This will trigger a DELETE request to the server.
			 *
			 * @param {string|number} id identity of the record to delete
			 *
			 * @returns {Promise<Response>} promissed response
			 */
			remove: function (id) {
				return this.client({
					method: 'delete',
					path: id
				});
			},

			/**
			 * Queries the store for objects. This will trigger a GET request to the server, with the query added as a query string.
			 *
			 * @param {Object} query params used for the query string
			 * @param {Object} [options] reserved for future use
			 *
			 * @returns {QueryResult} query results
			 */
			query: function (query /*, options */) {
				return queryResults(this.client({ params: query }));
			}
		};

		return RestStore;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

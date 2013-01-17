/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Kris De Volder
 *     Scott Andrews
 ******************************************************************************/

define(function(require, exports) {

var mime = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');
var entity = require('rest/interceptor/entity');
var interceptor = require('rest/interceptor');

/**
 * Wraps a rest client so that any error (rejected promise) is replaced by
 * a particular default value (resolved). Error's converted by this
 * wrapper will instead be logged to the console.
 */
function unreject(client, value) {
	return function (x) {
		return client(x).otherwise(function (err) {
			console.error(err);
			return value;
		});
	};
}

/**
 * Wraps a rest client to replace an undefined return
 * value with some other default value instead.
 */
function defaultValue(client, deflt) {
	return function (x) {
		return client(x).then(function (value) {
			return value===undefined ? deflt : value;
		});
	};
}

var baseClient = unreject(entity(
	mime(
		errorCode(),
		{
			mime: 'application/json'
		}
	)
));

/**
 * Create an interceptor that inserts a default 'method' option into
 * the request config.
 *
 * @param {Client} [client]
 * @param {String} config.prefix
 */
var defaultMethod = interceptor({
	request: function (request, config) {
		request.method = request.method || config.method;
		return request;
	}
});

/**
 * Basic rest client suitable for 'get' requests. This client handles all
 * errors by logging them and returns at least undefined in such cases.
 */
var get = baseClient;
var put = defaultMethod(baseClient, { method: 'put' });

exports.baseClient = baseClient;
exports.defaultValue = defaultValue;
exports.get = get;
exports.put = put;

});

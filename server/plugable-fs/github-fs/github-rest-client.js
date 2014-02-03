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
 *   Kris De Volder
 ******************************************************************************/

var fsErrors = require('../fs-errors');
var deref = require('../../jsdepend/utils').deref;

function configure(options) {

	var token = options.token;
	if (!token) {
		throw new Error('github-rest-client needs to be configured with an OAuth token');
	}

	var rest = require('rest');
//	var basicAuth = require('rest/interceptor/basicAuth');
	var interceptor = require('rest/interceptor');
	var errorCode = require('rest/interceptor/errorCode');
	var entity = require('rest/interceptor/entity');
	var mime = require('rest/interceptor/mime');
	var retry = require('rest/interceptor/retry');
	var when = require('when');


	var oauth = interceptor({
		request: function (request, config) {
			var headers = request.headers || (request.headers = {});
			headers.Authorization = "token " + token;
			headers["User-Agent"] = "Scripted";
			return request;
		}
	});

//	var redirect = interceptor({
//		//See http://developer.github.com/v3/#http-redirects
//		response: function (resp) {
//			if (resp.status && resp.status.code === 301) {
//				console.log('Request for : '+resp.request.path);
//				console.log('Should redirect to : '+resp.headers.Location);
//			}
//			return resp;
//		}
//	});

	var logResp = interceptor({
		response: function (resp) {
			console.dir(resp);
			return resp;
		}
	});

	var logRateLimit = interceptor({
		response: function (resp) {
			var limit = deref(resp, ['headers', 'X-Ratelimit-Limit']);
			if (limit) {
				var remaining = deref(resp, ['headers', 'X-Ratelimit-Remaining']);
				if (remaining%100===0 || remaining < 100) {
					console.log('github rate limit: '+remaining+ '/'+ limit + ' url: '+resp.request.path);
				}
			}
//			var mem = process.memoryUsage();
//			console.log('mem = '+JSON.stringify(mem));
			return resp;
		}
	});

	function fixNoExistError(client) {
		return function () {
			var args = Array.prototype.slice.call(arguments);
			return client.apply(this, arguments).otherwise(function (err) {
				if (err && err.message === 'Not Found') {
					return when.reject(fsErrors.noExistError('github-rest-client', args[0].path));
				}
				return when.reject(err);
			});
		};
	}

	var oauthClient = fixNoExistError(errorCode(mime(logRateLimit(oauth()))));

	return oauthClient;

}

exports.configure = configure;
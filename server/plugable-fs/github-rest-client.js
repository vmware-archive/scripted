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

var fsErrors = require('./fs-errors');

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
	var fs = require('fs');
	var when = require('when');

	var oauth = interceptor({
		request: function (request, config) {
			var headers = request.headers || (request.headers = {});
			headers.Authorization = "token " + token;
			return request;
		}
	});

	var lastModified = interceptor({
		request: function (req) {
			if (req['Last-Modified']) {
				var headers = req.headers || (req.headers = {});
				headers['If-Modified-Since'] = req['Last-Modified'];
			}
			return req;
		},
		response: function (resp) {
			//console.dir(resp);
			var lastModified = resp.headers['Last-Modified'];
			if (lastModified) {
				resp.entity.status = resp.status;
				resp.entity['Last-Modified'] = lastModified;
			}
			return resp;
		}
	});

	var logResp = interceptor({
		response: function (resp) {
			console.dir(resp);
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

	var oauthClient = fixNoExistError(entity(lastModified(errorCode(mime(oauth())))));

	return oauthClient;

}

exports.configure = configure;
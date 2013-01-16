/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

	var mime = require('rest/interceptor/mime');
	var errorCode = require('rest/interceptor/errorCode');
	var entity = require('rest/interceptor/entity');
	
	function unreject(client, value) {
		return function (x) {
			return client(x).otherwise(function (err) {
				console.error(err);
				return value;
			});
		};
	}
	
	var baseClient = entity(
		mime(
			errorCode(),
			{
				mime: 'application/json'
			}
		)
	);
	
	var put = unreject(baseClient);
	var get = unreject(baseClient, {});

	exports.getScriptedRcFile = function (name) {
		return get({
			path: '/config/{name}',
			params: {
				name: name
			}
		});
	};
	
	exports.putScriptedRcFile = function (name, contents) {
		return put({
			path: '/config/{name}',
			method: 'put',
			params: {
				name: name
			},
			entity: contents
		});
	};
});

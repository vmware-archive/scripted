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
define(['./rest-utils'], function(rest) {

	var defaultValue = rest.defaultValue;
	var get = defaultValue(rest.get, {});
	var put = rest.put;

	return {
		getScriptedRcFile: function (name) {
			return get({
				path: '/config/{name}',
				params: {
					name: name
				}
			});
		},
		putScriptedRcFile: function (name, contents) {
			return put({
				path: '/config/{name}',
				method: 'put',
				params: {
					name: name
				},
				entity: contents
			});
		}
	};

});

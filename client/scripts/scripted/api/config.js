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
 *     Kris De Volder (VMWare) - initial API and implementation
 ******************************************************************************/
define(function(require) {

	var rest = require('servlets/rest-utils');

	var deref = require('scripted/utils/deref');
	var getDotScripted = require('servlets/jsdepend-client').getConf;

	function navigateTo(pathSegments) {
		return function (obj) {
			return deref(obj, pathSegments);
		};
	}

	/**
	 * Converts a path given either as a String or an array of segments into an array of
	 * segments.
	 *
	 * @return {Array.String}
	 */
	function segments(path) {
		if (!path) {
			return [];
		} else if (Array.isArray(path)) {
			return path;
		} else if (typeof(path)==='string') {
			return path.split('/');
		} else {
			console.error('Bad argument');
			console.dir(path);
		}
		return []; //Ensure we always return at least an empty array
	}

	/**
	 * @param {String} configPath
	 * @param {String} [contextPath]
	 */
	function getConfig(configPath, contextPath) {
		return rest({
			path: '/config/{configPath}?context={contextPath}',
			params: {
				configPath: configPath,
				contextPath: configPath
			}
		});
	}

	console.log('Config api loaded');

	return {
		getConfig: getConfig
	};
});
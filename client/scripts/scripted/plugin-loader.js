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
 *     Andrew Clement
 *     Kris De Volder
 ******************************************************************************/
define(function(require) {
	
//	var console = require('./exec/exec-console');
	var getPlugins = require('../servlets/plugin-client').getPlugins;

	console.log('Requesting list of plugins from server...');
	
	getPlugins().then(function (plugins) {
		var pluginPaths = plugins.map(function (name) {
			return 'scripted/plugins/'+name;
		});
		console.log('Plugins found: '+JSON.stringify(pluginPaths, null, '  '));
		require(pluginPaths, function () {
			console.log('All plugins succesfully loaded!');
		});
	});
	
	
});
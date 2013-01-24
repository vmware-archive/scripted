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

	var when = require('when');
	var editorApi = require('scripted/api/editor'); //TODO: load on demand?

//	var console = require('./exec/exec-console');
	var getPlugins = require('servlets/plugin-client').getPlugins;

	console.log('Requesting list of plugins from server...');

	var ready = when.defer();
		//This promise resolves when all plugins have been loaded.
		//TODO: errors in loading? Can we make these reject the promise?
		// At the least we can add some timeout logic to ensure
		// the promise eventually rejects or resolves.

	var pluginHookHandlers = {
		//This will essentially become a kind of 'extension point registry'.
		onSaveTransform: function (tf) {
			editorApi.onSaveTransform(tf);
		}
	};

	getPlugins().then(function (plugins) {
		var pluginPaths = plugins.map(function (name) {
			return 'scripted/plugins/'+name;
		});
		console.log('Plugins found: '+JSON.stringify(pluginPaths, null, '  '));
		require(pluginPaths, function () {
			var instances = arguments;
			for (var i = 0; i < instances.length; i++) {
				var plugin = instances[i];
				for (var property in plugin) {
					if (pluginHookHandlers.hasOwnProperty(property)) {
						pluginHookHandlers[property](plugin[property]);
					}
				}
			}
			console.log('All plugins succesfully loaded!');
		});
	});


	return {
		//Export this so that anyone who cares about this can synch up
		// and ensure they execute some code only after all plugins have been loaded.
		ready: ready.promise
	};

});
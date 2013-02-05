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

	var CHATTY = false; //Set this to false to only print info on problems
					// Set to true to also print some info as plugins are being
					// discovered and loaded.
					// This value only applied to the plugin loader itselg, it
					// does NOT affect how 'chatty' plugins themselves
					// are logging to the console.

	var when = require('when');
	var editorApi = require('scripted/api/editor-extensions'); //TODO: load on demand?

//	var console = require('./exec/exec-console');
	var plugins = require('servlets/plugin-client').getPlugins();

	if (CHATTY) {
		plugins.then(function (plugins) {
			console.log('Got list of plugins from server: ' +
				JSON.stringify(plugins, null, '  ')
			);
		});
	}

	plugins.otherwise(function (error) {
		console.error('Problems getting list of plugins from server:');
		console.error(error);
	});


//	var ready = when.defer();
//		//This promise resolves when all plugins have been loaded.
//		//TODO: errors in loading? Can we make these reject the promise?
//		// At the least we can add some timeout logic to ensure
//		// the promise eventually rejects or resolves.


	/**
	 * Attempts to load a single Scripted plugin. This returns a promise
	 * that resolves whether or not the attempt was succesful.
	 * In case of a problem the resolved value will have an 'error' property
	 * containing info on the cause of the problem. In succesful case
	 * the error property will not be set but a 'module' property will
	 * be set containing the module instance. In both cases a 'plugin'
	 * property holds the name of the scripted plugin.
	 */
	function load(plugin) {
		var d = when.defer();
		require(['scripted/plugins/'+plugin],
			//OK:
			function (m) {
				if (CHATTY) {
					console.log('Scripted plugin loaded: '+plugin);
				}
				d.resolve({
					plugin: plugin,
					module: m
				});
			},
			//Problem:
			function (err) {
				console.error('ERROR loading scripted plugin: '+plugin, err);
				if (err.stack) {
					//It's sad but console.error doesn't seem to show
					// the stacktrace enclosed in the error object!
					//This might be very useful information for people debugging their
					//plugin code.
					console.error(err.stack); // more info on where the original error came from
				}
				err.scriptedPlugin = plugin;
				d.resolve({
					plugin: plugin,
					error: err
				});
			}
		);
		return d.promise;
	}

	/**
	 * A promise that resolves when loading all plugins has been attempted.
	 * The promise resolves regardless of whether all attempts where succesful.
	 * The value of the promise is an array containing info on each plugin.
	 * See the 'load' function for info on the elements of the array.
	 */
	var ready = when.map(plugins, load);

	ready.then(function (infos) {
		var badPlugins = infos.filter(function (info) {
			return info.error;
		}).map(function (info) {
			return info.plugin;
		});
		if (badPlugins.length) {
			console.error('These plugins had problems: '+
				JSON.stringify(badPlugins, null, '  ')
			);
		} else if (CHATTY) {
			console.log('All plugins loaded ok');
		}
	});

	return {
		//Export this so that anyone who cares about this can synch up
		// and ensure they execute some code only after all plugins have been loaded.
		ready: ready
	};

});

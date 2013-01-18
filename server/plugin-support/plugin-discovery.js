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
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/
 
var filesystem = require('../jsdepend/filesystem').withBaseDir(null);
var dotScripted = require('../jsdepend/dot-scripted').configure(filesystem);
var getScriptedRcDirLocation = dotScripted.getScriptedRcDirLocation;
var pathResolve = require('path').resolve;
var endsWith = require('../jsdepend/utils').endsWith;

var pluginDir = pathResolve(getScriptedRcDirLocation(), 'plugins');

/**
 * Get a list of plugins installed into this instance of scripted.
 * @return {Promise}
 */
function getPlugins() {
	console.log('pluginDir = ' + pluginDir);
	
	return filesystem.listFiles(pluginDir).then(function (names) {
		console.dir(names);
		return names.filter(function (name) {
			return endsWith(name, '.js');
		}).map(function (name) {
			return 'scripted/plugins/'+name.substring(0, name.length-3);
		});
	});
}

/**
 * Get the path to where a plugin with given name is on the filesystem.
 */
function getPluginPath(name) {
	return pathResolve(pluginDir, name);
}
 
exports.getPlugins = getPlugins;
exports.getPluginPath = getPluginPath;
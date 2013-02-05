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

var when = require('when');
var filesystem = require('../jsdepend/filesystem').withBaseDir(null);
var dotScripted = require('../jsdepend/dot-scripted').configure(filesystem);
var getScriptedRcDirLocation = dotScripted.getScriptedRcDirLocation;
var pathResolve = require('../jsdepend/utils').pathResolve;
var endsWith = require('../jsdepend/utils').endsWith;
var each = require('../utils/promises').each;

//var pluginDir = pathResolve(getScriptedRcDirLocation(), 'plugins');

//For now it's easier to place the plugins inside of scripted code base
// So I can put my 'sample' plugin in our codebase and commit it to git.


var pluginDirs = [
	//plugins packaged with scripted:
	pathResolve(__dirname, '../../plugins'),
	//user plugins:
	pathResolve(getScriptedRcDirLocation(), 'plugins')
];

/**
 * Get a list of plugins installed into this instance of scripted.
 * @return {Promise}
 */
function getPlugins() {
//	console.log('pluginDir = ' + pluginDir);
	var allPlugins = [];
	return each(pluginDirs, function (pluginDir) {
		return filesystem.listFiles(pluginDir).then(function (names) {
			for (var i = 0; i < names.length; i++) {
				var name = names[i];
				if (endsWith(name, '.js')) {
					allPlugins.push(name.substring(0, name.length-3));
				}
			}
		});
	}).then(function () {
		//... all plugin dirs have been processed.
		return allPlugins;
	});
}

exports.getPlugins = getPlugins;
//exports.getPluginPath = getPluginPath;
exports.pluginDirs = pluginDirs;
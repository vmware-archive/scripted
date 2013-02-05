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
var endsWith = require('../jsdepend/utils').endsWith;
var each = require('../utils/promises').each;
var pathResolve = require('../jsdepend/utils').pathResolve;

function configure(filesystem) {

	//Path prefix below which all scripted plugins contents is mapped by the
	//scripted web server.
	var SCRIPTED_PLUGINS =  'scripted/plugins/';

	var dotScripted = require('../jsdepend/dot-scripted').configure(filesystem);
	var getScriptedRcDirLocation = dotScripted.getScriptedRcDirLocation;
	var isDirectory = filesystem.isDirectory;
	var parseJsonFile = require('../utils/parse-json-file').configure(filesystem);

	var pluginDirs = [
		//plugins packaged with scripted:
		pathResolve(__dirname, '../../plugins'), //TODO: direct filesystem reference <-> pluggable fs.
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
			return each(filesystem.listFiles(pluginDir), function (name) {
				var baseName = name.substring(0, name.length-3);
				if (endsWith(name, '.js')) {
					allPlugins.push({
						name: baseName,
						path: SCRIPTED_PLUGINS + baseName
					});
				} else if (name!=='disabled') {
					//handle the case where the plugin is packaged as subdirectory.
					//with a package.json
					var path = pathResolve(pluginDir, name);
					return isDirectory(path).then(function (isDir) {
						if (isDir) {
							var pkgJsonFile = pathResolve(path, 'package.json');
							return parseJsonFile(pkgJsonFile).then(function (pkgJson) {
								var mainName = (pkgJson && pkgJson.main) || 'index';
								//The main we wanna return is actually relative to
								//the 'webroot' rather than the filesystem.
								//So beware:
								var mainPath = SCRIPTED_PLUGINS + name + '/' + mainName;

								//TODO: This isn't quite correct. But it should work
								// in most cases. The correct thing to do would be
								// to tell the plugin loader how to map the paths
								// via an additional 'packages' declaration for
								// requirejs.config. I.e. instead of giving just
								// the path to the 'main' file it should
								// give a 'location' and a 'main' as separate entries
								// and then its upto the client-side plugin loader
								// to configure requirejs with that info.
								allPlugins.push({
									name: name,
									path: mainPath
								});
							});
						}
					});
				}
			});
		}).then(function () {
			//... all plugin dirs have been processed.
			return allPlugins;
		});
	}

	return {
		getPlugins: getPlugins,
		//exports.getPluginPath = getPluginPath;
		pluginDirs: pluginDirs
	};
} // function configure

exports.configure = configure;
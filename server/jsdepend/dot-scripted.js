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

/*global console exports require*/

var getDirectory = require('./utils').getDirectory;
var orMap = require('./utils').orMap;
var pathResolve = require('./utils').pathResolve;
var jsonMerge = require('./json-merge');
var defaults = require('./dot-scripted-defaults');
var when = require('when');
var pipeline = require('when/pipeline');

var JSON5 = require('json5');

function debug_log(msg) {
//	console.log(msg);
}

function configure(filesystem) {

	var MAIN_SCRIPTED_RC_FILE = 'scripted.json';

	var listFiles = filesystem.listFiles;
	var getContents = filesystem.getContents;
	var getUserHome = filesystem.getUserHome;
	var isFile = filesystem.isFile;
	var isDirectory = filesystem.isDirectory;
	var putContents = filesystem.putContents;
	var handle2file = filesystem.handle2file;
	var stat = filesystem.stat;
	var mkdir = filesystem.mkdir;
	var deleteResource = filesystem.deleteResource;

	// For a given file handle the '.scripted' configuration info is found and composed as follows:
	
	// 1) find the corresponding rootDir. This is closest directory in the path to the file
	//    that contains a rootMarkerFile.
	// 2) if the rootDir has a .scripted file read its JSON data
	//  2.b) add the rootdir to the parsed data as a property 'fsroot'
	// 3) read the '.scriptedrc' file in the user's home directory.
	// 4) merge the data from both where '.scriptedrc' has lower priority than '.scripted'
	//    for any properties that are contained in both.

	function isRootMarkerFile(name) {
		if (name==='.scripted' || name==='.project' || name==='.git') {
			return name;
		}
	}

	/**
	 * Find the root dir associated with a given file handle. This is the closest directory
	 * on the path that contains a root marker file.
	 * <p>
	 * If no directory on any of the parent directories contains a root marker file, then
	 * this function will return a falsy value.
	 */
	function getRootDir(dir, callback) {
		if (dir) {
			listFiles(dir,
				function (names) {
					var rootMarkerName = orMap(names, isRootMarkerFile);
					if (rootMarkerName) {
						callback(dir);
					} else {
						getRootDir(getDirectory(dir), callback);
					}
				}
			);
		} else {
			callback(false);
		}
	}
	
	var ALL_WHITE_SPACE = /^\s*$/;
	
	/**
	 * Tries to read data from a file and parse it as JSON data.
	 * Call the callback with the resulting data.
	 * If any part of this operation fails, the callback will be still be
	 * called with at least an empty object. All errors will be logged
	 * to the console.
	 * <p>
	 * Errors deemed serious enough to be brought to the user's attention
	 * (i.e. problems parsing the user's config file) will be 'reported'
	 * by adding an explanation to the object in a property called 'error'.
	 */
	function parseJsonFile(handle, callback) {
		getContents(handle,
			function (contents) {
				var data = null;
				if (!ALL_WHITE_SPACE.test(contents)) {
					try {
						data = JSON5.parse(contents);
					} catch (e) {
						data = {
							error: "Couldn't parse (JSON5) '"+handle+"'\nERROR: " + e
						};
					}
				}
				data = data || {};
				return callback(data);
			},
			function (err) {
				debug_log(err);
				callback({
					//Don't report this as user-level error. Some people simply don't have a .scripted or .scriptedrc
					//so this error is expected.
					//error: "Could not get contents of file '"+handle+"'"
				});
			}
		);
	}
	
	function findAndParseDotScripted(handle, callback) {
		getRootDir(handle, function (root) {
			root = root || getDirectory(handle);
			if (!root) {
				return callback({});
			} else {
				var dotScriptedFile = pathResolve(root, '.scripted');
				
				parseJsonFile(dotScriptedFile, function (dotScripted) {
					dotScripted.fsroot = root;
					callback(dotScripted);
				});
			}
		});
	}
	
	function findAndParseScriptedRc(callback) {
		var home = getUserHome();
		if (home) {
			var configFile = pathResolve(home, ".scriptedrc");
			return isDirectory(configFile, function (isDir) {
				if (isDir) {
					configFile = pathResolve(configFile, MAIN_SCRIPTED_RC_FILE);
				}
				return parseJsonFile(configFile, callback);
			});
		} else {
			return callback({});
		}
	}

	/**
	 * Retrieve the scripted configuration data for a given file or directory.
	 * Ideally anybody interested in the '.scripted' configuration data
	 * should be using this method and this method alone to retrieve the config info.
	 * This to ensure that all share the same logic of retrieving this data.
	 * This will make it easier in the future to change how and where this data is
	 * loaded.
	 *
	 * The returned config object may contain an 'error' property if there was a
	 * problem reading/parsing some or all of the configuration data.
	 */
	function getConfiguration(handle, callback) {
		findAndParseDotScripted(handle, function (dotScripted) {
			findAndParseScriptedRc(function (scriptedRc) {
				console.log(JSON.stringify(scriptedRc));
				console.log(JSON.stringify(dotScripted));
				callback(jsonMerge(defaults, scriptedRc, dotScripted));
			});
		});
	}

	function getScriptedRcDirLocation() {
		var home = getUserHome();
		if (home) {
			var configFile = pathResolve(home, '.scriptedrc');
			return configFile;
		}
		//return undefined;
	}


	function getScriptedRcFileLocation(name) {
		var configDir = getScriptedRcDirLocation();
		if (configDir) {
			var configFile = pathResolve(configDir, name+'.json');
			return configFile;
		}
		//return undefined;
	}
	
	/**
	 * Gets a given config file from the .scriptedrc folder in the user.home directort
	 * @return {Promise}
	 */
	function getScriptedRcFile(name) {
		debug_log('scriptedrc file requested: '+name);
		var d = when.defer();
		var configFile = getScriptedRcFileLocation(name);
		debug_log('scriptedrc file path = '+configFile);
		if (configFile) {
			parseJsonFile(configFile, function (jsonData) {
				d.resolve(jsonData);
			});
		} else {
			d.resolve({});
		}
		return d;
	}

	function convertRcFileToDir(loc) {
		return getContents(loc).then(function (contents) {
			debug_log('got contents of ' + loc );
			debug_log(contents);
			return pipeline([
				function () {
					debug_log('Deleting ...');
					return deleteResource(loc).then(function () {
						debug_log('Deleting OK');
					});
				},
				function () {
					debug_log('Mkdir '+loc+' ...');
					return mkdir(loc).then(function () {
						debug_log('Mkdir OK');
					});
				},
				function () {
					var putLoc = pathResolve(loc, MAIN_SCRIPTED_RC_FILE);
					debug_log('putting contents to '+putLoc+' ...');
					return putContents(putLoc, contents).then(function () {
						debug_log('putting OK');
					});
				}
			]);
		});
	}

	/**
	 * Ensures that .scriptedrc is in directory format. If it isn't yet...
	 * then migrate it.
	 */
	function ensureDirectoryForm() {
		debug_log('ensure directory form');
		var loc = getScriptedRcDirLocation();
		return stat(loc).then(
			function (s) {
				if (s.isDirectory) {
					debug_log('Already a dir => DONE');
					//okay!
				} else if (s.isFile) {
					debug_log('It is a file');
					return convertRcFileToDir(loc);
				}
			},
			function (err) {
				//probably means file/dir doesn't exist. So create it.
				return mkdir(loc);
			}
		);
	}
	
	function putScriptedRcFile(name, contents) {
		return when(ensureDirectoryForm(), function () {
			debug_log('putScriptedRcFile: '+ name);
			debug_log(JSON.stringify(contents, null, '  '));
			var loc = getScriptedRcFileLocation(name);
			return putContents(loc, JSON.stringify(contents, null, '  '));
		});
	}
		
	return {
		getConfiguration: getConfiguration,
		getScriptedRcFile: getScriptedRcFile,
		putScriptedRcFile: putScriptedRcFile,
		getScriptedRcDirLocation: getScriptedRcDirLocation,
		parseJsonFile: parseJsonFile
	};

}

exports.configure = configure;

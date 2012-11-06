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

var JSON5 = require('json5');

function configure(filesystem) {

	var listFiles = filesystem.listFiles;
	var getContents = filesystem.getContents;
	var getUserHome = filesystem.getUserHome;

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
				console.log(err);
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
			return parseJsonFile(configFile, callback);
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
				callback(jsonMerge(scriptedRc, dotScripted));
			});
		});
	}

	return {
		getConfiguration: getConfiguration
	};

}

exports.configure = configure;
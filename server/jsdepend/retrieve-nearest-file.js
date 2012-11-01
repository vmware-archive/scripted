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
 *	Kris De Volder
 *	Andy Clement
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

	// From a specified path this searches 'up' for a file with the specified name,
	// stopping the search when it reaches a specified point.

	/**
	 * Search up from the context until the stop location is reached. If the specified
	 * file is found in any folder on the way up, that is the file to return.
	 */
	function getRootDir(context, wheretostop, searchName, callback) {
		if (context===wheretostop) {
			callback(false);
		}
		var dir = getDirectory(context);
		if (dir) {
			listFiles(dir, 
				function (names) {
					var fileFound = orMap(names, function(name) {
						if (name===searchName) {
							return name;
						}
					}); 
					console.log("fileFound? "+fileFound);
					if (fileFound) { 
						callback(dir);
					} else {
						getRootDir(dir, wheretostop, searchName, callback);
					}
				}
			);
		} else {
			callback(false);
		}
	}
	
	// TODO move to util library
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
				try {
					data = JSON5.parse(contents);
				} catch (e) {
					data = {
						error: "Couldn't parse (JSON5) '"+handle+"'\nERROR: " + e
					};
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
	
	function findAndParseFile(handle, wheretostop, name, callback) {
		getRootDir(handle, wheretostop, name, function (root) {
//			root = root || getDirectory(handle);
			if (!root) {
				return callback({});
			} else {
				console.log("root is "+root);
				console.log("name is "+name);
				var file = pathResolve(root, name);
				console.log("file is "+file);
				parseJsonFile(file, function (parsedFile) {
					parsedFile.fsroot = root;
					callback(parsedFile);
				});
			}
		});
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
	function retrieveNearestFile(handle, wheretostop, name, callback) {
		findAndParseFile(handle, wheretostop, name, function (parsedFile) {
			callback(parsedFile);
		});
	}

	return {
		retrieveNearestFile: retrieveNearestFile
	};

}

exports.configure = configure;

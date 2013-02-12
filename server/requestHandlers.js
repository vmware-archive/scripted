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
 *     Andrew Eisenberg
 *     Andrew Clement
 *     Kris De Volder
 *     Christopher Johnson
 ******************************************************************************/

/*global console require exports process*/
var when = require('when');
var querystring = require("querystring");

var formidable = require("formidable");
var url = require('url');
var nodeNatives = require('./jsdepend/node-natives');
var isNativeNodeModulePath = nodeNatives.isNativeNodeModulePath;
var nativeNodeModuleName = nodeNatives.nativeNodeModuleName;

var pathUtils = require('./jsdepend/utils');
var getDirectory = pathUtils.getDirectory;
var getFileName = pathUtils.getFileName;
var pathResolve = pathUtils.pathResolve;

function configure(filesystem) {

	var getContents = filesystem.getContents;
	var putContents = filesystem.putContents;
	//filesystem.getContents;
	var listFiles = filesystem.listFiles;
	var templates = require('./templates/template-provider').configure(filesystem);

	// TODO handle binary files
	/*
	 * Retrieve a specified field, request format: http://localhost:7261/get?file=XXX
	 * Possible outcomes:
	 * 200 response with the file contents in the response
	 * 500 response with 'File not found' in response text (enoent)
	 * 500 response with 'Error: '+error_text in response text
	 */


	//This function checks if there are any non-UTF8 characters (character code == 65533, "unknown") in the file.  If there are, it's binary
	function isBinary(buffer) {
		var buffer_utf8 = typeof(buffer) === 'string' ? buffer : buffer.toString('utf8', 0, 24);

		for (var i = 0; i < buffer_utf8.length; i++) {
			var code = buffer_utf8.charCodeAt(i);
			if (code === 65533 || code <= 8) {
				return true;
			}
		}
		return false;
	}

	function get(response, request) {

		var file = url.parse(request.url, true).query.file;
		console.log("Processing get request for " + file);

		getContents(file).then(function(data) {
			var binary = isBinary(data);

			if (binary) {
				console.log('Cannot open binary file');
				response.writeHead(500, {
					"Content-Type": "text/plain"
				});
				response.write("Cannot open binary file");
				response.end();
			} else {
				response.writeHead(200, {
					"Content-Type": "text/plain",
					"Cache-Control": "no-store"
				});
				response.write(data);
				response.end();
			}
		}).otherwise(function(err) {
			// Look into why windows returns -1 for errno when readFile called on a directory (e.g. 'scr .')
			if (err && err.errno === 28 /*EISDIR*/ || err.errno === -1 /*Windows returns this for readFile on dirs*/ ) {
				// is a directory
				response.writeHead(500, {
					"Content-Type": "text/plain"
				});
				response.write("File is a directory");
				response.end();
			} else if (err && err.errno === 34 /*ENOENT*/ ) {
				// File not found
				response.writeHead(500, {
					"Content-Type": "text/plain"
				});
				response.write("File not found");
				response.end();
			} else {
				response.writeHead(500, {
					"Content-Type": "text/plain"
				});
				response.write("Error: " + err);
				response.end();
			}
		});
	}

	function handleTemplates(response, request) {
		var params = url.parse(request.url, true).query;
		var scope = params.scope;
		var root = params.root;
		if (!scope) {
			response.writeHead(400, {
				'content-type': 'application/json'
			});
			response.write('{"error" : "no scope provided" }');
			response.end();
			return;
		}
		console.log('Client requested content assist templates. Looking for scope "' + scope + '"' + (root ? ' with root: ' + root : ''));
		templates.processTemplates(root).then(

		function(res) {
			try {
				response.writeHead(200, {
					'content-type': 'application/json'
				});
				response.write(
				res[scope] ? JSON.stringify(res[scope]) : '[]');

			} catch (e) {
				console.error("Error sending templates to client.");
				console.error(e.stack);
			}
			response.end();
			console.log('Client requested content assist templates complete');
		},

		function(err) {
			console.log("Templates received errback");
			response.writeHead(500, {
				'content-type': 'application/json'
			});
			response.write('{"error" : true, "val" : "' + err + '"}');
			response.end();
		});
	}



	/**
	 * Filesystem list operations, returns dojo.data.Item objects (as JSON).
	 *
	 * Structure of a return Item is, for a directory:
	 * {
		name:filename,
		path:path,
		parentDir:containingDir,
		size:size,				// bytes - not currently always set correctly
		directory:true/false,
		Location:filename,
		children:[item],
		ChildrenLocation:pathForChildren
		modified:33				// not yet set correctly
	   }

	   children is an array of Item objects.  However, if directory is true and children isn't set, then ChildrenLocation is the
	   path against which to run a further fs_list to obtain them.
	 *
	 */
	function fs_list(response, request, path) {
		var pathToUse = null;
		if (path) {
			pathToUse = path;
		} else {
			var obj2;
			try {
				obj2 = url.parse(request.url, true).query;
				//console.log("fsq: request url query is "+url.parse(request.url,true).query);
				var data = JSON.parse(obj2.query);
				pathToUse = data.name;
			} catch (e) {
				response.writeHead(500, {
					'content-type': 'text/plain'
				});
				response.write('Invalid path request ' + obj2);
				response.end();
				return;
			}
		}
		//console.log("fs_list request for: "+pathToUse);

		/*
	This next line is due to the fact that /get and /fs_list are routed differently:
	<localhost> /get?file= <path>
	vs
	<localhost> /fs_list/ <path>
	*/
		pathToUse = pathToUse.replace(/%20/g, " ");
		filesystem.stat(pathToUse).otherwise(function(err) {
			console.log(err);
		}).then(function(stats) {
			if (!stats) {
				response.writeHead(404, {
					'content-type': 'text/plain'
				});
				response.write('not found ' + pathToUse);
				response.end();
				return;
			}
			var filename = getFileName(pathToUse);
			var directory = getDirectory(pathToUse);
			var size = stats.size;
			if (stats.isDirectory) {
				return when.map(listFiles(pathToUse), function(kidName) {
					var kidPath = pathResolve(pathToUse, kidName);
					return filesystem.stat(kidPath).then(function(kidStat) {
						var kid = {
							name: kidName,
							directory: kidStat.isDirectory,
							Location: kidPath,
							size: 0,
							parentDir: filename //TODO; really?? Looks incorrect!
						};
						if (kidStat.isDirectory) {
							kid.ChildrenLocation = kidPath;
						}
						return kid;
					});
				}).otherwise(function(err) {
					if (err) {
						console.log(err);
					}
					return []; //replace with something that won't break the rest of the code
				}).then(function(kids) {
					var retval = {
						name: filename,
						path: pathToUse,
						parentDir: directory,
						size: size,
						directory: true,
						Location: pathToUse, //filename,
						children: kids,
						modified: 33
					};
					var respons = JSON.stringify(retval);
					// console.log("Response = "+respons);
					response.writeHead(200, {
						'content-type': 'application/json'
					});
					response.write(respons);
					response.end();
				});
			} else if (stats.isFile) {
				var retval = {
					items: [{
						name: filename,
						path: pathToUse,
						parentDir: directory,
						Location: pathToUse,
						size: size,
						directory: false,
						modified: 33
					}]
				};
				var jsondata = JSON.stringify(retval);
				// console.log("Response = "+jsondata);
				response.writeHead(200, {
					'content-type': 'text/json'
				});
				response.write(jsondata);
				response.end();
			} else { //Something funky... neither a file nor a directory!
				response.writeHead(404, {
					'content-type': 'text/plain'
				});
				response.write('not found ' + pathToUse);
				response.end();
				return;
			}
		});
	}

	// write a file
	function put(response, request) {
		var file = url.parse(request.url, true).query.file;
		if (isNativeNodeModulePath(file)) {
			response.writeHead(500, {
				'content-type': 'text/plain'
			});
			response.write('Cannot save read only resource: ' + file);
			response.end();
			return;
		}
		console.log(">> Processing put request for " + file);
		if (request.method.toLowerCase() === 'post') {
			// parse a file upload
			var form = new formidable.IncomingForm();
			form.parse(request, function(err, fields, files) {
				if (err) {
					console.log(err);
				}
				console.log("Text to be written is of length: " + fields.data.length);
				// i think the text encoding of the form submission params adds the CR
				// TODO need to respect the original formatting here, not arbitrarily delete CRs
				//      var text = fields.text.replace(/\r/g,'');;
				// fields.text is the data to save
				//      console.log("Text to be written is of length: "+text.length);
				var dataToSave = fields.data;
				if (dataToSave.length != fields.length) { // DO NOT change to !== because fields.length is a string
					// return an error, it failed to save!
					response.writeHead(500, {
						'content-type': 'text/plain'
					});
					response.write('problem with save: received data length: ' + dataToSave.length + ' does not match transmitted length ' + fields.length);
					response.end();
				}
				putContents(file, dataToSave).then(

				function() {
					response.writeHead(200, {
						'content-type': 'text/plain'
					});
					response.write('save successful\n');
					response.end();
				},

				function(err) {
					response.writeHead(500, {
						'content-type': 'text/plain'
					});
					response.write('problem with save:' + err);
					response.end();
				});
			});
			return;
		}
	}

	return {
		get: get,
		put: put,
		fs_list: fs_list,
		templates: handleTemplates
	};

} // function configure

exports.configure = configure;


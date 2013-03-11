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
 *     Kris De Volder (VMWare) - initial API and implementation
 ******************************************************************************/

/*global console require*/

var when = require('when');
var express = require('express');
var mime = require('mime');

exports.install = function (app, filesystem) {

	//TDO: when create read stream is actually implemented on the composite fs maybe we can
	// use it again.

	var createReadStream = filesystem.createReadStream;
	var isFile = filesystem.isFile;
	var getContents = filesystem.getContents;

	var pluginDiscovery = require('../plugin-support/plugin-discovery').configure(filesystem);
	var getPlugins = pluginDiscovery.getPlugins;

	app.get('/config/plugins/list', function (req, res) {
		return getPlugins().then(
			function (jsonObj) {
				res.writeHead(200, {
					"Content-Type": "application/json",
					"Cache-Control": "no-store"
				});
				res.write(JSON.stringify(jsonObj));
				res.end();
			},
			function (err) {
				console.error("Error in request for '%s': %s", req.url, err);
				if (err.stack) {
					console.log(err.stack);
				}
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.write(err + "\n");
				res.end();
			}
		);
	});

	/**
	 * Create a connect midleware function that serves up text files from
	 * our pluggable filesystem at a given directory.
	 */
	function servePluginFiles(dir) {
		return function (req, res, next) {
			console.log('request for plugin file: '+req.path);
			var filepath = dir + req.path; // Don't use pathResolve because req.path is absolute!
			isFile(filepath).then(function (isFile) {
				if (!isFile) {
					return next();
				}
				res.header('Content-Type', mime.lookup(req.path));
				createReadStream(dir + req.path).pipe(res);
			}).otherwise(function (err) {
				console.log(err);
				if (err.stack) {
					console.log(err.stack);
				}
				res.status(500);
				res.header('Content-Type', 'text/plain');
				res.write(''+err);
				res.end();
			});
		};
	}

	var pluginDirs = pluginDiscovery.pluginDirs;
	for (var i = 0; i < pluginDirs.length; i++) {
		var dir = pluginDirs[i];
		app.use('/scripts/scripted/plugins', servePluginFiles(dir));
			//TODO: plugable fs (express.static implicitly uses raw node fs
	}

};



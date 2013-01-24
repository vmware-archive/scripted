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

var pluginDiscovery = require('../plugin-support/plugin-discovery');
var getPlugins = pluginDiscovery.getPlugins;

exports.install = function (app) {
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
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.write(err + "\n");
				res.end();
			}
		);
	});

	var pluginDirs = pluginDiscovery.pluginDirs;
	for (var i = 0; i < pluginDirs.length; i++) {
		var dir = pluginDirs[i];
		app.use('/scripts/scripted/plugins', express.static(dir));
	}

};


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
 
/*global console require*/

var when = require('when');
var createReadStream = require('fs').createReadStream;
var filesystem = require('../jsdepend/filesystem').withBaseDir(null);
var pluginDiscovery = require('../plugin-support/plugin-discovery');
var getPlugins = pluginDiscovery.getPlugins;
var getPluginPath = pluginDiscovery.getPluginPath;

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
	//Requests for plugin code will end up in this path because of how their 'names'
	//get resolved by requirejs.
	app.get('/scripts/scripted/plugins/:name(*)', function (req, res) {
		var stream = createReadStream(getPluginPath(req.params.name));
		res.header('Content-Type', 'text/javascript');
		stream.pipe(res);
	});
};

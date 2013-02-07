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
 *     Scott Andrews
 ******************************************************************************/

var express = require('express');
var pathResolve = require('path').resolve;

var FAVICO = pathResolve();

function start(route, handle) {
	function onRequest(req, res, next) {
		var path = req.path;
		// Don't bother for favicon.ico
		if (path === '/favicon.ico') {
            res.writeHead(404, {
                "Content-Type": "text/html"
            });
            res.write("404 Not found");
            res.end();
			return;
		}
		//console.log("Request for " + path + " received.");
		route(handle, path, res, req, next);
	}

	var app = express();
	//This weirdness below is because of
	//https://github.com/sockjs/sockjs-node/issues/78
	//So we need to allow socket servlet access to the
	//naked nodejs http server to workarond.
	app.server = require('http').createServer(app);

	app.configure(function() {
		app.use(express.json());
		app.use(app.router);
		app.use(onRequest); // bridge to 'servlets', we should remove over time
		app.use(express['static'](pathResolve(__dirname, '../client'), { maxAge: 6e5 }));
		app.use(express.errorHandler({
			dumpExceptions: true,
			showStack: true
		}));
	});
	
	require('./servlets/status').install(app);

	require('./routes/editor-routes').install(app);
	require('./routes/test-routes').install(app);
	require('./routes/config-routes').install(app);
	require('./routes/plugin-routes').install(app);
	
	require('./servlets/incremental-search-servlet').install(app);
	require('./servlets/incremental-file-search-servlet').install(app);
	
	require('./servlets/application-servlet').install(app);

	console.log('app.server = ' + app.server);
	app.server.listen(7261, "127.0.0.1" /* only accepting connections from localhost */);
	console.log("Server has started.");
}

exports.start = start;

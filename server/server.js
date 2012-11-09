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
 
/*global require exports console*/

var express = require('express');

function start(route, handle) {
	function onRequest(req, res, next) {
		var path = req.path;
		// Don't bother for favicon.ico
		if (path === '/favicon.ico') {
			return;
		}
		//console.log("Request for " + path + " received.");
		route(handle, path, res, req, next);
	}

	var app = express.createServer();

	app.configure(function() {
		app.use(app.router);
		app.use(onRequest); // bridge to 'servlets', we should remove over time
		app.use(express.static(process.env.PWD + '/../client'), { maxAge: 6e5 });
		app.use(express.errorHandler({
			dumpExceptions: true,
			showStack: true
		}));
	});

	require('./routes/editor').install(app);

	require('./servlets/incremental-search-servlet').install(app);
	require('./servlets/incremental-file-search-servlet').install(app);

	app.listen(7261, "127.0.0.1" /* only accepting connections from localhost */);
	console.log("Server has started.");
}

exports.start = start;

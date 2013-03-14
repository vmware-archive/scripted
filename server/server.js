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
 *     Tony Georgiev - https://github.com/scripted-editor/scripted/pull/183
 ******************************************************************************/

function configure(filesystem, options) {

	var port = (options && options.port) || 7261;
	var isCloudfoundry = (options && options.cloudfoundry);

	var express = require('express');
	var pathResolve = require('path').resolve;

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
			app.use(express.cookieParser());

			if (options.cloudfoundry) {
				//Add cf specific middleware
				console.log('Add cf middleware');
				require('./cloudfoundry/user-tracker').install(app, filesystem);
			}

			app.use(app.router);
			app.use(onRequest); // bridge to 'servlets', we should remove over time
			app.use(express['static'](pathResolve(__dirname, '../client'), { maxAge: 6e5 }));
			app.use(express.errorHandler({
				dumpExceptions: true,
				showStack: true
			}));
		});
		//Make the options available to client code.
		app.get('/options', function (req, res) {
			res.status(200);
			res.header('Content-Type', 'application/json');
			res.write(JSON.stringify(options));
			res.end();
		});

		if (options.cloudfoundry) {
			console.log('Add cf routes');

			//Add cf specific 'routes'
			require('./cloudfoundry/cloudfoundry-routes').install(app, filesystem);
		}
		require('./servlets/status').install(app);

		require('./routes/editor-routes').install(app, filesystem);
		require('./routes/test-routes').install(app);
		require('./routes/config-routes').install(app, filesystem);
		require('./routes/plugin-routes').install(app, filesystem);
		require('./routes/debug-routes').install(app);

		require('./servlets/incremental-search-servlet').install(app, filesystem);
		require('./servlets/incremental-file-search-servlet').install(app, filesystem);

		if (options.applicationManager) {
			require('./servlets/application-servlet').install(app);
		}

		console.log('Server port = ' + port);
		app.server.listen(port, "127.0.0.1" /* only accepting connections from localhost */);
		console.log("Server has started.");
	}

	return { start: start };
} //configure

exports.configure = configure;

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
 *     Andy Clement/Jeremy Grelle
 ******************************************************************************/

/*global require*/
var servStart = require('serv/commands/start');
var servStop = require('serv/commands/stop');
var servReload = require('serv/commands/reload');

exports.install = function (app) {

	app.put("/application/status", function(request, response) {
		// TODO choose whether to npm start or serve static files
		servStart.exec({cwd:request.param("path")});// default port 8000
		response.end();
	});

	app.del("/application/status", function(request, response) {
		// TODO choose whether to npm start or serve static files
		servStop.exec({});//{cwd:request.param("path")});// default port 8000
		response.end();
	});
	
	app.post("/application/reload", function(request, response) {
		// TODO choose whether to npm start or serve static files
		console.log("Reloading "+request.param("path"));
		servReload.exec({path:request.param("path")});
		response.end();
	});

};

//var servlets = require('../servlets');
//
//function applicationStatusHandler(response, request) {
//  response.writeHead(200, {"Content-Type": "text/plain"});
//  response.write("Server will stop shortly");
//  response.write("\n");
//  response.end();
//  throw 'Goobye cruel world!'; // TODO: find a more elegant way to do this.
//}
//
//servlets.register('/application/status', applicationStatusHandler);

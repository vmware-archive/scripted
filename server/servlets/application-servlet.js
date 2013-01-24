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
 *     Andy Clement
 *    Jeremy Grelle
 ******************************************************************************/

/**
 * Interact with the 'serv' module to manage a running file server that
 * has livereload integrated.
 */

var servStart = require('serv/commands/start');
var servStop = require('serv/commands/stop');
var servReload = require('serv/commands/reload');
var rest = require('rest');
var errorCode = require('rest/interceptor/errorCode');
var timeout = require('rest/interceptor/timeout');
var mime = require('rest/interceptor/mime');
var client = timeout(errorCode(),{timeout:200});
var url = "http://localhost:8000";

// TODO currently the port is fixed at 8000
// TODO currently it acts as a static file server, it can't run 'npm start'
exports.install = function (app) {

	/**
	 * get on /application/status returns the status of the server as { "status": "running"/"not running", path:
	 * [path] }. Where [path] is the path being served by the server, path is only included for a
	 * 'running' status.
	 */
	app.get("/application/status", function(request, response) {
		// Return status of the server.
		
		// There is no path through 'serv' right now so we communicate
		// direct with the server it starts (see URL)
		var mimeclient = mime();
		
		mimeclient({ path:url+"/serv/status", method:"GET" }).then(function(status_response) {
				response.send({"status": "running", "path": status_response.entity.path},200);
			},function(error) {
				response.send({"status":"not running"},200);
			});
	});

	/** Start the server */
	app.put("/application/status", function(request, response) {
		servStart.exec({cwd:request.param("path"),suppressOpen:request.param("suppressOpen"),logdir:request.param("path")});
		response.end();
	});

	/** Stop the server */
	app.del("/application/status", function(request, response) {
		servStop.exec({});
		response.end();
	});
	
	/** Reload a file */
	app.post("/application/reload", function(request, response) {
		console.log("Reloading "+request.param("path"));
		servReload.exec({path:request.param("path")});
		response.end();
	});

};

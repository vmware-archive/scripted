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
var filesystem = require('../jsdepend/filesystem').withBaseDir(null);
var dotscripted = require('../jsdepend/dot-scripted').configure(filesystem);
var getScriptedRcFile = dotscripted.getScriptedRcFile;
var putScriptedRcFile = dotscripted.putScriptedRcFile;

var makePromisedRequestHandler = require('../servlets/servlet-utils').makePromisedRequestHandler;

function getData(req) {
	var d = when.defer();
	var buffer = '';
	req.on('data', function (data) {
		buffer += data.toString();
	});
	req.on('end', function () {
			
	});
	return d.promise;
}

exports.install = function (app) {
	app.get('/config/:name', function (req, res) {
		getScriptedRcFile(req.params.name).then(
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
	app.put('/config/:name', function (req, res) {
//		console.log('Received a put request for config '+req.param.name);
//		console.log('>>>>>>>>>>>>>>>>');
//		console.log(req.body);
//		console.log('<<<<<<<<<<<<<<<<');
//		res.status(204);
//		res.end();
		return putScriptedRcFile(req.params.name, req.body).then(function () {
			res.status(204);
			res.end();
		}).otherwise(function (err) {
			console.error("Error in request for '%s': %s", req.url, err);
			res.writeHead(500, {"Content-Type": "text/plain"});
			res.write(err + "\n");
		});
	});
};

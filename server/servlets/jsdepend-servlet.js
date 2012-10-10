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

//
// A servlet that provides access to the jsdepend api via  
// http.
//

var url = require('url');
var servlets = require('../servlets');
var configuration = require('../jsdepend/configuration');
var apiMaker = require('../jsdepend/api');
var makeRequestHandler = require('./servlet-utils').makeRequestHandler;

var conf = configuration.withBaseDir(null);
conf.sloppy = true;
var api = apiMaker.configure(conf);

var basePath = "/jsdepend"; 
   //where to serve all this api's functions. Each function will be served at
   // basePath + '/' + functionName

var expectedSignature = JSON.stringify(['JSON', 'callback', 'errback']);

function makeRequestHandler(fun) {
	var sig = fun.remoteType && JSON.stringify(fun.remoteType);
	if (sig === JSON.stringify(['JSON', 'callback', 'errback'])) {
		return function (response, request) {
			var args = JSON.parse(url.parse(request.url,true).query.args);
			console.log("jsdepend-servlet: "+url);
			//Note: the code here is rather specific and expects a certain function signature
			// of the functions in the api that is being exposed through this servlet
			fun(args[0], 
				function (result) {
					response.writeHead(200, {
						"Content-Type": "text/json",
						"Cache-Control": "no-store"
					});
					response.write(JSON.stringify(result)); //TODO: This breaks if 'result' is undefined
					response.end();
				},
				function (err) {
					console.error("Error in request for '%s': %s", request.url, err);
					response.writeHead(500, {"Content-Type": "text/plain"});
					response.write(err + "\n");
					response.end();
				}
			);
		};
	} else if (sig === JSON.stringify(['JSON', 'JSON', 'callback', 'errback'])) {
		return function (response, request) {
			var args = JSON.parse(url.parse(request.url,true).query.args);
			//Note: the code here is rather specific and expects a certain function signature
			// of the functions in the api that is being exposed through this servlet
			fun(args[0], args[1], 
				function (result) {
					response.writeHead(200, {
						"Content-Type": "text/json",
						"Cache-Control": "no-store"
					});
					response.write(JSON.stringify(result)); //TODO: This breaks if 'result' is undefined
					response.end();
				},
				function (err) {
					console.error("Error in request for '%s': %s", request.url, err);
					response.writeHead(500, {"Content-Type": "text/plain"});
					response.write(err + "\n");
					response.end();
				}
			);
		};
	} else {
		throw "Don't know how to make handler for: "+fun; 
	}
}

for (var functionName in api) {
	if (api.hasOwnProperty(functionName)) {
	    console.log('Creating servlet handler for function: '+functionName);
		var fun = api[functionName];
		if (typeof(fun)==='function') {
			servlets.register(basePath+"/"+functionName, makeRequestHandler(fun));
		} else {
		    console.log('SKIPPED: Not a function: '+functionName);
		}
	}
}

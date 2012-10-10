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
 
/*global console require exports */
var url = require('url');

function makeRequestHandler(fun) {
	var sig = fun.remoteType && JSON.stringify(fun.remoteType);
	if (sig === JSON.stringify(['JSON', 'callback', 'errback'])) {
		return function (response, request) {
			var args = JSON.parse(url.parse(request.url,true).query.args);
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
	} else if (sig === JSON.stringify(['JSON', 'callback'])) {
		return function (response, request) {
			var args = JSON.parse(url.parse(request.url,true).query.args);
			//Note: the code here is rather specific and expects a certain function signature
			// of the functions in the api that is being exposed through this servlet
			fun(args[0], 
				function () {
					response.writeHead(200, {
						"Content-Type": "text/json",
						"Cache-Control": "no-store"
					});
					response.write(JSON.stringify(Array.prototype.slice.call(arguments)));
					response.end();
				}
			);
		};
	} else if (sig === JSON.stringify(['JSON', 'JSON', 'callback'])) {
		return function (response, request) {
			var args = JSON.parse(url.parse(request.url,true).query.args);
			//Note: the code here is rather specific and expects a certain function signature
			// of the functions in the api that is being exposed through this servlet
			fun(args[0], args[1], 
				function () {
					response.writeHead(200, {
						"Content-Type": "text/json",
						"Cache-Control": "no-store"
					});
					response.write(JSON.stringify(Array.prototype.slice.call(arguments)));
					response.end();
				}
			);
		};
	} else {
		throw "Don't know how to make handler for: "+fun; 
	}
}

exports.makeRequestHandler = makeRequestHandler;
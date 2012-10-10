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

var sockjs = require('sockjs');
var http = require("http");
var url = require("url");

function start(route, handle) {
  function onRequest(request, response) {
    var pathname = url.parse(request.url).pathname;
    // Don't bother for favicon.ico
    if (pathname === '/favicon.ico') {
      return;
    }
    //console.log("Request for " + pathname + " received.");
    route(handle, pathname, response, request);
  }
  
	var echo = sockjs.createServer();
	echo.on('connection',function(conn) {
		conn.on('data', function(message) {
			conn.write(message);
			console.log("ws echo received '"+message+"'");
		});
		conn.on('close',function() {});
	});
	
	var server = http.createServer(onRequest);
	echo.installHandlers(server,{prefix:'/echo'});
	require('./servlets/incremental-search-servlet').install(server);
	require('./servlets/incremental-file-search-servlet').install(server);
	
	server.listen(7261, "127.0.0.1" /* only accepting connections from localhost */); 
	console.log("Server has started.");
  
  
	// https://github.com/Worlize/WebSocket-Node
//	var wsServer = new WebSocketServer({httpServer: server,autoAcceptConnections: false });
//	function originIsAllowed(origin) {
//		// TODO check it is localhost
//		return true;
//	}
//	wsServer.on('request',function(request) {
//		if (!originIsAllowed(request.origin)) {
//			request.reject();
//			console.log((new Date())+' Connection from origin '+request.origin+' rejected.');
//			return;
//		}
//		var connection = request.accept('echo-protocol', request.origin);
//		console.log((new Date())+' connection accepted.');
//		connection.on('message',function(message) {
//			if (message.type==='utf8') {
//				console.log('received message: '+message.utf8Data);
//				connection.sendUTF(message.utf8Data);
//			} else if (message.type==='binary') {
//				console.log('received binary message: '+message.binaryData.length+' bytes');
//				connection.sendBytes(message.utf8Data);
//			}
//		});
//		connection.on('close',function(rc,description) {
//			console.log((new Date())+' peer '+connection.remoteAddress+' disconnected');
//		});
//	});
}



exports.start = start;

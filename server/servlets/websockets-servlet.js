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

//
// This module provides the server-side implementation of a mechanism
// to create pseudo websockets that behave just like normal websockets but in actuality
// use only a single multiplexed websocket on the client side.
//
// This implementation is based on the 'websocket-multiplex' library.

var sockjs = require('sockjs');
var ws_multiplex = require('websocket-multiplex');

var multiplexer;

/**
 *  install the multiplexing websocket onto an app server.
 */
function install(app) {
	//This method will be called by 'client' servlets that depend on the multiplexer.
	//Ensure that we do not install ourselves more than once.
	if (!multiplexer) {
		var service = sockjs.createServer();
		multiplexer = new ws_multiplex.MultiplexServer(service);
		service.installHandlers(app, {prefix: '/websockets'});
	}
}

exports.install = install;
exports.createSocket = function (name) {
	if (!multiplexer) {
		throw "Ensure 'install' is called before trying to create sockets";
	}
	return multiplexer.registerChannel(name);
};



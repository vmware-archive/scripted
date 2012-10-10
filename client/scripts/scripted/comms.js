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
 *     Andy Clement (VMWare) - initial API and implementation
 ******************************************************************************/

/*global define console SockJS*/

/**
 * Manage websocket (through SockJS) based communications with the server.
 * not yet used!
 */
define(["sockjs"], function(sockjs) {

/*
	var sock = new SockJS("http://localhost:7261/echo");
	sock.onopen = function() {
		console.log('open');
		sock.send("helo");
	};
	sock.onmessage = function(e) {
		console.log('message', e.data);
	};
	sock.onclose = function() {
		console.log('close');
	};
	if (!window.comms) {
		window.comms = {};
	} 
	window.comms.editor = sock;
*/

});

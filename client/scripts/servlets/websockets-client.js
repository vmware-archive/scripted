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
/*global SockJS WebSocketMultiplex*/
define(["sockjs", "websocket-multiplex"], function () {

	var sockjs; //A websocket... the one and only used by the client
	var multiplexer; // The multiplexer that create multiple 'fake' websockets using just the one.

	/**
	 * Lazy initialize the websocket multiplexer.
	 */
	function init() {
		if (!multiplexer) {
			sockjs = new SockJS('/websockets');
			sockjs.addEventListener('close', function () {
				//console.log('Oh no our one and only websocket just got closed!');
				//Not to worry... next time we need one, just open a new one.
				sockjs = null;
				multiplexer = null;
			});
			multiplexer = new WebSocketMultiplex(sockjs);
		}
	}
	
	/**
	 * Open a new channel to a server side service
	 * @param {string} name of the server-side end point accessible over a mutliplexed connection.
	 * @return {WebSocket}
	 */
	function channel(name) {
		init();
		return multiplexer.channel(name);
	}
	
	return {
		channel: channel
	};
});
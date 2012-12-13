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
 
/*global require define console exports SockJS */
define(["./websockets-client"], function (multiplexer) {
	//var sockjs = require('sockjs');
	//sockjs library actually stuffs its api into globals (i.e. you simple do 'new SockJS(...)')
	
	var nextId = 0;

	function incrementalSearch(currentFile, query, requestor) {
	
		var message_queue = []; //push messages in here while waiting for onopen event.
		                        // once connection is opened this is set to null
	
		var options = {};
		var id = nextId++;
		var sock = multiplexer.channel('isearch');
		
		for (var p in requestor) {
			//any non-function properties in the requestor will be treated as 'options'
			//and passed onto the server side along with the query.
			if (requestor.hasOwnProperty(p)) {
				var opt = requestor[p];
				if (typeof(opt)!=='function') {
					options[p] = opt;
				}
			}
		}
		
		function send(json) {
			if (message_queue) {
				message_queue.push(json);
			} else if (sock) {
				sock.send(JSON.stringify(json));
			}
		}
		
		function receive(json) {
			for (var p in json) {
				if (json.hasOwnProperty(p)) {
					var listener = requestor[p];
					if (typeof(listener)==='function') {
						listener.apply(requestor, json[p]);
					} else {
						console.error('no handler for: ', json);
					}
				}
			}
		}
		
		sock.onopen = function (conn) {
			// console.log('['+id+'] opened');
			var pending = message_queue;
			message_queue = null;
			//Important: this message allways needs to be sent first.
			send({
				query:[currentFile, query, options]
			});
			//These may have been sent earlier... but logically they were intented to
			//be sent after the onopen / init sequence has played out. So it should
			//be sent *after* the initial query parameters.
			for (var i = 0; i < pending.length; i++) {
				send(pending[i]);
			}
		};
		sock.onmessage = function (e) {
			//console.log('['+id+'] received:'+ e.data);
			receive(JSON.parse(e.data));
		};
		sock.onclose = function () {
			//console.log('['+id+'] closed');
		};
		
		return {
			//This returns some functions that may useful to call on the client side to
			//manipulate an existing interactive search.
			
			/**
			 * should be called when the search is no longer needed. Allows releasing
			 * resources associated with it (e.g. closing the websocket connection we
			 * have opened to the server.
			 */
			close: function () {
				sock.close();
			},
			/**
			 * Change the query. This may result in some already received results being
			 * 'revoked' and new results being 'added'.
			 */
			query: function (newQuery) {
				send({requery: [newQuery]});
			},
			/**
			 * Ask for more results. If the server-side process is currently paused
			 * Then its result limit will be raised and the process resumed.
			 */
			more: function () {
				send({more: []});
			}
		};
	}
	
	return incrementalSearch;
});
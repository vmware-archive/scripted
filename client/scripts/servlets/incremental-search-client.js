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
define(["sockjs"], function () {
	//var sockjs = require('sockjs'); 
	//sockjs library actually stuffs its api into globals (i.e. you simple do 'new SockJS(...)')
	
	var nextId = 0;

	function incrementalSearch(currentFile, query, requestor) {
		var options = {}; 
		var id = nextId++;
		var sock = new SockJS('/isearch');
		
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
			sock.send(JSON.stringify(json));
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
			console.log('['+id+'] opened');	
			send({
				query:[currentFile, query, options]
			});
		};
		sock.onmessage = function (e) {
			//console.log('['+id+'] recieved:'+ e.data);
			receive(JSON.parse(e.data));
		};
		sock.onclose = function () {
			console.log('['+id+'] closed');	
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
			}
		};
	}
	
	return incrementalSearch;
});
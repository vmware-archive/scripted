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
 
/*global require exports console*/

//This servlet is 'special' and doesn't get registered in the same 
//way/place that other servlets do.

//See server.js to find where this 'servlet' handlers gets registered.

//The reason this servlet is 'special' is it doesn't
//have a simple http request handler but uses 'sockjs' (WebSockets).

var sockjs = require('sockjs');
var conf = require('../jsdepend/configuration').withBaseDir(null);
var extend = require('../jsdepend/utils').extend;
var toRegexp = require('../jsdepend/utils').toRegexp;
var getFileName = require('../jsdepend/utils').getFileName;
var fswalk = require('../jsdepend/fswalk').configure(conf).fswalk;
var fileindexer = require('../jsdepend/file-indexer').configure(conf);

var LOG_SOCKET_COUNT = true;

exports.install = function (server) {

	var openSockets = 0;

	var sockServer = sockjs.createServer();
	sockServer.on('connection', function (conn) {
		//opening a websocket connection initiates a search.
		
		if (LOG_SOCKET_COUNT) {
			openSockets++;
			console.log('isearch socket opened ['+openSockets+']');
		}

		var query = null; //The thing we are searching for... set once received via the socket.
		var regexp = null; //the query as a regexp.
		var currentFile = null; //The file the query was launched from, this determines the search context.
		var indexer = null; //Set when we have determined/received the search context.
							//right now the indexer is really not used, except to determine the 'root' of
							//scripted file system associated with the currentFile
		var options = {};
		
		var results = {}; //The 'keys' of this map are the results we have already sent to the client.
		var activeWalker = null; //the current walker, allows cancelation if we need to start a brand new walker.
		
		/**
		 * send data to the client. The data sent must be something that can be 'JSON.stringified'.
		 */
		function send(json) {
			conn.write(JSON.stringify(json));
		}
		
		function addResult(path) {
			if (!results[path]) {
				results[path] = path;
				send({add: [path]}); 
			}
		}
		function revokeResult(path) {
			if (results[path]) {
				delete results[path];
				send({revoke: [path]});
			}
		}
		
		function isMatch(path) {
			var name = getFileName(path);
			return regexp.test(name);
		}
		
		function startSearch() {
			if (!currentFile) {
				console.error('Can not start search: the search context is not defined');
			}
			var canceled = false;
			fswalk(indexer.getRootDir(), 
				/*called for eachFile*/
				function (filepath) {
					//Test for canceled status before matching / adding. This is to
					//make sure we don't accidentally add one more result after a walker has been canceled.
					if (!canceled) {
						if (isMatch(filepath)) {
							addResult(filepath);
						}
					}
					return canceled;
				},
				/*called when walk stops*/
				function () {
					if (!canceled) {
						send({done: []});
					}
				}
			);
			return {
				cancel: function () {
					canceled = true;
				}
			};
		}

		/**
		 * @param Query newQ 
		 * @param Query oldQ 
		 * @return true if and only if results of oldQ include should at least include the results of newQ.
		 */
		function isMoreSpecificThan(newQ, oldQ) {
			return newQ.indexOf(oldQ)>=0;
		}
		
		function cancelActiveWalker() {
			if (activeWalker) {
				activeWalker.cancel();
			}
		}
		
		var handlers = {
			//initial query and other info needed to setup a search
			query: function (cf, q, opts) {
				if (!query) {
					currentFile = cf;
					query = q;
					regexp = toRegexp(q);
					options = opts || {};
					//console.log('search options: '+JSON.stringify(options));
					fileindexer.getIndexer(currentFile, function (ixr) {
						indexer = ixr;
						activeWalker = startSearch();
					});
				} else {
					console.error("multiple queries received on the same /isearch connection");
				}
			},
			//change the current query, possibly in midrun
			requery: function (q) {
				//console.log('change query '+query+' => ' + q);
				var oldQuery = query;
				query = q;
				regexp = toRegexp(q);
				for (var oldResult in results) {
					if (results.hasOwnProperty(oldResult)) {
						if (isMatch(oldResult)) {
							//still a match... so keep it.
						} else {
							revokeResult(oldResult);
						}
					}
				}
				if (!isMoreSpecificThan(query, oldQuery) && indexer) {
					console.log('new query is not an "extension": restarting query');
					//If the query is not more specialized from the oldQuery, we have to restart the search
					//or we risk not getting all matches in the already processed part of the tree.
					//It is possible, (when typing really fast :-) a query update is received before the indexer got set.
					//This really means the 'activeSearch hasn't quite started yet so in that case, we we don't need to and restart it.
					cancelActiveWalker();
					activeWalker = startSearch();
				} else {
					//console.log('filtering existing query results');
				}
			}
		};

		/**
		 * Called upon receiving data from the client. The data is already parsed into a
		 * data object once it gets here.
		 */
		function receive(json) {
			for (var p in json) {
				if (json.hasOwnProperty(p)) {
					if (!handlers[p]) {
						console.error('No handler for: ' + JSON.stringify(json));
					} else {
						handlers[p].apply(null, json[p]);
					}
				}
			}
		}
		conn.on('data', function (message) {
			//console.log("message received: "+message);
			receive(JSON.parse(message));
		});
		
		conn.on('close', function () {
			cancelActiveWalker();
			if (LOG_SOCKET_COUNT) {
				openSockets--;
				console.log('isearch socket CLOSED ['+openSockets+']');
			}
		});
	});
	sockServer.installHandlers(server, {prefix: '/isearch'});
	
};

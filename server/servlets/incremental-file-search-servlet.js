/*global require exports process console*/

//This servlet is 'special' and doesn't get registered in the same 
//way/place that other servlets do.

//See server.js to find where this 'servlet' handlers gets registered.

//The reason this servlet is 'special' is it doesn't
//have a simple http request handler but uses 'sockjs' (WebSockets).

var sockjs = require('sockjs');
var conf = require('../jsdepend/configuration').withBaseDir(null);
var extend = require('../jsdepend/utils').extend;
var getFileName = require('../jsdepend/utils').getFileName;
var searchFile = require('../textsearch/searcher').searchFile;
//var fileindexer = require('../jsdepend/file-indexer').configure(conf);
var fswalk = require('../jsdepend/fswalk').configure(conf).asynchWalk;

var LOG_SOCKET_COUNT = true;
var MAX_RESULTS = 30; // When this number is reached, then the walker will be paused.
					  // Note that the walker can not be paused in the middle of a file
					  // just yet (the contents of the file is not walked in a pausable way)
					  // So the number of results may still exceed this limit.

exports.install = function (server) {

	var openSockets = 0;

	var sockServer = sockjs.createServer();
	sockServer.on('connection', function (conn) {
		//opening a websocket connection initiates a search.
		
		if (LOG_SOCKET_COUNT) {
			openSockets++;
			console.log('ifsearch socket opened ['+openSockets+']');
		} 
		
		var idCount = 1; //counter used to assing unique id's to all query results. This used to
		                 // identify results for later 'revoke' events.

		var query = null; //The thing we are searching for... set once received via the socket.

		var activeWalker = null; //the current walker, allows cancelation if we need to start a brand new walker.
		var resultCount = 0; // Tracks number of results. Used to limit the number of results sent to the client.
		var results = {}; // The 'keys' of this map are the results we have already sent to the client.
		var searchRoot = null; //The file system path in which to start the search
							   //Set when we have determined/received the search context.
		var options = {};
		
		/**
		 * send data to the client. The data sent must be something that can be 'JSON.stringified'.
		 */
		function send(json) {
			conn.write(JSON.stringify(json));
		}

		/**
		 * Ensure that result object has an 'id' field. Return the id of the object.
		 */
		function identify(result) {
			result.id = result.id || idCount++;
			return result.id;
		}

		function isMatch(oldResult) {
			var ofs = oldResult.col;
			var matching = oldResult.context.substring(ofs,ofs+query.length)===query;
			if (matching) {
				oldResult.text = query;
			}
			//var pre = oldResult.context.substring(0,ofs);
			//var rest = oldResult.context.substring(ofs);
			//console.log('isMatch('+query+') '+matching+' '+pre+'^'+rest+' '+oldResult.context);
			return matching;
		}
		
		function updateResult(result) {
			//Search term already update by 'isMatch' check as a side effect.
			//result.term = query; 
			
			//The actual result object is being re-used so we don't need to
			//update our map associating id's to result objects.
			
			send({update: [result]});
		}
		
		function addResult(result) {
			var id = identify(result);
			if (!results[id]) {
				results[id] = result;
				//console.log("Sending result "+JSON.stringify(result));
				send({add: [result]}); 
				resultCount++;
				if (resultCount >= MAX_RESULTS && activeWalker) {
					activeWalker.pause();
				}
			}
		}
		
		function revokeResult(result) {
			if (results[result.id]) {
				delete results[result.id];
				send({revoke: [result.id]});
				resultCount--;
			}
		}
		
		function revokeAll() {
			for (var id in results) {
				if (results.hasOwnProperty(id)) {
					send({revoke: [id]});
				}
			}
			results = {};
			resultCount = 0;
		}
		
		function startSearch() {
			if (!searchRoot) {
				console.error('Can not start search: the search context is not defined');
			}
			var canceled = false;
			var paused = false; // Intially, set to true when pause is requested. Then when 
			                    // work is actually suspended, a 'work' function will be
			                    // stored in here. To resume the work, this function is
			                    // called with no params.
			 
			//console.log("starting search in: "+searchRoot);
			
			/**
			 * Given a function that represents 'remaining work'. Either continue the work,
			 * by calling this function. Or store the function for later resuming the work.
			 */
			function pauseOrRun(work) {
				//process.nextTick(work);
				if (paused===true) { // a 'pause' was requested.
					//console.log("suspend walking");
					paused = work;
				} else {
					if (!paused) {
						//console.log("continue walking");
						process.nextTick(work);
					} else {
						//Seems like somehow a walker is both running and suspended at the same time. That should not
						//be possible!
						throw "Illegal state: It looks like we still have a function in 'paused' although walker is still running!";
					}
				}
			}

			fswalk(searchRoot, 
				/*called for each file*/
				function (filepath, k) {
					pauseOrRun(function(){
						if (!canceled) {
							searchFile(query, filepath, 
								//called on each match in the file (may be called 0 or more times)
								function (match) {
									if (!canceled) {
										addResult(match);
									}
								},
								//called when file is fully processed
								function () {
									k(canceled);
								}
							);
						} else {
							k(canceled);
						}
					});
				},

				/*called when walk stops*/
				function () {
					if (!canceled) {
						//console.log("sending done");
						send({done: []});
					}
				}
			);
			//Return a bunch of functions that allow manipulating the active search (pause, resume, cancel it).
			return {
				cancel: function () {
					canceled = true;
				},
				pause: function () {
					//If double pausing, take care not to accidentally wipe out a work function that may 
					//already be stored in the 'paused' variable.
					paused = paused || true; 
				},
				resume: function () {
					if (typeof(paused)==='function') {
						//we have some work to resume
						var work = paused;
						paused = false;
						work();
					} else if (paused) {
						//paused, but we have no work to resume.
						paused = false;
					}
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
				activeWalker = null;
			}
		}
		
		var handlers = {
			//initial query and other info needed to setup a search
			query: function (cf, q, opts) {
				if (!query) {
					searchRoot = cf;
//					if (searchRoot.substring(searchRoot.length-1)!=='/') {
//						searchRoot = searchRoot+"/";
//					}
					query = q;
					options = opts || {};
					//console.log('search options: '+JSON.stringify(options));
					activeWalker = startSearch();
//					fileindexer.getIndexer(currentFile, function (ixr) {
//						indexer = ixr;
//						activeWalker = startSearch();
//					});
				} else {
					console.error("multiple queries received on the same /ifsearch connection");
				}
			},
			//change the current query, possibly in midrun
			requery: function (q) {
				//console.log('change query '+query+' => ' + q);
				var oldQuery = query;
				query = q;
				if (!isMoreSpecificThan(query, oldQuery) && activeWalker) {
					//console.log('new query is not an "extension": restarting query');
					//If the query is not more specialized from the oldQuery, we have to restart the search
					//or we risk not getting all matches in the already processed part of the tree.
					cancelActiveWalker();
					revokeAll();
					activeWalker = startSearch();
				} else {
					//console.log('filtering existing query results');
					for (var id in results) {
						if (results.hasOwnProperty(id)) {
							var oldResult = results[id];
							if (isMatch(oldResult)) {
								//still a match... but the highlighting of the search term is changed...
								//so udpate it.
								updateResult(oldResult);
							} else {
								revokeResult(oldResult);
							}
						}
					}
					if (resultCount<MAX_RESULTS) {
						//console.log("Resume walking");
						activeWalker.resume();
					} else {
						//console.log("Not resuming because resultCount = "+resultCount);
					}
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
				console.log('ifsearch socket CLOSED ['+openSockets+']');
			}
		});
	});
	sockServer.installHandlers(server, {prefix: '/ifsearch'});
	
};

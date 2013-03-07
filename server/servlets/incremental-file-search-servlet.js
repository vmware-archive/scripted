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
 *     Any Clement
 ******************************************************************************/
 /*global require exports process console*/

var SERVICE_NAME = 'ifsearch';

//This servlet is 'special' and doesn't get registered in the same
//way/place that other servlets do.

//See server.js to find where this 'servlet' handlers gets registered.

//The reason this servlet is 'special' is it doesn't
//have a simple http request handler but uses 'sockjs' (WebSockets).

var when = require('when');
var websockets = require('./websockets-servlet');
var extend = require('../jsdepend/utils').extend;
var getFileName = require('../jsdepend/utils').getFileName;
var deref = require('../jsdepend/utils').deref;

var LOG_SOCKET_COUNT = false;
var MAX_RESULTS_DEFAULT = 30; // When this number is reached, then the walker will be paused.
					  // Note that the walker can not be paused in the middle of a file
					  // just yet (the contents of the file is not walked in a pausable way)
					  // So the number of results may still exceed this limit.

function debug_log(msg, obj) {
//	console.log(msg + JSON.stringify(obj));
}

exports.install = function (server, filesystem) {

	var searchFile = require('../textsearch/searcher').configure(filesystem);
	var getDotScripted = require('../jsdepend/dot-scripted').configure(filesystem).getConfiguration;
	var fsPriorityWalk = require('../utils/fs-priority-walk').configure(filesystem);
	var makePriorityFun = fsPriorityWalk.makePriorityFun;
	var fswalk = fsPriorityWalk.fswalk;

	websockets.install(server);

	var openSockets = 0;

	var sockServer = websockets.createSocket(SERVICE_NAME);
	sockServer.on('connection', function (conn) {
		//opening a websocket connection initiates a search.

		var maxResults = null; // set upon receipt of the initial query
		                // can also be increased by a request for more results.

		if (LOG_SOCKET_COUNT) {
			openSockets++;
			//console.log('ifsearch socket opened ['+openSockets+']');
		}

		var idCount = 1; //counter used to assing unique id's to all query results. This used to
		                 // identify results for later 'revoke' events.

		var query = null; //The thing we are searching for... set once received via the socket.

		var activeWalker = null; //the current walker, allows cancelation if we need to start a brand new walker.
		var resultCount = 0; // Tracks number of results. Used to limit the number of results sent to the client.
		var results = {}; // The 'keys' of this map are the results we have already sent to the client.
		var searchRoot = null; //The file system path in which to start the search
							   //Set when we have determined/received the search context.
		var priorityFun = null; // priorityFun for walker, based on search root.
								// Set once when configured.
		var options = {};

		/**
		 * send data to the client. The data sent must be something that can be 'JSON.stringified'.
		 */
		function send(json) {
			debug_log('ifsearch >> ', json);
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
				if (resultCount >= maxResults && activeWalker) {
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
			if (!priorityFun) {
				console.error('Can not start search: the priority function is not configured');
			}
			var canceled = false;
			var paused = false; // Intially, set to true when pause is requested. Then when
			                    // work is actually suspended, a 'work' function will be
			                    // stored in here. To resume the work, this function is
			                    // called with no params.
			var done = false; // Set to true when search has finished the whole walk

			//console.log("starting search in: "+searchRoot);

			/**
			 * Returns a promise we can call 'then' on to do some work.
			 * The promise may be resolved immediately or it may be a real promise
			 * when a 'pause' was requested. In that case the promise will be resolved
			 * when the work needs to be resumed.
			 */
			function pauseOrRun() {
				//process.nextTick(work);
				if (paused===true) { // a 'pause' was requested.
					//console.log("suspend walking");
					paused = when.defer();
					send({pause:[]});
					return paused.promise;
				} else {
					if (!paused) {
						return when.resolve();
					} else {
						//Seems like somehow a walker is both running and suspended at the same time. That should not
						//be possible!
						return when.reject("Illegal state: It looks like we still have a 'paused' promise although walker is still running!");
					}
				}
			}

			send({start:[]});
			fswalk(searchRoot, priorityFun, function (filepath) {
				return pauseOrRun().then(function() {
					if (!canceled) {
						var d = when.defer();
						searchFile(query, filepath,
							//called on each match in the file (may be called 0 or more times)
							function (match) {
								if (!canceled) {
									addResult(match);
								}
							},
							//called when file is fully processed
							function () {
								if (canceled) {
									d.reject('canceled');
								} else {
									d.resolve();
								}
							}
						);
						return d.promise;
					} else {
						throw 'canceled';
					}
				});
			}).then(function () {
				done = true;
				send({done: []});
			}).otherwise(function (err) {
				if (err!=='canceled') {
					console.error(err);
					if (err.stack) {
						console.log(err.stack);
					}
				}
			});
			//Return a bunch of functions that allow manipulating the active search (pause, resume, cancel it).
			return {
				cancel: function () {
					canceled = true;
				},
				pause: function () {
					//If double pausing, take care not to accidentally wipe out a deferred that may
					//already be stored in the 'paused' variable.
					paused = paused || true;
				},
				resume: function () {
					if (done) {
						//Client will expect/need to see something happening here even though there's
						// nothing to do. Send start and done events to the client so it will
						// get what it expects and can update 'noresults found' info if needed.
						send({start:[]});
						send({done:[]});
					} else if (paused && paused.resolve) {
						//we have some work to resume
						var deferred = paused;
						paused = false;
						deferred.resolve();
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
			//Note: we only count a query as 'more specific' if it is extended by adding chars to the end.
			// This is because the 'isMatch' function used to recheck old query results only handles that
			// case correctly. The issue is that the start positions of the match has to line up.
			// A more complex implementation may handle this case but this case is uncommon so just
			// restarting the whole query seems acceptable.
			return newQ.indexOf(oldQ)===0;
		}

		function cancelActiveWalker() {
			if (activeWalker) {
				activeWalker.cancel();
				activeWalker = null;
			}
		}

		var handlers = {
			//initial query and other info needed to setup a search
			query: function (sr, q, opts) {
				if (!query) {
					searchRoot = sr;
					query = q;
					options = opts || {};
					maxResults = options.maxResults || MAX_RESULTS_DEFAULT;
					//console.log('maxResults = '+maxResults);
					getDotScripted(sr).then(function (dotScripted) {
						var priorityConf = {
							fsroot: deref(dotScripted, ['fsroot']),
							exclude: deref(dotScripted, ['search', 'exclude']),
							deemphasize: deref(dotScripted, ['search', 'deemphasize'])
						};
						priorityFun = makePriorityFun(priorityConf);
						activeWalker = startSearch();
					}).otherwise(function(err) {
						console.error(err);
						if (err.stack) {
							console.log(err.stack);
						}
					});
				} else {
					console.error("multiple queries received on the same /ifsearch connection");
				}
			},
			//ask for more results: increases maxResults to be at least the current number
			//of results plus 10%
			more: function () {
				if (activeWalker) {
					maxResults = Math.max(maxResults, resultCount * 1.1);
					//console.log('maxResults = '+maxResults);
					activeWalker.resume();
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
					if (activeWalker && resultCount<maxResults) {
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
			debug_log('ifsearch << ', json);
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
				//console.log('ifsearch socket CLOSED ['+openSockets+']');
			}
		});
	});
	//sockServer.installHandlers(server, {prefix: '/ifsearch'});

};

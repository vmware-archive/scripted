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

var SERVICE_NAME = 'isearch';

//This servlet is 'special' and doesn't get registered in the same
//way/place that other servlets do.

//See server.js to find where this 'servlet' handlers gets registered.

//The reason this servlet is 'special' is it doesn't
//have a simple http request handler but uses 'sockjs' (WebSockets).

var websockets = require('./websockets-servlet');
var conf = require('../jsdepend/filesystem').withBaseDir(null);
var extend = require('../jsdepend/utils').extend;
var toRegexp = require('../jsdepend/utils').toRegexp;
var getFileName = require('../jsdepend/utils').getFileName;
var fswalk = require('../jsdepend/fswalk').configure(conf).asynchWalk;
var fileindexer = require('../jsdepend/file-indexer').configure(conf);

var LOG_SOCKET_COUNT = true;
var MAX_RESULTS_DEFAULT = 30; // When this number is reached, then the walker will be paused.

exports.install = function (server) {

	websockets.install(server); // the websockets servlet is a prerequisite. Ensure its installed.

	var openSockets = 0;
	var nextId = 0;

	var sockServer = websockets.createSocket(SERVICE_NAME);
	sockServer.on('connection', function (conn) {
		var id = nextId++; // used for log messages only.
		
		//opening a websocket connection initiates a search.
		
		var maxResults = null; // set upon receipt of the initial query
		                // can also be increased by a request for more results.
		
		if (LOG_SOCKET_COUNT) {
			openSockets++;
			console.log('isearch socket opened ['+openSockets+']');
		}

		var query = null; //The thing we are searching for... set once received via the socket.
		var regexp = null; //the query as a regexp.
		var searchRoot = null; //Set when we have determined/received the search context.
		var options = {};
		
		var results = {}; //The 'keys' of this map are the results we have already sent to the client.
		var activeWalker = null; //the current walker, allows cancelation if we need to start a brand new walker.
		var resultCount = 0; // Tracks number of results. Used to limit the number of results sent to the client.
		
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
				resultCount++;
				if (resultCount >= maxResults && activeWalker) {
					activeWalker.pause();
				}
			}
		}
		function revokeResult(path) {
			if (results[path]) {
				delete results[path];
				send({revoke: [path]});
				resultCount--;
			}
		}
		
		function isMatch(path) {
			var name = getFileName(path);
			return regexp.test(name);
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
			
			/**
			 * Given a function that represents 'remaining work'. Either continue the work,
			 * by calling this function. Or store the function for later resuming the work.
			 */
			function pauseOrRun(work) {
				//process.nextTick(work);
				if (paused===true) { // a 'pause' was requested.
					console.log("suspend walking");
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
				/*called for eachFile*/
				function (filepath, k) {
					pauseOrRun(function () {
						//Test for canceled status before matching / adding. This is to
						//make sure we don't accidentally add one more result after a walker has been canceled.
						if (!canceled) {
							if (isMatch(filepath)) {
								addResult(filepath);
							}
						}
						return k(canceled);
					});
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
						console.log('Resume walking');
						work();
					} else if (paused) {
						//paused, but we have no work to resume.
						paused = false;
					}
				}
			};
		}

		/**
		 * @param {Query} newQ
		 * @param {Query} oldQ
		 * @return true if and only if results of oldQ should at least include the results of newQ.
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
			query: function (sr, q, opts) {
				if (!query) {
					searchRoot = sr;
					query = q;
					regexp = toRegexp(q);
					options = opts || {};
					maxResults = options.maxResults || MAX_RESULTS_DEFAULT;
					//console.log('search options: '+JSON.stringify(options));
					activeWalker = startSearch();
				} else {
					console.error("multiple queries received on the same /isearch connection");
				}
			},
			
			//ask for more results: increases maxResults to be at least the current number
			//of results plus 10%
			more: function () {
				if (activeWalker) {
					maxResults = Math.max(maxResults, resultCount * 1.1);
					console.log('maxResults = '+maxResults);
					activeWalker.resume();
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
				if (activeWalker) {
					//It is possible, (when typing really fast :-) a query update is received before walker got set.
					//This really means the 'activeWalker hasn't quite started yet so in that case, we we don't need
					//to restart or resume it.
					//Note: this is only possible if starting the activewalker is an 'asynch' thing.
					//Right now it isn't any more, so strictly speaking the if above is not needed and
					//should always be true. Leave it in anyway in case we might go back to
					//needing some asynch work in getting the walker going.
					if (!isMoreSpecificThan(query, oldQuery)) {
						console.log('new query is not an "extension": restarting query');
						//If the query is not more specialized from the oldQuery, we have to restart the search
						//or we risk not getting all matches in the already processed part of the tree.
						cancelActiveWalker();
						activeWalker = startSearch();
					} else {
						if (activeWalker && resultCount<maxResults) {
							//Note: we can get here with activeWalker still null if the the
							//initial query is not started yet. This can happen because we have ascynch
							//code in determining the search context.
							activeWalker.resume();
						}
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
			//console.log("isearch ["+id+"] << "+message);
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
	//sockServer.installHandlers(server, {prefix: '/isearch'});
	
};

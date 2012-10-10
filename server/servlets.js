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
 
/*global setTimeout exports console*/
// A basic servlets registry: maps handlers to specific request paths.

var registry = {}; //The registry. Maps a String (path) to a request handler function

var DEBUG = false; // When this is true it adds log messages to track start and end
                  // of request handling. The messages include two numbers at the
                  // end of handling each request. The first number is the
                  // number of still active request handlers (if all is well this
                  // number should return to zero within a reasonable time.
                  // The second number is the time the handler took in millis.
                  // If all is well this number should be relatively small (<100 millis).
                  // There's also an additional mechanism that allerts when
                  // requests are not serviced within 5000 millis. This could
                  // happen if request take too long, or the request handler
                  // 'dropped the ball' somewhere and is never going to complete.

var activeRequestCounter = 0;

function makeLogged(handlerFun) {

	function loggedHandler(response, request) {
	
		request.startedHandling = Date.now(); //Add this so we can log how long it took.
		activeRequestCounter++;
	
		function makeLoggedEnd(innerEnd) {
			function loggedEnd() {
				//console.log('About to END:'+request.url);
				innerEnd.apply(this, arguments);
				request.endedHandling = Date.now();
				activeRequestCounter--;
				console.log('END handling ['+activeRequestCounter+'] ['+(Date.now()-request.startedHandling)+']:'+request.url);
			}
			return loggedEnd;
		}
	
		console.log('START handling: '+request.url);
		setTimeout(function () {
			//log requests that take longer than 5000 millis to handle
			if (!request.endedHandling) {
				console.log('UNHANDLED or SLOW (5 secs and still not handled): '+request.url);
				console.log('active requests = '+activeRequestCounter);
			}
		}, 5000);

		if ('loggedEnd'!==response.end.name) {
			response.end = makeLoggedEnd(response.end);
		}
				
		handlerFun.apply(this, arguments);		
	}

	return loggedHandler;

}

function register(path, handlerFun) {

	if (DEBUG) {
		handlerFun = makeLogged(handlerFun);
	}

	if (registry[path]) {
		throw 'servlet registry already has an entry for:' + path;
	}
	registry[path] = handlerFun;
	console.log("Registering a servlet for path: "+path);
}

function lookup(path) {
//	console.log('>>>> Servlet Registry ');
//	for (var key in registry) {
//		if (registry.hasOwnProperty(key)) {
//			console.log(key);
//		}
//	}
//	console.log('<<<<< Servlet Registry ');

	if (registry.hasOwnProperty(path)) {
		return registry[path];
	}
	return undefined;
}

exports.lookup = lookup;
exports.register = register;

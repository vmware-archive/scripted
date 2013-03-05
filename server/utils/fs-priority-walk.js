/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *   Kris De Volder
 ******************************************************************************/

//
// Utility similar to the old 'fswalk' but allows assigning priorities
// to files and directories based on their paths.
//
// This works much like fswalk, starting to walk a tree from the
// root but as it visits files/dirs they are being queued and processed
// according to priorities.
//
// Directories or files with lower priority will not be entered/searched
// until other directories / files with higher priority have all been
// processed.
//
// Note hoever that a file/dir assigned a very high-priority but burried
// inside a directory with low priority will only be reachable after the search
// has already entered the parent.
//
// If a 'burried' directory / file needs to be searched early on then priorities
// on the parent directory should be set high as well.

var PRIORITY_INVISIBLE = "invisible"; // A Special symbolic priority that completely
                                      // hides/skips any items with this priority
                                      // in the walk.

var PRIORITY_DEFAULT = 0; // Anything not assigned a priority by the priorityFun will
						  // be given this default priority.

						  // Typically client should provide a priority fun that assigns
						  // smaller (i.e. negative) numbers to things it wants to de-emphasize
						  // in the search.

var PriorityQueue = require('priorityqueuejs');
var when = require('when');
var timeout = require('when/timeout');
var pathJoin = require('../jsdepend/utils').pathJoin;

function compare(item1, item2) {
	return item1.priority - item2.priority;
}

/**
 * Try to detect 'bad' promisified function calls that have somehow dropped the ball
 * and not resolved their promise. We do this by allowing a generous timeout for the
 * promise to resolve and if it resolves on the timeout. Then we log something.
 */
function badPromiseFunctionFinder(f) {
	function wrap() {
		//We may not need all of this info but hey!
		var args = Array.prototype.slice.call(arguments);
		var stack = new Error().stack;
		var promise = timeout(
			f.apply(this, arguments),
			60000 //a minute is long, but trust me it'll be worht the wait to find
			      // out who's the culprit
		);
		promise.otherwise(function (err) {
			if (err && err.message==='timed out') {
				console.log('TIMED-OUT: '+f.name);// + JSON.stringify(args));
				console.log(stack);
			}
		});
		return promise;
	}
	wrap.name = f.name;
	return wrap;
}

function configure(conf) {

	var listFiles = badPromiseFunctionFinder(conf.listFiles);
	var isDirectory = badPromiseFunctionFinder(conf.isDirectory);

	/**
	 * Walk a subtree on the filesystem starting at a given rootpath and using
	 * a given priority function to influence the walking order.
	 *
	 * The priority function may return the following values:
	 *   - numeric priority. Higher numbered priorities will be processed earlier.
	 *   - 'invisible': a special priority causing the item to be completely ignored.
	 *   - undefined: automatically replaced with default numeric priority of 0.
	 *
	 * @param {String} rootPath where to start the walk
	 * @param {function(String):(String|Number)?
	 * @param {function(String):Promise} fileFun function that does some work on a file.
	 */
	function fswalk(rootPath, priorityFun, fileFun) {
		var worklist = new PriorityQueue(compare);

		fileFun = badPromiseFunctionFinder(fileFun);

		/**
		 * Create a work item for the priority queue, consists of a path and a priority.
		 */
		function workItem(path) {
			return {
				path: path,
				priority: priorityFun(path) || PRIORITY_DEFAULT
			};
		}

		/**
		 * Enqueue an item, but only if it doesn't have so low a priority
		 * that it is rendered 'INVISIBLE'.
		 */
		function enq(item) {
			if (item.priority === PRIORITY_INVISIBLE) {
				//console.log('SKIP : '+item.path);
				//Skip invisible items
			} else {
				worklist.enq(item);
			}
		}

		enq(workItem(rootPath));

		/**
		 * Walk until there's no more work in the worklist. Returns a promise
		 * that resolves when the walk terminates.
		 */
		function walk() {
			console.log('worklist.size = '+worklist.size());
			if (worklist.isEmpty()) {
				return when.resolve('Is finished');
			} else {
				var item = worklist.deq();
				//console.log(item.priority + ' : '+item.path);
				var path = item.path;
				return isDirectory(path).then(function (isDir) {
					if (isDir) {
						return listFiles(path).then(function (names) {
							names.forEach(function (name) {
								enq(workItem(pathJoin(path, name)));
							});
						});
					} else {
						return fileFun(path);
					}
				}).then(walk);
			}
		}

		walk = badPromiseFunctionFinder(walk);

		return walk();
	}

	fswalk = badPromiseFunctionFinder(fswalk);

	return fswalk;
}

exports.configure = configure;

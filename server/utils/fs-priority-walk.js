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

var PRIORITY_INVISIBLE = -1000; // Anything <= this will be completely skipped in
                                // searches.

var PRIORITY_DEFAULT = 0; // Anything not assigned a priority by the priorityFun will
						  // be given this default priority.

						  // Typically client should provide a priority fun that assigns
						  // smaller (i.e. negative) numbers to things it wants to de-emphasize
						  // in the search.

var PriorityQueue = require('priorityqueuejs');
var when = require('when');
var pathJoin = require('../jsdepend/utils').pathJoin;

function compare(item1, item2) {
	return item1.priority - item2.priority;
}

function configure(conf) {

	var priorityFun = conf.priorityFun;

	var listFiles = conf.listFiles;
	var isDirectory = conf.isDirectory;

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
	 * Walk a subtree the configured filesystem starting at a given rootpath and using
	 * configured priority function to influence the walking order.
	 *
	 * @param {String} rootPath where to start the walk
	 * @param {function(String):Promise} fileFun function that does some work on a file.
	 */
	function fswalk(rootPath, fileFun) {
		var worklist = new PriorityQueue(compare);

		/**
		 * Enqueue an item, but only if it doesn't have so low a priority
		 * that it is rendered 'INVISIBLE'.
		 */
		function enq(item) {
			console.log(item.priority + ' : '+item.path);
			if (item.priority <= PRIORITY_INVISIBLE) {
				console.log('SKIP : '+item.path);
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
			if (worklist.isEmpty()) {
				return when.resolve();
			} else {
				var item = worklist.deq();
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

		return walk();
	}

	return fswalk;
}

exports.configure = configure;
exports.PRIORITY_INVISIBLE = PRIORITY_INVISIBLE;

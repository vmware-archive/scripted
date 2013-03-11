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
// This is a manager for 'rest nodes'. The purpose of this manager is to
// keep a limit on the number of nodes kept in memory. For now nodes are
// only kept in memory. In the future it may be interesting to also
// migrate nodes to a disk based cache.
//

function configure(options) {

	var LOG_SIZE = true;

	var limit = options.limit || 2500;
	console.log('rest-cache-limit: '+limit);

	var size = 0; // Keep track of 'size' of the store
				  // Right now this is just the # of entries.
				  // In the future it may be a sum of sizes provided by each entry.

	var store = {};

	/**
	 * Only for debugging purposes: a very inefficient way to determine
	 * the current cache size
	 */
	function countSize() {
		return Object.keys(store).length;
	}

	var stressed = 0;

	function deleteOldest(count) {
		// We abuse a js object as a linked hashmap which is what it appears to be...
		// I.e. properties put in retain the insertion order when you iterate them.
		for (var url in store) {
			var entry = store[url];
			//Try to avoid purging busy nodes: this leads to trouble because
			// references are sill floating around in the 'fetching' process.
			if (!entry.fetching) {
				//console.log
				delete store[url];
				entry.destroy();
				size--;
				count--;
	//			console.log('purged: '+url);
				if (count<=0) {
					return;
				}
			} else {
				if (!this.stressed) {
					console.log('Rest-node-manager is Stressed!');
				}
				this.stressed = true;
			}
		}
		console.error("Rest node cache can't shrink: remaining "+size+" entries are locked");
		//Don't crash, just try to carry on...
		//throw new Error("Nothing more to delete");
	}
	function touch(url) {
		// We abuse a js object as a linked hashmap which is what it appears to be...
		// Deleting and reinserting a prop 'refreshes' it.
		var entry = store[url];
		delete store[url];
		store[url] = entry;
	}

	return {
		/**
		 * returns true if the cache appears to be stressed.
		 * In that case clients should back off from doing eager prefetching
		 * and other stuff that may just stress the cache even more.
		 */
		isStressed: function () {
			//TODO: Once a cache 'stressed' status is set to true
			// it is never cleared. May the stressed status should time
			// out if the pressure subsides.
			//Note: actually, this doesn't seem to get set really
			// that much (never seen!).
			return stressed;
		},
		get: function(url) {
			var entry = store[url];
			if (entry) {
				return entry;
			}
		},
		put: function(url, entry) {
			if (!entry) {
				throw new Error('Illegal argument');
			}
			var old = store[url];
			store[url] = entry;
			if (!old) {
				size++;
				if (size > limit) {
					deleteOldest(size - limit);
				}
				if (LOG_SIZE && size % 100===0) {
					console.log('rest cache size : '+size);
					if (size>=limit) {
						LOG_SIZE = false; //cache size will not change anymore stop logging it.
					}
//					console.log('REAL    rest cache size : '+countSize());
				}
			}
		}
	};

}

exports.configure = configure;


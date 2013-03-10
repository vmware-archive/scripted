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

var nodeCallback = require('../../utils/promises').nodeCallback;
var fsErrors = require('../fs-errors');
var readonlyFs = require('../read-only-fs');

var pathJoin = require('../../jsdepend/utils').pathJoin;
var when = require('when');

var LOGGING = false;

//
// Quick implementation of a 'github readonly fs'.
//
// Issues:
//   - rest client doesn't follow 'redirects' according to github api docs, it should.
//   - doesn't handle paginated results. So for large files or dirs with many subdirs
//     results may be incomplete.
//   - builds in-memory tree but doesn't update when tree structure changes
//     in the repo.
//   - in memory only grows. How to reclaim memory when not used for a long time?

function configure(options) {

	var cache = options.cache;
	if (!cache) {
		throw new Error('Please inject a rest-node cache');
	}

	//console.log('repoFs options = '+ JSON.stringify(options, null, '   '));

	if (!options.token) {
		throw new Error('github-repo-fs needs to be configured with a "token" for OAuth');
	}
	if (!options.owner) {
		throw new Error('github-repo-fs needs to be configured with a "owner"');
	}
	if (!options.repo) {
		throw new Error('github-repo-fs needs to be configured with a "repo"');
	}

	//The URL that should be used to fetch the 'root node' data.
	var API_ROOT = 'https://api.github.com/repos/'+options.owner+'/'+options.repo+'/contents';

	function getNode(url) {
		if (typeof(url)!=='string') {
			console.trace('Need url to create a node: '+url);
			throw new Error('Must have a url to create a node');
		}
//		console.log('>> getNode '+url);
		var cached = cache.get(url);
//		console.log('>> getNode from cache = '+cached);
		if (!cached) {
			cached = new Node(url);
//			console.log('>> getNode created = '+cached);
			cache.put(url, cached);
		}
//		console.log('>> getNode returning : '+cached);
		return cached;
	}

	var rest = require('./github-rest-client').configure({
		token: options.token
	});

	var INTERESTING = [
		//All nodes:
		'size', 'name', 'type', 'sha',
		//File nodes:
		'content', 'encoding'
	];

	//Helper to save memory by only retaining interesting data from rest response entities.
	function compress(source, interesting) {
		var dest = {}; //TODO: maybe faster (less garbage) if we delete props from source
		                // object directly?
		interesting.forEach(function (name) {
			if (source.hasOwnProperty(name)) {
				dest[name] = source[name];
			} else {
				delete dest[name];
			}
		});
		return dest;
	}

	/**
	 * A node represents a resource in a rest-api. It should always be possible
	 * to be fully reconsituted by getting the url.
	 *
	 * Before a node is retrieved it only contains a url.
	 */
	function Node(url) {
		this.url = url;
	}

	/**
	 * THe LRU cache calls this method to tell an element its been decommisioned.
	 * We remove most of the data... except for 'type' and 'url'.
	 * This is so we don't need to go hunt down references in other nodes.
	 * Before using stored nodes referring nodes should take responsibility
	 * to discover destroyed nodes and get rid of them.
	 */
	Node.prototype.destroy = function() {
		this.destroyed = true;
		delete this.data;
	};
	/**
	 * This function is called when the response has been received from
	 * the rest client.
	 */
	Node.prototype.setData = function (response, depth) {
		var data = response.entity;
		if (Array.isArray(data)) {
			//Directory node: we get a list of pointers to children.
			this.type = 'dir';
			var children = {};
			this.data = children;
			data.forEach(function (childData) {
				var name = childData.name, url = childData.url;
				if (name && url) {
					children[name] = url;
					var child = getNode(url);
					child.type = childData.type;
					if (depth && depth>1) {
//						console.log('BEG prefetc ['+depth+']: '+child.url);
						child.fetch(depth-1);
//						.then(function() {
//							console.log('END prefetch ['+depth+']: '+child.url);
//						});
					}
				} else {
					console.log('Ignoring unexpected child data:'+JSON.stringify(childData, null, '  '));
				}
			});
		} else if (data.type==='file') {
			this.type = data.type;
			this.data = compress(data, INTERESTING);
		} else if (data.type) {
			this.type = 'error';
			this.data = 'Unknown github data type: '+data.type;
		} else {
			this.type = 'error';
			this.data = data || 'no entity data';
		}
	};
	/**
	 * Fetch this node's contents from its url and store it in the node.
	 * Returns a promise that resolves when the data is fetched.
	 *
	 * Optional 'depth' parameter is used to also kick of an asynchronous
	 * prefetch of additional levels of the tree.
	 *
	 * The promise returned always resolves after the current node has been
	 * fetched. But it children will be fetched asynchrnously. This is in
	 * anticipation they may soon be needed.
	 */
	Node.prototype.fetch = function (depth) {
		if (depth===undefined) {
			depth = 1; // By default just fetch current node data.
		}
		if (!depth) {
			return when.resolve(this);
		}
		if (this.data) {
			//TODO: Currently we never fetch the data again if we already have it.
			// Should use last modified time to verify whether rest resource
			// needs a refresh. And if the data is really new we shouldn't even
			// ask github if it has changed.
			return when.resolve(this);
		}
		//The this.fetching field is used to avoid multiple simultaneuos fetches of
		//the same data. It will be set only while fetching is in progress.
		if (!this.fetching) {
			this.fetching = rest({ path: this.url });
		}
		var self = this;
		var url = this.url;
		return this.fetching.then(function (response) {
			delete self.fetching;
			if (self.destroyed) {
				//Under stress, nodes may already be destroyed before we actually got their data
				console.log('WARNING: using a already destroyed node for '+this.url);
				self = getNode(url);
			}
			self.setData(response, depth);
			return when.resolve(self);
		}, function (err) {
			delete self.fetching;
			if (err && err.status) {
				console.error(err.status.code + ' : ' +  url);
			} else {
				console.error('fetch failed for: '+self.url);
				console.log(err);
			}
			return when.reject(err);
		});
	};
	Node.prototype.getChildren = function () {
		return this.fetch().then(function (self) {
			if (!self.isDirectory()) {
				return when.reject(fsErrors.isNotDirError('getChildren', self.url));
			}
			return when.resolve(self.data);
		});
	};
	Node.prototype.getChild = function (name) {
		return this.getChildren().then(function (children) {
			var childUrl = children[name];
			var child = childUrl && getNode(childUrl);
//			if (child.destroyed) {
//				var oldType = child.type;
//				//Destroyed nodes should retain at least their url and
//				//type so we can create a suitable replacement for them.
//				child = getNode(child.url);
//				children[name] = child;
//				child.type = child.type || oldType;
//			}
			return child || when.reject(
				fsErrors.noExistError('getChild', pathJoin(this.url, name))
			);
		}.bind(this));
	};
	Node.prototype.navigate = function (segments) {
		if (typeof(segments)==='string') {
			segments = segments.split('/');
		}
		if (segments.length===0) {
			return this;
		} else {
			var segment = segments.shift();
			if (!segment) {
				return this.navigate(segments);
			} else {
				return this.getChild(segment).then(function (child) {
//					console.log('Got child: ');
//					console.dir(child);
					return child.navigate(segments);
				});
			}
		}
	};
	Node.prototype.isDirectory = function () {
		return this.type === 'dir';
	};
	Node.prototype.isFile = function () {
		return this.type === 'file';
	};
	Node.prototype.toString = function () {
		return this.url + ' type: '+ (this.type);
	};
	Node.prototype.readdir = function () {
		//First set in motion the work we *really* need to do
		var result = this.getChildren().then(function (children) {
			return Object.keys(children);
		});
		var prefetch = cache.isStressed() ? 1 : 5;
		//TODO: Also make prefetch dependent on remaining github api rate limit.
		// back off from prefetching if are in danger of exceeding our hourly rate.
		this.fetch(prefetch);
		return result;
	};
	Node.prototype.stat = function () {
		return this;
	};
	Node.prototype.readFile = function (encoding) {
		return this.fetch().then(function (self) {
			if (!self.isFile()) {
				return when.reject(fsErrors.isDirError('readFile', self.url));
			}
			var apiData = self.data;
			var contents = apiData.content;
			if (encoding===apiData.encoding) {
				return contents;
			}
			//Encodings mismatch... must convert
			//console.log('transcode: '+this.url+' to '+encoding);

			contents = new Buffer(contents, apiData.encoding);
			if (encoding) {
				contents = contents.toString(encoding);
			}
			//There's a good chance we will need this data again in the
			// same encoding. So store it in that encoding!
			apiData.encoding = encoding;
			apiData.content = contents;
			return contents;
		});
	};

	var rootNode = new Node(API_ROOT);
	rootNode.type = 'dir'; //Rootnode always assumed to be a directory.

	function readdir(path, callback) {
		nodeCallback(
			when(rootNode.navigate(path), function (node) {
//				console.log('node :');
//				console.dir(rootNode);
				return node.readdir();
			}),
			callback
		);
	}

	function stat(path, callback) {
		nodeCallback(
			when(rootNode.navigate(path), function (node) {
				return node.stat();
			}),
			callback
		);
	}

	function notImplemented(name) {
		function fun() {
			var callback = arguments[arguments.length-1];
			if (typeof(callback)==='function') {
				callback(new Error('Not implemented yet: github-fs function '+name));
			}
		}
		fun.name = name;
		return fun;
	}

	function logged(f) {
		if (!LOGGING) {
			return f;
		}
		var loggedF = function (handle, callback) {
			console.log('>>> '+f.name + ' ' + handle);
			return f(handle, function (err, result) {
				if (err) {
					console.log('<<< '+f.name + ' ' + handle + ' => ERROR');
					console.log(err);
				} else {
					console.log('<<< '+f.name + ' ' + handle + ' => ' +result.toString());
				}
				return callback(err, result);
			});
		};
		loggedF.name = f.name;
		return loggedF;
	}

	function readFile(path, encoding, callback) {
		//encoding is optional!
		if (!callback) {
			callback = encoding;
			encoding = null;
		}
		nodeCallback(
			when(rootNode.navigate(path), function (node) {
				return node.readFile(encoding);
			}),
			callback
		);
	}

	function fetch(path) {
		return rest({
			path: pathJoin(API_ROOT, path)
		});
	}

	return readonlyFs({
		forTesting: {
			rootNode: rootNode,
			fetch: fetch,
			rest: rest
		},
		stat: logged(stat),
		readFile: readFile,
		readdir: logged(readdir)
	});

}

exports.configure = configure;
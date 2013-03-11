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
var utils = require('../../jsdepend/utils');
var when = require('when');

var pathJoin = utils.pathJoin;
var deref = utils.deref;

var LOGGING = false;
var CACHE_EXPIRE_TIME = 1000 * 60 * 60; //An hour, if older then we will try
										// to refresh them conditionally if they get hit again.

/**
 * Create an error logging function suitable to pass as a callback to 'otherwise'.
 * @param {String} a message that is printed along with the error.
 * @param {Object?} An optional value to resolve in place of the error
 *                  If not provided, the callback will reject with the
 *                  original error value.
 */
function logError(msg, value) {
	return function (err) {
		//bug protection: these errors may get lost if we don't log them here.
		console.log(msg);
		console.log(err);
		if (err.stack) {
			console.log(err.stack);
		}
		if (value===undefined) {
			return when.reject(err);
		} else {
			return when.resolve(value);
		}
	};
}

//
// Quick implementation of a 'github readonly fs'.
//
// Issues:
//   - rest client doesn't follow 'redirects' according to github api docs, it should.
//     so far it doesn't appear to be an issue.
//   - doesn't handle paginated results. So for dirs with many subdirs
//     results may be incomplete.
//   - builds in-memory tree but doesn't update when tree structure changes
//     in the repo.

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
	 * We remove most of the data... except for fields like 'type' and 'url'.
	 * This is so we don't need to go hunt down references in other nodes.
	 * Before using stored nodes referring nodes should take responsibility
	 * to recognize destroyed nodes and get rid of them.
	 */
	Node.prototype.destroy = function() {
		this.destroyed = true;
		delete this.data;
	};

	function prefetchLog(url) {
		console.log('preFRESHed '+url);
	}

	/**
	 * This function is called when the response has been received from
	 * the rest client.
	 */
	Node.prototype.setData = function (response) {
		var code = deref(response, ['status', 'code']);
		this.lastFetched = Date.now();
		if (code===304) { //Not modified
			console.log('304 code: '+ this.url);
			if (this.destroyed || !this.data) {
				//TODO: deal with this case somehow!!
				console.log('WARNING: got 304 not modified but we no longer have the data now!');
			}
			return;
		}
		var data = response.entity || {};
		//console.log(deref(response, ['headers']));
		this.lastModified = deref(response, ['headers', 'Last-Modified']);
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
	 * Don't fetch data if it already exists and is not very old. This will
	 * avoid a lot of requests with '304 not modified' responses.
	 * Those requests don't cost api quota, but they do cost some time.
	 */
	 Node.prototype.canSkipFetch = function () {
		if (this.data) {
			var age = Date.now() - (this.lastFetched || 0);
			//TODO: allow injecting the delay value.
			if (age < CACHE_EXPIRE_TIME) {
				//console.log('Age = '+age/1000/60+' minutes '+this.url);
				//Avoid hitting newtork if data is relatively fresh.
				//Even getting making a request to get a '304' takes time.
				return true;
			}
		}
		//return false;
	};

	/**
	 * Like fetch, but additionaly ahs a 'levels' parameter to prefetch
	 * descendents. The prefetch returns a promise that resolves after
	 * the root of the tree is fetched while it continues to prefetch
	 * the descendents.
	 */
	Node.prototype.prefetch = function (depth) {
		if (!depth) {
			return when.resolve(this);
		}
		//console.log('prefetch ['+depth+'] '+this.url);
		var result = this.fetch();
		if (depth>1) { //Optimization: don't bother calling all the children if they will
		               // just end up doing nothing.
			result.then(function (self) {
				if (self.type==='dir') {
					var children = self.data;
					for (var name in children) {
						if (children.hasOwnProperty(name)) {
							getNode(children[name]).prefetch(depth-1);
						}
					}
				}
			}).otherwise(logError('Error in prefetch ['+depth+'] '+this.url));
		}
		return result;
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
	Node.prototype.fetch = function () {
		if (this.canSkipFetch()) {
			return when.resolve(this);
		}
		//The this.fetching field is used to avoid multiple simultaneuos fetches of
		//the same data. It will be set only while fetching is in progress.
		if (!this.fetching) {
			var req = {
				path: this.url
			};
			if (this.lastModified) {
				req.headers = {
					'If-Modified-Since': this.lastModified
				};
			}
			this.fetching = rest(req);
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
			self.setData(response);
			return when.resolve(self);
		}, function (err) {
			delete self.fetching;
			if (err && err.status) {
				console.error(err.status.code + ' : ' +  url);
			} else {
				console.error('fetch failed for: '+self.url);
				console.log(err);
			}
			if (!self.destroyed) {
				self.setData(err);
			}
			return when.reject(err);
		});
	};
	Node.prototype.getChildren = function (depth) {
		if (depth===undefined) {
			//Not all callers provide a 'depth' argument. Only callers that
			// want prefetching do so. So ensure non-prefetching behavior:
			depth = 1;
		} else {
			if (depth<1) {
				throw new Error('getChildren depth must be at least 1');
			}
		}
		var fetchFun = depth>1 ? 'prefetch' : 'fetch';
		return this[fetchFun](depth).then(function (self) {
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
		var prefetch = cache.isStressed() ? 1 : 5;
		//First set in motion the work we *really* need to do
		var result = this.getChildren(prefetch).then(function (children) {
			return Object.keys(children);
		});
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
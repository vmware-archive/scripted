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

	var store = {};
	var cache = {
		get: function (url) {
			var entry = store[url];
			if (entry) {
				return entry;
			}
		},
		put: function (url, entry) {
//			console.log('put '+url + " : "+entry);
			store[url] = entry;
		}
	};

	function getNode(url) {
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
	function copyInterestingData(source, dest) {
		INTERESTING.forEach(function (name) {
			if (source.hasOwnProperty(name)) {
				dest[name] = source[name];
			} else {
				delete dest[name];
			}
		});
	}

	function Node(url) {
		this.url = url;
	}
	/**
	 * Inserts data just fetched from rest api into a node
	 */
	Node.prototype.setData = function (data) {
		if (Array.isArray(data)) { //Directory node
			//Directories are kind-a funny. When we fetch their contents we
			//actually get summary info about their children as an array.
			//So this is the time to create the child nodes with that data
			//already in it.
			var children = this.children = {}; //Will point to the urls of our children.
			data.forEach(function (childData) {
				if (childData.name && childData.url) {
					var url = childData.url;
					children[childData.name] = childData.url;
					var child = getNode(url);
					child.setData(childData);
				} else {
					console.log('Ignoring unexpected child data:'+JSON.stringify(childData, null, '  '));
				}
			});
			if (!this.isDirectory()) {
				//Provide minimal 'dirEntry' data that makes us look like a dir
				// because it seems we are a dir now, regardless of what we were before.
				this.dirEntry = {
					type: 'dir'
				};
			}
		} else {
			this.dirEntry = {};
			copyInterestingData(data, this.dirEntry);
			if (!this.isDirectory()) {
				//In that case shouldn't have any children!
				delete this.children;
			}
		}
	};
	/**
	 * Fetch this node's contents from its url and store it in the node
	 */
	Node.prototype.fetch = function () {
		if (!this.fetched) {
			return rest({ path: this.url }).then(function (data) {
//				console.log('data received for '+this.url);
//				console.dir(data);
				this.setData(data);
				this.fetched = true;
			}.bind(this));
		}
		return when.resolve();
	};
	Node.prototype.getChildren = function () {
		return this.fetch().then(function () {
			if (!this.isDirectory()) {
				return when.reject(fsErrors.isNotDirError('getChildren', this.url));
			}
			if (!this.children) {
				return when.reject('Internal Error: type is dir but no children');
			}
			return when.resolve(this.children);
		}.bind(this));
	};
	Node.prototype.getChild = function (name) {
		var that = this;
		return this.getChildren().then(function (children) {
			var child = children[name];
			if (typeof(child)==='string') {
				child = getNode(child);
				children[name] = child; //faster next time?
			}
			return child || when.reject(
				fsErrors.noExistError('getChild', pathJoin(that.url, name))
			);
		});
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
		//Only the root node is created without a dirEntry read from the parent node.
		//The root node is assumed to always be a directory.
		return !this.dirEntry || this.dirEntry.type === 'dir';
	};
	Node.prototype.isFile = function () {
		return this.dirEntry && this.dirEntry.type === 'file';
	};
	Node.prototype.stat = function () {
		return this;
	};
	Node.prototype.toString = function () {
		return this.url + ' type: '+ (this.dirEntry && this.dirEntry.type);
	};
	Node.prototype.readdir = function () {
		return this.getChildren().then(function (children) {
			return Object.keys(children);
		});
	};
	Node.prototype.readFile = function (encoding) {
		if (!this.isFile()) {
			//Avoid expensive fetch if this looks like its not even a file
			return when.reject(fsErrors.isDirError('readFile', this.url));
		}
		return this.fetch().then(function () {
			if (!this.isFile()) {
				return when.reject(fsErrors.isDirError('readFile', this.url));
			}
			var apiData = this.dirEntry;
			var contents = apiData.content;
			if (encoding===apiData.encoding) {
				return contents;
			}
			//Encodings mismatch... must convert
			console.log('transcode: '+this.url+' to '+encoding);

			contents = new Buffer(contents, apiData.encoding);
			if (encoding) {
				contents = contents.toString(encoding);
			}
			//There's a good chance we will need this data again in the
			// same encoding. So store it in that encoding!
			apiData.encoding = encoding;
			apiData.content = contents;
			return contents;
		}.bind(this));
	};

	var rootNode = new Node(API_ROOT);

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
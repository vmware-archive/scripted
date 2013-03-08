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

var nodeCallback = require('../utils/promises').nodeCallback;
var fsErrors = require('./fs-errors');
var readonlyFs = require('./read-only-fs');

var pathJoin = require('../jsdepend/utils').pathJoin;
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

	//var cache = {}; //Map from paths to Promised github API call results.

	/**
	 * Fetch the contents of a path via github rest api. This can fetch both directory and
	 * file contents.
	 */
	function fetch(path) {
		return rest({
			path: pathJoin(API_ROOT, path)
		});
	}

//	function fetch(path) {
//		console.log('Fetching '+path);
//		//TODO: how to limit the size of the cache.
//		//TODO: use lastmodified stamp returned by github API to detect/refresh
//		//   changed data.
//		var cached = cache[path];
//		if (!cached) {
//			cached = cache[path] = rest({
//				path: pathJoin(API_ROOT, path)
//			});
//		}
//		cached.then(function (got) {
//			console.log('Fetched '+path);
//			console.dir(got);
//		}, function (err) {
//			console.log('Fetch '+path+' FAILED');
//			console.log(err);
//		});
//		return cached;
//	}

	var rest = require('./github-rest-client').configure({
		token: options.token
	});

	function Node(parent, name, dirEntry) {
		this.parent = parent;
		this.name = name;
		this.dirEntry = dirEntry;
	}
	Node.prototype.getContents = function () {
		return fetch(this.getPath());
	};
	Node.prototype.getPath = function () {
		if (!this.parent) {
			return '/';
		} else {
			return pathJoin(this.parent.getPath(), this.name);
		}
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
					return child.navigate(segments);
				});
			}
		}
	};
	Node.prototype.getChildren = function () {
		if (!this.isDirectory()) {
			return when.reject(fsErrors.isNotDirError('readdir', this.getPath()));
		}
		if (this.children) {
			return when.resolve(this.children);
		} else {
			var parent = this;
			return fetch(this.getPath()).then(function (apiData) {
				parent.children = {};
				apiData.forEach(function (childData) {
					if (childData.name) {
						//TODO: save lots of memory by only keeping interesting fields of childData
						var child = new Node(parent, childData.name, childData);
						parent.children[childData.name] = child;
					} else {
						console.log('Ignoring unexpected child data: ');
						console.dir(childData);
					}
				});
				return parent.children;
			});
		}
	};
	Node.prototype.getChild = function (name) {
		var that = this;
		return this.getChildren().then(function (children) {
			return children[name] || when.reject(
				fsErrors.noExistError('getChild', pathJoin(that.getPath(), name))
			);
		});
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
		return this.getPath() + ' type: '+ (this.dirEntry && this.dirEntry.type);
	};
	Node.prototype.readdir = function () {
		return this.getChildren().then(function (children) {
			return Object.keys(children);
		});
	};
	Node.prototype.readFile = function (encoding) {
		if (this.isFile()) {
			return fetch(this.getPath()).then(function (apiData) {
				//console.dir(apiData);
				var contents = apiData.content;
				if (encoding===apiData.encoding) {
					return contents;
				}
				//Encodings mismatch... must convert

				var buf = new Buffer(contents, apiData.encoding);
				if (!encoding) {
					return buf; // return the data in raw form if no encoding is specified
				} else {
					return buf.toString(encoding);
				}
			});
		} else {
			return when.reject(fsErrors.isDirError('readFile', this.getPath()));
		}
	};

	var rootNode = new Node();

	function readdir(path, callback) {
		nodeCallback(
			when(rootNode.navigate(path), function (node) {
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

	return readonlyFs({
		stat: logged(stat),
		readFile: readFile,
		readdir: logged(readdir)
	});

}

exports.configure = configure;
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

/*global exports require console watchDirectory setTimeout */
var fs = require('fs');
var utils = require('../../jsdepend/utils.js');
var mapk = utils.mapk;
var filter = utils.filter;
var os = require('os');
var ignore = require('../configuration').ignore;

//TODO: optimize tree for better memory usage:
//   - don't store full path in every tree node
//   - other optimzations?

//TODO: allow setting configuration options via .scripted file.

function makeWatcher(path, listener) {

	//BEGIN Configuration options

	var POLL_INTERVAL = 5000; //  if using polling, try to refresh directory data every X milliseconds
	var MAX_INIT_TIME = 4000; //  The maximum amount of time allowed for initially populating the tree. If this time
							  //  is exceeded we just keep whatever we got at the time.

	var MAX_WATCHERS = 2000;   //  MAX number of directory watchers to create per-tree.
						       //  If this number is exceeded remaining dirs will be read in, but not watched for changes.
	var MAX_READY_TIME = 2000; //  If initialization takes longer than this tree is returned while still continuing initialization
							   //  asynchronously.
						       
	//var POLL_INTERVAL = 10; //  try to refresh really often (stress test).
	
	//END Configuration options

	//BEGIN makeWatcher nested declarations
	
	function Node(path) {
		this.path = path;
		this.children = {};
	}

	//When this functions returns true for a given path then we won't watch if for changes.
	//This to cut down on the number of watchers that we create, which seems to hit a hard
	//limit pretty quikcly on OS X (e.g. limit is 248 on Andrew's machine and scripted code has 430+ dirs).
	function noWatch(path) {
	//	return path.indexOf('node_modules')>=0 ||
	//	       path.indexOf('/dijit/')>=0 ||
	//	       path.indexOf('/dojo/')>=0 ||
	//	       path.indexOf('/nls/')>=0; 
		return false; // Watch everything :-)
	}

	var watchers = 0; //Counts the number of fs.watch instances that are active at the moment (mostly
					  //for debugging purposes. 
				
	//A health check for the polling mechanism.
	//It estimates a load factor by verifying how much 'behind' schedule
	//this healthCheck function is executed. With high loads the delay is
	//expected to be severe. 
	var lastLogtime = Date.now();
	function healthCheck(thingy) {
		var lastRuntime = thingy.lastRuntime;
		var now = Date.now();
		if (lastRuntime) {
			var elapsed = now - lastRuntime;
			var loadEstimate = elapsed / POLL_INTERVAL;
			if (now - lastLogtime > 5000) {
				//console.log("LOAD = "+loadEstimate);
				lastLogtime = now;
			}
			if (loadEstimate>2) {
				POLL_INTERVAL = POLL_INTERVAL*2;
				console.log("OVERLOAD detected adjusting POLL_INTERVAL = "+POLL_INTERVAL);
			}
		}
		thingy.lastRuntime = now;
	}
					  
	//This is a 'poor man's' emulation of fs.watch. Instead of actually watching for changes
	//it periodically fires generic 'poll' events. Clients should respond to 'poll' events by
	//re-evaluating whether their cached data is still to be considered valid. 
	function genericFsWatch(path, listener) {
		//TODO: Rather than fire poll events indiscriminately every X milliseconds we should
		//use fstat to check for changes and not fire unless there's an actual change.
		
		//TODO: It seems that the use of this simple polling mechanim seriously increases the memory footprint.
		// => for scripted tree the process size goes from 15Mb to 30Mb.
		//perhaps we should only have a single 'pollster' that keeps track of all the directories to poll.
		
		var alive = true;
		function firePollEvent() {
			if (alive) {
				listener('poll', path);
				healthCheck(firePollEvent);
				setTimeout(firePollEvent, POLL_INTERVAL);
			}
		}
		setTimeout(firePollEvent, POLL_INTERVAL);
		//We should emulate any API of fsWatch objects that our code depends on. 
		//Currently all it cares about is 'close' to dispose/disable a watcher.
		return {
			close: function () {
				alive = false;
			}
		};
	}

	function fsWatch(path, listener) {
		try {
			var watcher = fs.watch(path, listener);
			watcher.on('error', function (e) {
				// an EPERM error happens on Windows when dir is deleted from commandline.
				// See https://github.com/joyent/node/issues/3250
				watcher.close();
			});
			return watcher;
		} catch (err) {
			//Extra safeguard... if the good version of fsWatch fails for any reason recuperate by ...
			console.log(err);
			return genericFsWatch(path, listener);
		}
	}

	function canUseFsWatch() {
//		return false;
		var platform = os.platform();
		return platform !== 'darwin'; //We can't use fs.watch on Mac OS because of silly limits.
	}

	if (!canUseFsWatch()) {
		console.log('Using polling instead of fs.watch');
		fsWatch = genericFsWatch;
	}
	/** Creates a node and ensures that the node is initialized with a 'stat' data.
	    Note that this doesn't yet start any kind of watchers yet. The decision on this
	    is deferred because if the node is not new, compared to an existing node, then
	    we will discard it and keep using the old node. */
	function makeStatNode(path, k) {
		var node = new Node(path);
		fs.stat(path, function (err, stat) {
			if (err) {
				console.log(err);
				node.err = err;
			} else {
				node.stat = stat;
			}
			k(node);
		});
		return node;
	}

	// Dispose the current node and all its children, releasing any resources (e.g. fsWatch instances 
	// that are attached to them. 
	// Optionally pass in a onDispose function. This function will be called on each disposed node just
	// prior to its disposal.
	Node.prototype.dispose = function (onDispose) {
		if (!this.disposed) { 
			if (onDispose) { 
				onDispose(this); 
			}
			this.disposed = true;
			if (this.fsWatcher) {
				//console.log('closing dir watcher for: '+this.path);
				this.fsWatcher.close();
				watchers--;
				//console.log('Number of watchers: '+watchers);
				delete this.fsWatcher;
			}
			if (this.children) {
				for (var i in this.children) {
					if (this.children.hasOwnProperty(i)) {
						this.children[i].dispose(onDispose);
					}
				}
				delete this.children;
			}
		}
	};

	Node.prototype.whenReady = function (onReady) {
		if (this.isReady) {
			onReady();
		} else {
			var existing = this.onReady;
			if (existing) {
				this.onReady = function () {
					existing();
					onReady();
				};
			} else {
				this.onReady = onReady;
			}
		}
	};

	Node.prototype.isDirectory = function () {
		return this.stat && this.stat.isDirectory();
	};

	Node.prototype.isFile = function () {
		return this.stat && this.stat.isFile();
	};

	Node.prototype.walk = function (onFile) {
		var abort = false;
	//	console.log('Node.walk: '+this.path);
	//	console.log('isFile = ' + this.isFile());
	//	console.log('isDirectory = ' + this.isDirectory());
		if (this.isFile()) {
			return onFile(this);
		} else if (this.isDirectory()) {
			var children = this.children;
			//console.log("children = " + children);
			for (var i in this.children) {
				if (children.hasOwnProperty(i)) {
					abort = children[i].walk(onFile);
					if (abort) {
						return abort;
					}
				}
			}
			return abort;
		}
	};

	function isChanged(oldNode, newNode) {
		//It is already assumed that oldNode and newNode have identical paths
		//And for now we don't care about file contents so the only thing that's
		//interesting is whether the node is a directory or a file.
		return oldNode.isDirectory() !== newNode.isDirectory();
	}

	function handleCreation(newChild, timeLimit, k) {
		if (newChild.isDirectory()) {
			newChild.listener('dir-created', newChild.path);
			watchDirectory(newChild, timeLimit, k);
		} else {
			newChild.listener('created', newChild.path);
			k();
		}
	}

	function handleDeletion(oldChild) {
		oldChild.dispose(function (oldChild) {
			if (oldChild.isDirectory()) {
				oldChild.listener('dir-deleted', oldChild.path);
			} else {
				oldChild.listener('deleted', oldChild.path);
			}
		});
	}

	//each :: ([a], (a, Continuation<Void>) -> Void, Coninuation<Void>) -> Void
	// This is a 'foreach' on an array, where the function that needs to be called on the
	// elements of the array is callback style. I.e. the function calls some other function when its
	// work is done. Since this is a 'each' rather than a 'map', we don't care about the 'return values'
	// of the functions (and in callback style, this means, the parameters of the callbacks).
	function each(array, f, callback) {
		//TODO: this function also exists in file-indexer.js. Put into utils.js and remove from both.
		function loop(i) {
			if (i<array.length) {
				f(array[i], function () {
					loop(i+1);
				});
			} else {
				callback();
			}
		}
		loop(0);
	}


	//Fetch the new children of a given node, compare with oldChildren and send events to 
	//listener about differences.
	function refreshChildren(node, timeLimit, k) {
		k = k || function () {};
		var listener = node.listener;
		if (!node.disposed) {
			var parentPath = node.path;
			fs.readdir(node.path, function (err, files) {
				if (err) {
					files = [];
				} else {
					files = filter(files, function (name) { return !ignore(name); });
				}
				mapk(files, 
					function (fileName, k) {
						var childPath = parentPath+"/"+fileName;
						makeStatNode(childPath, function (childNode) {
							childNode.name = fileName;
							childNode.listener = listener;
							k(childNode);
						});
					},
					function (newChildren) {
						if (!node.disposed) {
							//It is possible for the node to have gotten disposed while we were statting children
							//Why? stating is done in asynch, and file system changes may have deleted this dir 
							//since the time fetched its children.
							//In that case don't do anything. Since we got disposed something else has already handled
							//the changes associate with the deletion. And any children we may have read don't
							//exist anymore.
							
							var oldChildren = node.children;
							var name, oldChild;
							//proceed in two stages. 
							//The first stage will compute the difference between old and new children.
							//It produces
							//  - a list of deleted
							//  - a list of added children
							//  - updated list of newChildren into node.children					
							
							var added = [];
							node.children = {}; 
							//We'll re-add all the children using old or new depending on whether it changed
							for (var i=0; i<newChildren.length; i++) {
								var newChild = newChildren[i];
								if (!newChild.error) { //If it couldn't be stat'd then treat as non-existent.
									name = newChild.name;
									oldChild = oldChildren[name];
									if (oldChild) {
										//maybe replacing old child
										delete oldChildren[name];
										if (isChanged(oldChild, newChild)) {
											handleDeletion(oldChild);
											node.children[name] = newChild;
											added.push(newChild); //Handling of creation is deferred because it requires asynch. And we
											                      // need the update of the current node's state to be 'atomic' to avoid
											                      // problems where some changes are picked up more than once by 'concurrent' firing of events.
										} else {
											node.children[name] = oldChild; // no change => re-use the oldChild and all its contents. (new node has no children!)
										}
									} else {
										//We got a new child
										node.children[name] = newChild;
										added.push(newChild);
									}
								}
							}
							//Any remaining node in oldChildren where not in newChildren so they were deleted.
							for (name in oldChildren) {
								if (oldChildren.hasOwnProperty(name)) {
									oldChild = oldChildren[name];
									handleDeletion(oldChild);
								}
							}
							
							each(added, function (newChild, k) {
								handleCreation(newChild, timeLimit, k);
							}, k);
						} //end if (!disposed)
					}
				);
			});
		} else {
			k();
		}
	}

	// Create a watcher on a given node which is expected to be a directory.
	// the watcher is stored as a field in the node.
	function watchDirectory(node, timeLimit, k) {
		k = k || function() {};
		if (timeLimit && Date.now()>timeLimit) {
			console.log("WARNING: time limit exceeded: not read: "+node.path);
			k();
		} else {
			//console.log("READING: "+node.path);
			refreshChildren(node, timeLimit, function () {
				if (watchers < MAX_WATCHERS && !noWatch(node.path)) {
					node.fsWatcher = fsWatch(node.path, function (eventType, filename) {
						//We won't rely on the 'filename' argument as it isn't guaranteed to exist / work 
						refreshChildren(node);
					});
					watchers++;
					//console.log('Watching: '+node.path);
					//console.log('Number of watchers: '+watchers);
				}
		        k();
			});
		}
	}

	//Helper function to create a callback that fires a 'ready' event on a given node at most once.
	function fireReadyEvent(node) {
		return function () {
			if (!node.isReady) {
				node.isReady = true;
				var onReady = node.onReady;
				if (onReady) {
					delete node.onReady;
					onReady();
				}
			}
		};
	}

	function logWrap(listener) {
		function loggedListener(type, info) {
			console.log(type + " : " + info);
			listener.apply(this, arguments);
		}
		return loggedListener;
	}
	
	//END makeWatcher nested declarations
	
	

	//BEGIN makeWatcher function body
	var timeLimit = Date.now() + MAX_INIT_TIME;
	listener = listener || function () {}; //provide dummy listener if client didn't provide one.
//	listener = logWrap(listener);
	var node = makeStatNode(path, function (node) {
		node.listener = listener;
		var fireReady = fireReadyEvent(node);
		watchDirectory(node, timeLimit, fireReady);
		setTimeout(fireReady, MAX_READY_TIME);
	});
	return node;
}	//END makeWatcher function body

exports.makeWatcher = makeWatcher;


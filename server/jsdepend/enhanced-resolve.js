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
// Wrapper around enhanced-resolve library to configure it with
// an implementation of our plugable filesystem instead of
// letting it use node fs directly


function configure(filesystem) {

	var resolveFactory = require("enhanced-resolve/lib/resolve");

	// caching factory for enhanced-resolve library
	var createThrottledFunction = require("enhanced-resolve/lib/createThrottledFunction");

	var stat = filesystem.stat;
	var fs = require('fs'); // TODO: make use of plugable fs instead.

	//var fsStat = fs.stat; // TODO: make use of plugable fs instead.

	function Stat(stats) {
		this._stats = stats;
	}
	Stat.prototype.isDirectory = function () {
		return this._stats.isDirectory;
	};
	Stat.prototype.isFile = function () {
		return this._stats.isFile;
	};


	////// Emulate some simple nodefs-like functions.... sufficient to
	////// satisfy enhanced-resolve library

	/**
	 * Emulate something akin to node fs.stat but on top of our plugable fs
	 */
	function fsStat(handle, callback) {
		return stat(handle).then(function (stats) {
			return callback(null, new Stat(stats));
		}).otherwise(function (err) {
			return callback(err);
		});
	}

	function fsReadFile(handle, encoding, callback) {
		if (encoding!=='utf8' && encoding!=='utf-8') {
			console.trace("Only utf8 encoding is supported");
		}
		if (typeof(encoding)==='function') {
			callback = encoding;
		}
		filesystem.getContents(handle).then(function (contents) {
			callback(null, contents);
		}).otherwise(function (err) {
			callback(err);
		});
	}
	function fsReaddir(handle, callback) {
		//TODO: from logging it appears this function isn't getting called. So
		// it is untested!
		filesystem.listFiles(handle).then(function (names) {
			callback(null, names);
		}).otherwise(function(err) {
			//Actually can't really get here because our listFiles function
			// swallows errors and returns [] instead.
			callback(err);
		});
		fs.readdir(filesystem.handle2file(handle), callback);
	}

//	function logit(nodefsfun) {
//		return function () {
//			var args = Array.prototype.slice.call(arguments);
//			args = args.map(function (a) {
//				return typeof(a) === 'function' ? '<callback>' : a;
//			});
//			console.log(nodefsfun.name + ' ' +JSON.stringify(args));
//			return nodefsfun.apply(null, arguments);
//		};
//	}

//	fsStat = logit(fsStat);
//	fsReadFile = logit(fsReadFile);
//	fsReaddir = logit(fsReaddir);

	//////////////////////////////////////////////////////////////////////
	// Code below copied and modified from enhanced-resolve library.
	// Changes: remove all 'sync' versions of functions. Shouldn't be
	// using them anyway.

	// the cache objects
	var statCache = {}, readFileCache = {}, readdirCache = {};

	// create the functions with the factory
	// the sync version have higher priority as it finishes earlier
	// caching time is 4 seconds
	var statAsync = createThrottledFunction(fsStat, 4000, Object.create(statCache));
	//var statSync = createThrottledFunction.sync(fs.statSync, 4000, statCache);
	var readFileAsync = createThrottledFunction(fsReadFile, 4000, Object.create(readFileCache));
	//var readFileSync = createThrottledFunction.sync(fs.readFileSync, 4000, readFileCache);
	var readdirAsync = createThrottledFunction(fsReaddir, 4000, Object.create(readdirCache));
	//var readdirSync = createThrottledFunction.sync(fs.readdirSync, 4000, readdirCache);

	// create the resolve function
	return resolveFactory({
		// use the created functions
		stat:			statAsync,
		//statSync:		statSync,
		readFile:		readFileAsync,
		//readFileSync:	readFileSync,
		readdir:		readdirAsync,
		//readdirSync:	readdirSync,

		// use standard JSON parser
		parsePackage:	JSON.parse
	});

} // end function configure

exports.configure = configure;
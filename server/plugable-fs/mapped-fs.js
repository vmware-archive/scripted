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

var utils = require('../jsdepend/utils');

var pathNormalize = utils.pathNormalize;
var pathResolve = utils.pathResolve;
var pathIsPrefixOf = utils.pathIsPrefixOf;
var startsWith = utils.startsWith;
var pathJoin = utils.pathJoin;

var nodefs = require('fs');
var noExistError = require('./fs-errors').noExistError;

var bindProperties = require('../utils/bind').bindProperties;

/**
 * Create a filesystem mapped to a subdirectory of another filesystem.
 */
function withBaseDir(baseDir, fs) {

	if (baseDir) {
		baseDir = pathNormalize(baseDir); // Avoid trouble with bad code that creates double slashes.
		if (baseDir[baseDir.length-1]!=='/') {
			baseDir += '/';
		}
	}

	function file2handle(file) {
		var h;
		if (baseDir) {
			h = '/'+file.substring(baseDir.length);
		} else {
			h = file;
		}
		return h.replace(/\\/g, '/'); //Always use slashes even on Windows.
	}

	function handle2file(handle) {
		//TODO: Don't allow path navigation '..' to escape out of a 'subdirectory' filesystem.
		if (baseDir) {
			while (handle[0] === '/') {
				handle = handle.substring(1);
			}
			if (handle==='.') {
				return baseDir;
			} else {
				return baseDir + handle;
			}
		} else {
			return handle;
		}
	}

	return configure({
		fs: fs,
		file2handle: file2handle,
		handle2file: handle2file
	});
}

/**
 * Create a file system that adds a path prefix to all paths
 * in a given file system.
 *
 * For example, if the pathPrefix is '/a/b' then the path '/a/b/foo/bar.js' on
 * the resulting file system will refer/redirect to the file '/foo/bar.js'
 * on the target file system.
 *
 * Trying to access any path that doesn't actually begin with the pathPrefix
 * will result in a 'ENOEXIST' error.
 *
 * Note that a file system create by this operation is a bit 'strange' as it has subdirectories
 * but doesn't have a 'root'. More precisely, accessing '/'  will give a ENOENT error. In order
 * to make this filesystem 'complete' it will need to be composed with another fs that provides
 * a 'mount point'.
 */
function withPrefix(pathPrefix, fs) {

	// protection against bad code that creates double slashes:
	pathPrefix = pathNormalize(pathPrefix);

	// Make sure we always have a trailing slash:
	if (pathPrefix[pathPrefix.length-1]!=='/') {
		pathPrefix = pathPrefix + '/';
	}

	/**
	 * Convert an 'external' path to a path on the target filesystem.
	 */
	function handle2file(handle) {
//		console.log('withPrefix '+pathPrefix+' handle2file '+JSON.stringify(handle));
		if (pathIsPrefixOf(pathPrefix, handle)) {
			//Note: we already made sure that pathPrefix always ends with a '/'
			//So the 'substring' operation removes the slash and we have to put it back.
			//This is more elegant than having to special case for the root path '/'.
//			console.log('withPrefix added ==> '+ '/' + handle.substring(pathPrefix.length));
			return '/' + handle.substring(pathPrefix.length);
//		} else {
//			console.log(JSON.stringify(pathPrefix)+' is not a prefix of '+JSON.stringify(handle));
		}
		//return undefined;
	}

	/**
	 * Convert a path on the target fs into an external path.
	 */
	function file2handle(file) {
		return pathJoin(pathPrefix, file);
	}

	return configure({
		fs: fs,
		handle2file: handle2file,
		file2handle: file2handle
	});

}

function configure(options) {

	var fs = options.fs || require('fs');
	var handle2file = options.handle2file;
	var file2handle = options.file2handle;

//	function logit(f) {
//		return function () {
//			console.log('>>> '+f.name + ' ' + JSON.stringify(arguments));
//			var r = f.apply(this, arguments);
//			console.log('<<< '+f.name + ' ' + JSON.stringify(r));
//			return r;
//		};
//	}
//
//	handle2file = logit(handle2file);
//	file2handle = logit(file2handle);


	function idFun(x) { return x; }

	var fs_handle2file, fs_file2handle;

	if (fs === nodefs) {
		fs_handle2file = idFun;
		fs_file2handle = idFun;
	} else {
		fs_handle2file = fs.handle2file;
		fs_file2handle = fs.file2file;
	}

	function getCallback(args) {
		var callback = args[args.length-1];
		return typeof(callback)==='function' && callback;
	}

	/**
	 * Convert/wrap a node fs function, applying handle2file to a given argument before passing
	 * it to the actual function.
	 */
	function convertArg(f, i) {
		if (!f) {
			return; //Target fs doesn't provide this function so we can't either provide it either.
		}
		var convertedFun = function () {
			var args = Array.prototype.slice.call(arguments);
			//console.log('>> '+f.name+ ' ' +JSON.stringify(args));
			var callback = getCallback(args);
			var arg = args[i];
			var converted = arg && handle2file(arg);
			//console.log('>> '+f.name+ ' arg = ' +JSON.stringify(converted));
			if (!converted) {
				//This handle is not valid on this filesystem
				var err = noExistError(f.name, arg);
				//console.log('>> '+f.name+ ' err = ' +err);
				if (callback) {
					return callback(err);
				} else {
					throw err;
				}
			} else {
				//ok: we mapped the argument
				args[i] = converted;
				return f.apply(this, args);
			}
		};
		convertedFun.name = f.name;
		return convertedFun;
	}

	function undefFun() {}

	function compose(f, g) {
		if (!f || !g) {
			return undefFun;
		}
		return function (x) {
			return f(g(x));
		};
	}

	var prebindExports = {
		stat: convertArg(fs.stat, 0),
		unlink: convertArg(fs.unlink, 0),
		rmdir: convertArg(fs.rmdir, 0),
		readFile: convertArg(fs.readFile, 0),
		readdir: convertArg(fs.readdir, 0),
		writeFile: convertArg(fs.writeFile, 0),
		mkdir: convertArg(fs.mkdir, 0),
		createReadStream: convertArg(fs.createReadStream, 0),
		rename: convertArg(convertArg(fs.rename, 0), 1),
		handle2file: compose(fs_handle2file, handle2file),
		file2handle: compose(file2handle, fs_file2handle)
	};
	return bindProperties(prebindExports, fs);
}

exports.configure = configure;
exports.withBaseDir = withBaseDir;
exports.withPrefix = withPrefix;

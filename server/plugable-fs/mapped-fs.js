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
var startsWith = utils.startsWith;

var nodefs = require('fs');

/**
 * Create a filesystem mapped to a subdirectory of another filesystem.
 */
function withBaseDir(baseDir, fs) {

	function idFun(x) { return x; }

	var fs_handle2file, fs_file2handle;

	if (fs === nodefs) {
		fs_handle2file = idFun;
		fs_file2handle = idFun;
	} else {
		fs_handle2file = fs.handle2file;
		fs_file2handle = fs.file2file;
	}

	if (baseDir) {
		baseDir = pathNormalize(baseDir); // Avoid trouble with bad code that creates double slashes.
		if (baseDir[baseDir.length-1]!=='/') {
			baseDir += '/';
		}
	}

	function noExistError(funName, handle) {
		//Return something similar to what node fs returns when a file does not exist.
		var err = new Error('[Error: ENOENT, '+funName+' '+JSON.stringify(handle)+']');
		err.errno = 34;
		err.code = 'ENOENT';
		err.path = handle;
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

	function file2handle(file) {
		var h;
		if (baseDir) {
			h = '/'+file.substring(baseDir.length);
		} else {
			h = file;
		}
		return h.replace(/\\/g, '/'); //Always use slashes even on Windows.
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
		var convertedFun = function () {
			var args = Array.prototype.slice.call(arguments);
			var callback = getCallback(args);
			var arg = args[i];
			var converted = arg && handle2file(arg);
			if (!converted) {
				//This handle is not valid on this filesystem
				var err = noExistError(f.name, arg);
				if (callback) {
					return callback(noExistError);
				} else {
					throw err;
				}
			} else {
				//ok: we mapped the argument
				args[i] = converted;
				return f.apply(null, args);
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

	return {
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
}

exports.withBaseDir = withBaseDir;

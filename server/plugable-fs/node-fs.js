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

/*global require exports console module process */

var utils = require('../jsdepend/utils');

var pathNormalize = utils.pathNormalize;
var pathResolve = utils.pathResolve;
var startsWith = utils.startsWith;

var fs = require('fs');

function withBaseDir(baseDir) {
	if (baseDir) {
		baseDir = pathNormalize(baseDir); // Avoid trouble with bad code that creates double slashes.
		if (baseDir[baseDir.length-1]!=='/') {
			baseDir += '/';
		}
	}
	var encoding = 'UTF-8';

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
//			if (!h) {
//				h = '.'; //Always use '.' instead of "", it causes trouble because it counts as 'false'.
//			}
		} else {
			h = file;
		}
		return h.replace(/\\/g, '/'); //Always use slashes even on Windows.
	}

	function stat(handle, callback) {
		fs.stat(handle2file(handle), callback);
	}

	function rename(h1, h2, callback) {
		fs.rename(handle2file(h1), handle2file(h2), callback);
	}

	function unlink(handle, callback) {
		fs.unlink(handle2file(handle), callback);
	}

	function rmdir(handle, callback) {
		fs.rmdir(handle2file(handle), callback);
	}

	function readFile(handle, encoding, callback) {
		fs.readFile(handle2file(handle), encoding, callback);
	}

	function readdir(handle, callback) {
		fs.readdir(handle2file(handle), callback);
	}

	function writeFile(handle, contents, callback) {
		fs.writeFile(handle, contents, callback);
	}

	function mkdir(handle, callback) {
		fs.mkdir(handle2file(handle), callback);
	}

	function createReadStream(handle, options) {
		return fs.createReadStream(handle2file(handle), options);
	}

	return {
		stat: stat,
		rename: rename,
		unlink: unlink,
		rmdir: rmdir,
		readFile: readFile,
		readdir: readdir,
		writeFile: writeFile,
		mkdir: mkdir,
		createReadStream: createReadStream,
		handle2file: handle2file,
		file2handle: file2handle
	};
}

exports.withBaseDir = withBaseDir;

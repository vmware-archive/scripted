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

function configure(options) {
	var utils = require('../../jsdepend/utils');
	var extend = utils.extend;
	var pathJoin = utils.pathJoin;

	var mRepoFs = require('./github-repo-fs');
	var readonlyFs = require('../read-only-fs');
	var fsErrors = require('../fs-errors');

	var cache = options.cache; //TODO: try to also use this cache
							   // for repo nodes, not just repo-fs nodes.
	var repoFss = {};

	var DIR_STAT = {
		isDirectory: function () { return true; },
		isFile: function () { return false; }
	};

	function repoDispatcher(funName, errHandler) {
		var dispatch = function (handle /*and more*/) {
			var args = Array.prototype.slice.call(arguments);
			var callback = args[args.length-1];
			//console.log('>>> dispatch.'+funName+ ' ' +JSON.stringify(args));
			var segments = handle.split('/');
			//console.log('segments = ' + JSON.stringify(segments));
			if (segments.length>=3 && !segments[0]) {
				var owner = segments[1];
				var repo = segments[2];
				if (repo[0]!=='.') {
					var path = pathJoin('/', segments.slice(3).join('/'));
					var repoId = owner+'/'+repo;
					//TODO: Avoid creating repo nodes for repos that don't exist.
					var repoFs = repoFss[repoId] || (
						repoFss[repoId] = mRepoFs.configure(extend(options, {
							owner: owner,
							repo: repo,
							cache: cache
						}))
					);
					args[0] = path;
					return repoFs[funName].apply(repoFs, args);
				}
			}
			//Fell out of one of the checks above.
			//console.log('dispatch: Malformed path: '+handle);
			//wrong path format should '/:owner/:repo/...'
			if (typeof(callback)==='function') {
				if (errHandler) {
					errHandler(args, callback);
				} else {
					callback(fsErrors.noExistError(funName, handle));
				}
			}
		};
		dispatch.name = funName;
		return dispatch;
	}

	return readonlyFs({
		stat: repoDispatcher('stat', function (args, callback) {
			callback(null, DIR_STAT); //pretend its a dir.
		}),
		readFile: repoDispatcher('readFile', function (args, callback) {
			callback(fsErrors.isDirError('readFile', args[0]));
		}),
		readdir: repoDispatcher('readdir', function (args, callback) {
			var path = args[0];
			var segments = path.split('/');
			if (segments.length===2 && !segments[0]) {
				//Special case for owner url '/:owner' so we can list the repos we know about.
				//Otherwise scripted gets really confused if you open a repo but
				//is not listed in its parent directory
				var owner = segments[1];
				var names = [];
				Object.keys(repoFss).forEach(function (repoId) {
					var pieces = repoId.split('/');
					if (owner===pieces[0]) {
						names.push(pieces[1]);
					}
				});
				console.log('readdir '+path+ ' => '+JSON.stringify(names));
				callback(null, names);
			} else {
				//Other stuff just pretend they have no visible children.
				callback(null, []);
			}
		})
	});

}

exports.configure = configure;
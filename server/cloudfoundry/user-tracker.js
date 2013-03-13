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
// On cloudfoundry this module
//  1) replaces the handling of the '/' url.
//  2) adds some 'user tracking' middleware
//

var pathJoin = require('../jsdepend/utils').pathJoin;
var when = require('when');
var mongo = require('../mongo'); //TODO: inject rather than import database instance
var glob = require('../utils/path-glob');

var users = mongo.collection('users');

/**
 * Creates an error function in the context of a given http response object.
 * The error fun may attache error info to the response.
 */
function errorFun(res) {
	function error(err) {
		//Always log errors to console.
		console.error(err);
		if (err.stack) {
			console.error(err.stack);
		}

		//If res object is available also show error to the client.
		if (res) {
			res.status(500);
			res.header('Content-Type', 'text/plain');
			res.write(""+err);
			if (err.stack) {
				res.write(""+err.stack);
			}
			res.end();
		}
	}
	return error;
}

//TODO: this cooky stuff should really be done as a connect
// middleware on every access not just on access to the 'root' path
// of the webserver.

exports.install = function (app, filesystem) {

	var getUserHome = filesystem.getUserHome;
	var isDirectory = filesystem.isDirectory;
	var mkdir = filesystem.mkdir;
	var copyDir = filesystem.copyDir;
	var exists = filesystem.exists;

	function getUserPath(userID) {
		return pathJoin(getUserHome(), userID);
	}

// Discontinued for now. We will only show a read-only sample now.
//
//	function createUserArea(userID) {
//		var path = getUserPath(userID);
//		return isDirectory(path).then(function (isDir) {
//			if (isDir) {
//				//already got a user-area
//				return;
//			}
//			//must create user area
//			return copyDir('/sample', path);
//		});
//	}

	function randomString(len) {
		var chars = "abcdefghijklmnopqrstuvwxyz01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		var str = "";
		for (var i = 0; i < len; i++) {
			var code = Math.floor(Math.random()*chars.length);
			str = str + chars[code];
		}
		return str;
	}

	function generateUserID(tries) {
		tries = tries || 0;
		var id = randomString(10);
		return createUser(id).then(function () {
			console.log('User created: '+id);
			return id; //Yeah! Found one that's still available.
		}, function (err) {
			console.log('Faile to create User: '+id);
			console.err(err);
			if (++tries < 10) {
				return generateUserID(tries);
			} else {
				//Can't find a free 'private' user id. Use the 'shared' ID.
				return 'shared';
			}
		});
	}

	function recordVisitor(id) {
		console.log('Recording visit: '+id);
		//Ignoring any errors about creating duplicate ids
		return users.then(function (users) {
			return mongo.findAndModify(users,
				//Criteria:
				{_id: id},
				//Sort:
				[['_id','asc']],
				//Update:
				{
					'$inc' : { visits: 1 },
					'$set' : { lastVisit: new Date()}
				},
				//Options:
				{ upsert: true, 'new': true }
			).then(function (user) {
				console.log('Visit recorded: '+JSON.stringify(user[0]));
				return user;
			});
		});
	}

	function createUser(id) {
		return users.then(function (users) {
			//The insert call below will reject when the user id already exists.
			return mongo.insert(users, {
				_id: id,
				created: new Date()
			}).then(function () {return id;});
		});
	}

	/**
	 * When one of these paths gets hit we create user tracking cookies.
	 */
	var trackedPaths = glob.fromJson([
		'/', '/editor/**'
	]);

	function trackUsers(req, res, next) {
		var shouldTrack = trackedPaths.test(req.path);
//		console.log('trackUsers ['+shouldTrack+'] '+req.path);
		if (!shouldTrack) {
			return next();
		} else {
			var userID = req.cookies.userID;
			console.log('cookie userID = '+userID);
			if (!userID) {
				userID = generateUserID();
			}
			when(userID, recordVisitor).otherwise(errorFun(null));
			when(userID, function (userID) {
				res.cookie('userID', userID, {
					maxAge: 365 * 24 * 3600 * 1000 /*expires in one year*/
				});
				next();
			}).otherwise(errorFun(res));
		}
	}

	app.use(trackUsers);

	// Change the redirect target for the '/' path to point to the
	// sample project.
	app.get('/', function (req, res) {
		res.redirect('/editor/home/sample');
	});

};
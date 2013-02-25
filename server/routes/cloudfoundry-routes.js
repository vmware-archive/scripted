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
// On cloudfoundry this module replaces the handling of the '/' url.
//
// It provides some logic to use a cooky to assign a unique identifier
// to a user.
//
// Instead of redirecting to user.home we then setup a sample project
// area for this user and redirect them to that area.

var pathJoin = require('../jsdepend/utils').pathJoin;
var when = require('when');

exports.install = function (app, filesystem) {

	var welcomeText = 'Welcome to Scripted!';

	var getUserHome = filesystem.getUserHome;
	var isDirectory = filesystem.isDirectory;
	var mkdir = filesystem.mkdir;
	var copyDir = filesystem.copyDir;
	var exists = filesystem.exists;

	function getUserPath(userID) {
		return pathJoin(getUserHome(), userID);
	}

	function createUserArea(userID) {
		var path = getUserPath(userID);
		return isDirectory(path).then(function (isDir) {
			if (isDir) {
				//already got a user-area
				return;
			}
			//must create user area
			return copyDir('/sample', path);
		});
	}

	function randomString(len) {
		var chars = "abcdefghijklmnopqrstuvwxyz01234567890";
		var str = "";
		for (var i = 0; i < len; i++) {
			var code = Math.floor(Math.random()*chars.length);
			str = str + chars[code];
		}
		return str;
	}

	function generateUserID(tries) {
		tries = tries || 0;
		var id = randomString(8);
		return exists(getUserPath(id)).then(function (exists) {
			if (exists) {
				//already exists... try to find another one
				if (++tries < 10) {
					return generateUserID(tries);
				} else {
					//Can't find a free 'private' user id. Use the 'shared' ID.
					return 'shared';
				}
			}
			return id; //Yeah! Found one that's still available.
		});
	}

	app.get('/', function (req, res) {
		console.log("Should be redirecting to user-specific area");

		var userID = req.cookies.userID;
		console.log('cookie userID = '+userID);
		if (!userID) {
			userID = generateUserID();
		}
		when(userID, function (userID) {
			res.cookie('userID', userID, {
				maxAge: 365 * 24 * 3600 * 1000 /*expires in one year*/
			});
			createUserArea(userID).then(function () {
				res.redirect('/editor'+getUserHome()+'/'+userID);
			});
		});
	});

};
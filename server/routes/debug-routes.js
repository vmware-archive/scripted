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

//See: memwatch: https://hacks.mozilla.org/2012/11/tracking-down-memory-leaks-in-node-js-a-node-js-holiday-season/
//TODO: why does this have issues when deployed on CF, could because I run 32 bit and cf has 64 bit.
//     is it deploying my locally compiled stuff onto CF?
//var memwatch = require('memwatch');
var memwatch = null;

var mongodb = require('../mongo');

function errorFun(res) {
	function error(err) {
		console.error(err);
		res.status(500);
		res.header('Content-Type', 'text/plain');
		res.write(""+err);
		if (err.stack) {
			res.write(""+err.stack);
		}
		res.end();
	}
	return error;
}

exports.install = function install(app) {

	var lastGc = null;
	if (memwatch) {
		memwatch.on('stats', function(stats) {
			lastGc = stats;
			//		console.log('GC : ',JSON.stringify(stats, null, '  '));
		});

		//Returns stats about the last gc event.
		app.get('/debug/gc', function(req, res) {
			if (!lastGc) {
				res.status(404);
			} else {
				res.header('Content-Type', 'application/json');
				res.write(JSON.stringify(lastGc, null, '  '));
			}
			res.end();
		});
	}

	app.get('/debug/mem', function (req, res) {
		res.header('Content-Type', 'application/json');
		res.write(JSON.stringify(process.memoryUsage(), null, '  '));
		res.end();
	});

	/**
	 * Retrieve a mongodb collection as json text
	 */
	app.get('/debug/mongodb/:collection', function (req, res) {
		var name = req.params.collection;
		console.log('mongo fetch collection : '+name );
		mongodb.collection(name).then(function (coll) {
			return mongodb.find(coll).then(function (entries) {
				console.log('find coll entries = '+entries);
				res.header('Content-Type', 'application/json');
				return mongodb.toArray(entries).then(function (array) {
					res.write(JSON.stringify(array, null, '  '));
					res.end();
				});
			});
		}).otherwise(errorFun(res));
	});

	app.get('/debug/test-mongodb', function (req, res) {
		console.log('test mongo request');
		var entry = {
			date: new Date(),
			ip: req.connection.remoteAddress
		};
		mongodb.collection('testlog').then(function (collection) {
			return mongodb.insert(collection, entry).then(function () {
				//Woohoo! no errors so far!
		        res.writeHead(200, {'Content-Type': 'text/plain'});
		        res.write(JSON.stringify(entry));
		        res.end('\n');
			});
		}).otherwise(errorFun(res));
	});
};

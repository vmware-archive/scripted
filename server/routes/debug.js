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

var when = require('when');
var mongo = require('../mongo');
var insert = mongo.insert;

mongo.collection('foo').then(function(foo) {
	insert(foo, { date: new Date() }).then(
		function () {
			console.log('Inserted ok');
		},
		function (err) {
			console.log('Problem inserting');
			console.error(err);
		}
	).always(process.exit);
});

////	when(undefined).then(function () {
////		console.log('About to insert into '+foo);
////		return insert(foo, {_id: 1}).then(function () {
////			console.log('Inserted first entry');
////		});
////	}).then(function () {
////		return insert(foo, {_id: 1}).then(function () {
////			console.log('Inserted second entry');
////		});
////	});
//}).otherwise(function (err) {
//	console.error(err);
//}).always(function () {
//	console.log('Done');
//	process.exit();
//});
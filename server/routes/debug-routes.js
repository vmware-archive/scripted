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
var memwatch = require('memwatch');

exports.install = function install(app) {

	var lastGc = null;
	memwatch.on('stats', function (stats) {
		lastGc = stats;
//		console.log('GC : ',JSON.stringify(stats, null, '  '));
	});

	//Returns stats about the last gc event.
	app.get('/debug/gc', function (req, res) {
		if (!lastGc) {
			res.status(404);
		} else {
			res.header('Content-Type', 'application/json');
			res.write(JSON.stringify(lastGc, null, '  '));
		}
		res.end();
	});
	app.get('/debug/mem', function (req, res) {
		res.header('Content-Type', 'application/json');
		res.write(JSON.stringify(process.memoryUsage(), null, '  '));
		res.end();
	});
};

/*******************************************************************************
 * @license
 * Copyright (c) 2012-2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Scott Andrews
 *     Andrew Eisenberg
 *     Kris De Volder
 ******************************************************************************/

var fs = require('fs');
//var path = require('path');
var pathResolve = require('../jsdepend/utils').pathResolve;

var EDITOR_HTML = pathResolve(__dirname, '../../client/editor.html');

exports.install = function (app, filesystem) {

	var getUserHome = filesystem.getUserHome;

	app.get('/', function (req, res) {
		res.redirect('/editor'+getUserHome());
	});

	function sendEditor(req, res) {
		res.header('Content-Type', 'text/html');
		fs.createReadStream(EDITOR_HTML).pipe(res); //Yes, ok to use node 'fs' directly here.
													// Not serving user content!
	}

	app.get('/editor', sendEditor);
	app.get('/editor/:path(*)', sendEditor);

	app.get('/', function (req, res) {
		res.redirect('/editor'+getUserHome());
	});
};

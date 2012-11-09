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
 *     Scott Andrews
 ******************************************************************************/

var fs = require('fs');

exports.install = function (app) {

	function sendEditor(req, res) {
		res.header('Content-Type', 'text/html');
		fs.createReadStream(process.env.PWD + '/../client/editor.html').pipe(res);
	}

	app.get('/editor', sendEditor);
	app.get('/editor/:path(*)', sendEditor);

};

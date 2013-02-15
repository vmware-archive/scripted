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
 * Andy Clement - initial version
 ******************************************************************************/

/**
 * This code will launch the scripted server (via scriptedServer.js) and then
 * optionally open a URL on that server.
 */

var path = require('path');
var openBrowser = require('./open').open;
var url = "http://localhost:7261";
var suppressOpen = process.argv[2]=='true';
var file = process.argv[3];

var filesystem = require('../server/utils/filesystem').withBaseDir(null);

// Hack alert! The code below is just to play with a very simple case of
// a 'plugable fs'.
//var filesystem = require('../server/utils/filesystem').withBaseDir('/home/kdvolder', {
//	userHome: '/',
//	scriptedHome: 'commandline-dev/new-tools/scripted'
//});

// Launch the server
var server=require('../server/scriptedServer.js').start(filesystem);

// on return, assume it is up and open the browser
if (!suppressOpen) {
	openBrowser(process.argv[3]);
}

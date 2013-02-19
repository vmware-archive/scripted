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
// A start script to run scripted server on cloudfoundry
//


var path = require('path');

var mappedFs = require('../server/plugable-fs/mapped-fs');
var scriptedFs = require('../server/plugable-fs/scripted-fs');

var sandbox = mappedFs.withBaseDir(path.resolve(__dirname, '../sandbox'));
//var amoeba = mappedFs.withPrefix('/amo/eba', sandbox);

var filesystem = scriptedFs.configure(sandbox, {
	userHome: '/amo/eba/user.home',
	scriptedHome: '/scripted.home'
});

//var filesystem = require('../server/utils/filesystem').withBaseDir(), {
//	userHome: '/user.home'
//});

// Launch the server
var server=require('../server/scriptedServer.js').start(filesystem, {
	port: 8123
});


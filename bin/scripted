#!/usr/bin/env node
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
 * Andy Clement, Jeremy Grelle - initial version
 ******************************************************************************/
var optimist = require('optimist');
var	options;
var cmd;
	
options = optimist
	.alias('h', 'help')
	.alias('r', 'restart')
	.alias('k', 'kill')
	.usage('Usage: scr [-hrk] [file/directory]')
	.describe('r','restart the server')
	.describe('k','kill the server')
	.describe('h','this help info')
	.argv;

if (options.h) {
	optimist.showHelp();
	process.exit();
} else {
	if (options.r) {
		cmd = '../commands/restart';
	} else if (options.k) {
		cmd = '../commands/kill';
	} else {
		cmd = '../commands/start';
	}
}
			
require(cmd).exec(options);

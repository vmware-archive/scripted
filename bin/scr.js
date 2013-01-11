#!/usr/bin/env node

var path = require('path'),
	when = require('when'),
	optimist = require('optimist'),
	options,
	cmd;
	
options = optimist
	.alias('h', 'help')
	.alias('r', 'restart')
	.alias('k', 'kill')
	.usage('Usage: scr [-hr] [file/directory]')
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
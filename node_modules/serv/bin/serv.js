#!/usr/bin/env node

var path = require('path'),
	options = require('optimist').argv,
	cmd = '../commands/start';

if (process.argv[2] && process.argv[2].charAt(0) !== '-') {
	cmd = path.dirname(cmd) + '/'+process.argv[2];
}

require(cmd).exec(options);
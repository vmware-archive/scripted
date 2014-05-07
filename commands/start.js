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

// This script will ping the server, if it isn't running it will start it. If it
// is running it will simply open the URL.

var fs = require('fs'),
	path = require('path'),
	errorCode = require('rest/interceptor/errorCode'),
	timeout = require('rest/interceptor/timeout'),
	retry = require('rest/interceptor/retry'),
	client = timeout(errorCode(), {timeout: 150}),
	retryClient = retry(client, {initial: 20, max: 200}),
	childExec = require('child_process').exec,
	spawn = require('child_process').spawn,
	openBrowser = require('./open').open,
	url = "http://localhost:7261";

function exec(options) {
	ping(options).then(
		function(response){
			if (!options.suppressOpen) {
				openBrowser(options._?options._[0]:null);
			}
		},
		function(error){
			start(options);
		}
	);
}

function ping(options) {
	if (options.withRetry) {
		return retryClient({ path: url+"/status" });
	} else {
		return client({ path: url+"/status" });
	}
}

function start(options) {
	var tmp = process.platform == 'win32' ? process.env.TEMP : '/tmp',
		out = fs.openSync(tmp + '/scripted.log', 'a'),
		err = fs.openSync(tmp + '/scripted.log', 'a'),
		child;

	var file = options._;
	var suppressOpen = options.suppressOpen?'true':'false';
	// console.log("path is "+path.resolve(path.dirname(module.filename),'../commands/scripted.js'));
	child = spawn('node', [ path.resolve(path.dirname(module.filename),'../commands/scripted.js'), file, suppressOpen ],{
	        detached:true,
		stdio: ['ignore', out, err]
	});
    
        var logfile = tmp + '/scripted.log';
        console.log('Log file: ' + logfile);
        tailf = spawn('tail', [ '-100f', logfile ],{ stdio: 'inherit' });
	child.unref();
}

module.exports.exec = exec;

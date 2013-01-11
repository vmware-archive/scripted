var fs = require('fs'),
	path = require('path'),
	errorCode = require('rest/interceptor/errorCode'),
	timeout = require('rest/interceptor/timeout'),
	retry = require('rest/interceptor/retry'),
	client = timeout(errorCode(), {timeout: 1000}),
	retryClient = retry(client, {initial: 20, max: 200}),
	childExec = require('child_process').exec,
	spawn = require('child_process').spawn,
	url = "http://localhost:7261";

function exec(options) {
	ping(options).then(
		function(response){
			if (!options.suppressOpen) {
				open(options);
			}
		},
		function(error){
			start(options);
		}
	);
}

function open(options) {
	var cmd = process.env.SCRIPTED_BROWSER;
		
	if (!cmd) {
		switch (process.platform) {
			case 'darwin':
				cmd = 'open';
				break;
			case 'win32':
				cmd = 'start ""';
				break;
			default:
				cmd = 'xdg-open';
		}
	}
	
	if (options._) {
		url += "/editor" + path.resolve(process.cwd(), options._[0]);
	} else {
		url += "/editor" + process.cwd();
	}

	childExec(cmd + ' "' + url.replace(/"/, '\\\"') + '"');
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

		child = spawn('node', [path.resolve(path.dirname(module.filename), '../server/scripted.js')], {
			detached: true,
			stdio: ['ignore', out, err]
		});

	child.unref();
	
	options.withRetry = true;
	ping(options).then(
		function(response){
			if (!options.suppressOpen) {
				open(options);
			}
		},
		function(error){
			console.log("Server failed to start - check " + tmp + "/scripted.log for more information.");
		}
	);
}

module.exports.exec = exec;
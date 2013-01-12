var fs = require('fs'),
	path = require('path'),
	open = require('open'),
	errorCode = require('rest/interceptor/errorCode'),
	timeout = require('rest/interceptor/timeout'),
	retry = require('rest/interceptor/retry'),
	client = retry(timeout(errorCode(), {timeout: 1000}), {max: 200}),
	spawn = require('child_process').spawn;

function exec(options) {
	options.port = options.port || 8000;
	options.url = "http://localhost:" + options.port;
	ping(options).then(
		function(response){
			console.log("Server already running at %s", options.url);
			var url = options.url;
			if (options.path) {
				url += options.path;
			}
			open(url);
		},
		function(error){
			start(options);
		}
	);
}

function ping(options) {
	return client({ path: options.url+"/status" });
}

function start(options) {
	console.log("Starting server at %s", options.url);
	var url = options.url,
		out = fs.openSync('./serv.log', 'a'),
		err = fs.openSync('./serv.log', 'a'),
		args = [ path.resolve(path.dirname(module.filename), '../static-server.js'), options.port ],
		child;

		if (options.cwd) {
			args.push(options.cwd);
		}
		
		child = spawn('node', args, {
			detached: true,
			stdio: ['ignore', out, err]
		});

	child.unref();
	
	ping(options).then(
		function(response){
			if (options.path) {
				url += options.path;
			}
			open(url);
		},
		function(error){
			console.log("Server failed to start - check serv.log for more information.");
		}
	);
}

module.exports.exec = exec;
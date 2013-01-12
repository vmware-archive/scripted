var client = require('rest');

function exec(options) {
	options.port = options.port || 8000;
	options.url = "http://localhost:" + options.port;
	ping(options).then(
		function(response){
			stop(options);
		},
		function(error){
			console.log('Server not running at %s', options.url);
		}
	);
}

function ping(options) {
	return client({ path: options.url+"/status" });
}

function stop(options) {
	client({path: options.url + '/status', method: 'PUT'}).then(
		function(response) {
            console.log('Server at %s shut down successfully.', options.url);
        },
        function(response) {
            console.error('Error shutting down server: ', response.error);
        }
	);
}

module.exports.exec = exec;
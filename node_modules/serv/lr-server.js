var fs = require('fs'),
	Path = require('path'),
	LRWebSocketServer = require('livereload-server'),
	activeConnection; //Cheap method of connection handling - MRU wins

var server = new LRWebSocketServer({
	id: "org.s2js.serv",
	name: "serv",
	version: "1.0",
	protocols: {
		monitoring: 7,
		saving: 1
	}
});

server.on('connected', function(connection) {
	console.log("Client connected (%s)", connection.id);
	activeConnection = connection;
});

server.on('disconnected', function(connection) {
	console.log("Client disconnected (%s)", connection.id);
	if (activeConnection && activeConnection.id == connection.id) {
		activeConnection = null;
	}
});

server.on('command', function(connection, message) {
	console.log("Received command %s: %j", message.command, message);
});

server.on('error', function(err, connection) {
	console.log("Error (%s): %s", connection.id, err.message);
});

server.on('livereload.js', function(request, response) {
	console.log("Serving livereload.js.");
	fs.readFile(Path.join(__dirname, 'lib/livereload.js'), 'utf8', function(err, data) {
		if (err) {
			throw err;
		}

		response.writeHead(200, {
			'Content-Length': data.length,
			'Content-Type': 'text/javascript'
		});
		response.end(data);
	});
});

server.on('httprequest', function(url, request, response) {
	if (url.pathname === '/reload') {
		console.log("Reload request received for %s", url.query.path);
		if (activeConnection) {
			activeConnection.send( { command: 'reload', path: url.query.path, liveCSS: true } );
			console.log('Reloaded ' + url.query.path);
		} else {
			console.log("No active connection.");
			response.writeHead(404);
		}
	} else {
		response.writeHead(404);
	}
	response.end();
});

server.listen(function(err) {
	if (err) {
		console.error("Listening failed: %s", err.message);
		return;
	}
	console.log("LiveReload server listening on port %d.", server.port);
});

module.exports = server;
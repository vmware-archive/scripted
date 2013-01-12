var http = require('http'),
	express = require('express'),

	path = process.argv[3] || process.cwd(),
	host = '127.0.0.1',
	port = process.argv[2],
	lrserver = require('./lr-server'),
	app = express.createServer();

console.log("Arguments: " + process.argv);

app.configure(function() {
	app.use(app.router);
	app.use(express.static(path));
	app.use(express.directory(path));
	app.use(express.errorHandler({
		dumpExceptions: true,
		showStack: true
	}));
});

app.put("/status", function(request, response) {
	console.log("Shutting down...");
	response.send(200);
	app.close();
	process.exit();
});

app.get("/status", function(request, response) {
	response.send("RUNNING", 200);
});

console.log("Serving files from " + path + " at " + host + ":" + port);
app.listen(port, host);
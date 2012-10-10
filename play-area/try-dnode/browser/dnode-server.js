/*global require console setTimeout __dirname */

//See https://github.com/substack/dnode
// for info on how to 'build' and run this with 'browserify'.

var http = require('http');
var shoe = require('shoe');
var ecstatic = require('ecstatic')(__dirname + '/static');
var dnode = require('dnode');

var server = http.createServer(ecstatic);
server.listen(9999);

function search(query, callback) {
	console.log("Search started...");
	function sendResults(i) {
		if (i < 10) {
			var result = query+":"+i;
			console.log("Sending: "+result);
			callback(result);
			setTimeout(function() {
				sendResults(i + 1);
			}, 
			1000);
		} else {
			console.log("Search ended");
			callback("DONE");
		}
	}
	sendResults(0);
}

var sock = shoe(function (stream) {
    var d = dnode({
        search : search
    });
    d.pipe(stream).pipe(d);
});
sock.install(server, '/dnode');

console.log("Browse to http://localhost:9999/");
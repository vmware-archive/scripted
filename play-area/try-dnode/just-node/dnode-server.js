/*global require console setTimeout*/

var http = require('http');
var dnode = require('dnode');

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

//search("test", function (result) {
//	console.log(result);
//});

var server = dnode({
    search : search
});
server.listen(5004);
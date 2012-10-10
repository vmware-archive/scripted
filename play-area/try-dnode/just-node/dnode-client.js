/*global console require*/
var dnode = require('dnode');

var d = dnode.connect(5004);
d.on('remote', function (remote) {
	remote.search("test", function (result) {
		console.log(result);
	});
});
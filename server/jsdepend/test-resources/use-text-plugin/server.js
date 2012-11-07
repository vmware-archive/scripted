// Plugins don't work well with file: urls. So you need a trivial server to
// actually load the examples in this directory.
var connect = require('connect');
connect.createServer(
    connect.static(__dirname)
).listen(8080);
console.log('Server running on localhost:8080 ...');
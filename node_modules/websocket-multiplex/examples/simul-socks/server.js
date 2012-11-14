/*global require __dirname console*/
var express = require('express');
var sockjs = require('sockjs');
var path = require('path');

var app = express.createServer();

//Comment out line below to use sockjs directly (you must then also disable multiplexing in the client)
var websocket_multiplex = require('../../multiplex_server');

var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"};
var echoService;

if (websocket_multiplex) {
	var multiplexerService = sockjs.createServer(sockjs_opts);
	multiplexerService.installHandlers(app, {prefix: '/multiplexer'});
	var multiplexer = new websocket_multiplex.MultiplexServer(multiplexerService);
	echoService = multiplexer.registerChannel('echo');
} else {
	echoService = sockjs.createServer(sockjs_opts);
	echoService.installHandlers(app, {prefix:'/echo'});
} 

var count = 0;

echoService.on('connection', function(conn) {
	var id = count++;
    conn.write('Starting echo service instance ['+id+']');
    conn.on('data', function(data) {
        conn.write('from ['+id+'] ' + data);
    });
});

//Serve some static content
var multiplexClient = path.resolve(__dirname,  '../../multiplex_client.js');

app.get('/multiplex.js', function (req, res) {
	console.log('sending: '+multiplexClient);
    res.sendfile(multiplexClient);
});

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});

app.get('/client.js', function (req, res) {
    res.sendfile(__dirname + '/client.js');
});

//Start the server
console.log(' [*] Listening on 0.0.0.0:9999' );
app.listen(9999, '0.0.0.0');

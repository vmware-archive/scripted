/*global require document*/
var domready = require('domready');
var shoe = require('shoe');
var dnode = require('dnode');

domready(function () {
    var result = document.getElementById('result');
    var stream = shoe('/dnode');

    var d = dnode();
    d.on('remote', function (remote) {
        remote.search('beep', function (s) {
            result.textContent = result.textContent+"\n"+s;
        });
    });
    d.pipe(stream).pipe(d);
});
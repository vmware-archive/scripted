/*global require define console module*/
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

///////////////////////////////////////////
// utils
//////////////////////////////////////////

function println(msg) {
	console.log(msg);	
}

exports.println = println;

//////////////////////////////////////////
});
(function(define) {
define(function(require) {

	var cola = require('cola');
	
	console.log('Cola user is loading... ');
	console.log('Cola user: '+ cola.description);

});
})(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); });
/*global define console*/
define([], function() {
	console.log('This can not be found, except in sloppy resolution mode');

	return {
		aNiceFunction: function(foo) {
			console.log(foo);
		}
	};

});
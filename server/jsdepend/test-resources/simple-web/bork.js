/*global define exports window console document*/
define(['foo'], function (foo) {
	window.onload = function () {
		var fooFun = foo.fooFun;
		
		var target = document.getElementById('target');
		console.log(target);
		console.log(fooFun('Hello'));
	};
 
	return {
		borkFun: function (arg) {
			return 'borkFun of '+arg;
		} 
	};
});
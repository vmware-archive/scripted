/*global define require console exports document*/
define(['bork'], function () {
	var bork = require('bork');
	var foo = require('foo'); //works because bork depends on foo, so foo should already be available
		
	var fooFun = foo.fooFun;
	var borkFun = bork.borkFun;
		
	function withReqFun(arg) {
		return 'withReqFun on '+borkFun(fooFun(arg));
	}
	
	console.log(withReqFun('penguin'));
	
	return withReqFun;

});  
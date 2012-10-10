/*global define require console exports document*/
define(['require'], function (require) {
	
	require(['bork', 'foo'], function (bork, foo) {
		var fooFun = foo.fooFun;
		var borkFun = bork.borkFun;

		function withAsynchReqFun(arg) {
			return 'withAsynchReqFun on '+borkFun(fooFun(arg));
		}
		xxx
	
		console.log(withAsynchReqFun('joker'));
		
	});
	
	require(['with-require-calls'], function (fun) {
		console.log(fun('Freddy'));
	});
		
	console.log('This will be printed first');

}); 
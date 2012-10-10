/*global define window console document*/
define(['sub/submain'], function (submain) {
	window.onload = function () {
		var f = submain.submainFun;
//		var target = document.getElementById('target');
		console.log("f = "+f);
		console.log(f('main'));
//        console.log("Hello");
	};

});

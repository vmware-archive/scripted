/*global document window define*/
define([], function () {

	function message(string) {
		var target = document.getElementById('message');
		target.textContent = string;
	}
	
	function ready(thunk) {
		if (document.readyState === "complete") {
			thunk();
		} else {
			window.onload = thunk;
		}
	}

	return {
		message: message,
		ready: ready
	};

});
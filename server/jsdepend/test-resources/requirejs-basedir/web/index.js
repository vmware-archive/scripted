/*global window console define*/
define(['helpers'], function (helpers) {

	var message = helpers.message;
	var ready = helpers.ready;

	ready(function () {
		console.log('Page loaded');
		message('Page loaded');
	});

});
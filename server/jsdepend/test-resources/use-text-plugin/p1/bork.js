/*global define exports window console document*/
define(['foo', 'text!template.html'], function (foo, html) {

	console.log('---- Html template loaded ----');
	console.log(html);
	console.log('---- Html template loaded ----');

});
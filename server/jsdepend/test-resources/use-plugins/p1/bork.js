/*global define exports window console document*/
define(['foo', 'text!template.html', 'text!to-strip.html!strip', 'domReady!'], 
function (foo, html, stripped, doc) {

	console.log('---- Html template loaded ----');
	console.log(html);
	console.log('---- Html to-strip loaded ----');
	console.log(stripped);

});
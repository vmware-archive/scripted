/*global define exports window console document*/
define(['foo', 
	'text!template.html', 'text!to-strip.html!strip', 
	'i18n!stuff/nls/messages', 'domReady!'],
function (foo, 
	html, stripped, 
	msgs, doc) {
	
	console.log(msgs.greeting);

	console.log('---- Html template loaded ----');
	console.log(html);
	console.log('---- Html to-strip loaded ----');
	console.log(stripped);

});
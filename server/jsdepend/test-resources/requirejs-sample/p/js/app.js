require.config({
	baseUrl: 'js/lib'
});

require(['jquery'],
function ($) {
	console.log($);
	$('#test').text('test');
});
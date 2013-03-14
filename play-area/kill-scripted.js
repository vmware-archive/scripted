
var killUrl = 'http://localhost:8123/status';
//var killUrl = 'http://scrptd.cloudfoundry.com/status

var rest = require('rest');

console.log('Making kill request');
rest({
	path: killUrl,
	method: 'DELETE'
}).then(function (resp) {
	console.log('status = ' + resp.status.code);
	console.log('entity = ' + resp.entity);
}).otherwise(function (err) {
	console.error(err);
});
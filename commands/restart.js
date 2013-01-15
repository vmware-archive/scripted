var kill = require('./kill'),
	start = require('./start');

function exec(options) {
	kill.exec(options).always(
		function() {
			options.suppressOpen = true;
			start.exec(options);
		}
	);
}
	
module.exports.exec = exec;
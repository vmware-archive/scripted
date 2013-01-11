var client = require('rest'),
	url = "http://localhost:7261/kill";

function exec(options) {
	return client({path: url});
}

module.exports.exec = exec;
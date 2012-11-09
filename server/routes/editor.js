var fs = require('fs');

exports.install = function (app) {

	function sendEditor(req, res) {
		res.header('Content-Type', 'text/html');
		fs.createReadStream(process.env.PWD + '/../client/editor.html').pipe(res);
	}

	app.get('/editor', sendEditor);
	app.get('/editor/:path(*)', sendEditor);

};

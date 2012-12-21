var reporter = require('nodeunit').reporters['default'];
var filesystem = require('../../server/jsdepend/filesystem').withBaseDir(null);
var fswalk = require('../../server/jsdepend/fswalk').configure(filesystem).fswalk;
var endsWith = require('../../server/jsdepend/utils').endsWith;
var testFiles = [];
var path = require('path');

fswalk(__dirname,
	function (file) {
		//console.log("Visiting: "+file);
		if (endsWith(file, '-test.js')) {
			//The paths... apparantly must be relative or nodeunit gets confused concatentating
			// the absolute path to the process current working directory.
			var toRun = path.relative(__dirname, file.substring());
			console.log('test file found: '+toRun);
			testFiles.push(toRun);
		}
	},
	function () {
		reporter.run(testFiles);
	}
);


process.chdir(__dirname);
reporter.run(testFiles);
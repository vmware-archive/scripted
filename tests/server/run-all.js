var reporter = require('nodeunit').reporters['default'];
var filesystem = require('../../server/jsdepend/filesystem').withBaseDir(null);
var fswalk = require('../../server/jsdepend/fswalk').configure(filesystem).fswalk;
var endsWith = require('../../server/jsdepend/utils').endsWith;
var testFiles = [];
var path = require('path');

var exec = require('child_process').exec;

var eachk = require('../../server/jsdepend/utils').eachk;

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
		process.chdir(__dirname);
		reporter.run(testFiles, undefined, function () {
			try {
				var scripted = require('../../server/scripted');
			} catch (e) {
				//ignore (already a server running?)
			}
			var problem = null;
			eachk(['http://localhost:7261/clientTests',
				 'http://localhost:7261/clientServerTests'
			],
				/* called on each url */
				function (url, k) {
					console.log(url);
					exec('phantomjs ../client/common/phantom-runner.js '+url,
						function (err, stdout, stderr) {
							problem = problem || err;
							console.log('Exec finished');
							console.log(stdout.toString());
							console.error(stderr.toString());
							k();
						}
					);
				},
				/* done */
				function () {
					if (problem) {
						console.error(problem);
					}
					process.exit(problem ? 1 : 0);
				}
			);
			//TODO: scripted.kill();
			//exec('phantomjs ../../client/scripts/lib/qunit/phantom-runner.js http://localhost:7261/clientServerTests' );
			//console.log('Are we done?');
		});
	}
);

//var scripted = require('../../server/scripted');


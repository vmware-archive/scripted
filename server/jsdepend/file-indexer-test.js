/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/

/*global require exports __dirname console */

//To run this test do this on the commandline:

//1) install nodeunit:
// 'cd ~'
// 'npm install nodeunit'
//2) run the tests
// 'cd <this-directory>' 
// 'nodeunit <this-filename>'

// Good read about unit testing in node.js:
//
// http://caolanmcmahon.com/posts/unit_testing_in_node_js

// A way to run in debug mode (not tried yet)?
// node --debug `which nodeunit` test/run.js

var toCompareString = require('./utils').toCompareString;
var configuration = require('./configuration');

function makeApi(relativeBaseDir) {
	var baseDir = __dirname+'/test-resources/'+relativeBaseDir;
	var conf = configuration.withBaseDir(baseDir);
	var api = require('./file-indexer').configure(conf);
	return api;
}

exports.scriptedFileAtRoot = function(test) {
	var api = makeApi('with-a-scripted-file');
	api.getIndexer('subdir/subsubdir/dummy.js', function (indexer) {
		test.equals(indexer.getRootDir(), '.');
		test.done();
	});
};

exports.scriptedFileInSubproject = function(test) {
	var api = makeApi('with-a-scripted-file');
	api.getIndexer('subproject/subdir/subsubdir/dummy.js', function (indexer) {
		test.equals(indexer.getRootDir(), 'subproject');
		test.done();
	});
};

exports.projectFileAtRoot = function(test) {
	var api = makeApi('with-a-project-file');
	api.getIndexer('subdir/subsubdir/dummy.js', function (indexer) {
		test.equals(indexer.getRootDir(), '.');
		test.done();
	});
};

exports.projectFileInSubproject = function(test) {
	var api = makeApi('with-a-project-file');
	api.getIndexer('subproject/subdir/subsubdir/dummy.js', function (indexer) {
		test.equals(indexer.getRootDir(), 'subproject');
		test.done();
	});
};

exports.noRootMarkerFile = function(test) {
	//The behavior for this case has changed a few times.
	//current expected behavior is that we use directory of the file itself as the root.
	var api = makeApi('no-root-marker-file');
	api.getIndexer('subdir/subsubdir/dummy.js', 
		function (indexer) {
			test.equals(indexer.getRootDir(), 'subdir/subsubdir');
			test.done();
		},
		function (error) {
			throw 'should not be called';
		}
	);
};

exports.searchForNameContainsDum = function(test) {
	var api = makeApi('with-a-scripted-file');
	api.getIndexer('subdir/subsubdir/dummy.js', function (indexer) {
		indexer.findFileNamesContaining('dum', function (files) {
			//console.log(files);
			test.equals(files.length, 2);
			test.done();
		});
	});
};

exports.canFindScriptedFiles = function(test) {
	var api = makeApi('with-a-scripted-file');
	api.getIndexer('subdir/subsubdir/dummy.js', function (indexer) {
		indexer.findFileNamesContaining('.scripted', function (files) {
			//console.log(files);
			test.equals(files.length, 2);
			test.done();
		});
	});
};

exports.findFilesWithName = function (test) {
	var api = makeApi('with-a-scripted-file');
	api.getIndexer('subdir/subsubdir/dummy.js', function (indexer) {
		indexer.findFilesWithName('exact.js', function (files) {
			//console.log(files);
			test.equals(files.length, 2);
			test.done();
		});
	});
};

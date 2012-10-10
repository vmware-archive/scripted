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
	var api = require('./amd-resolver').configure(conf);
	//We are in test mode so the 'private' apis are ok to use:
	for (var p in api.forTesting) {
		if (api.forTesting.hasOwnProperty(p)) {
			api[p] = api.forTesting[p];
		}
	}
	return api;
}

exports.getAmdConfig = function(test) {

	var api = makeApi('requirejs-basedir');

	api.getAmdConfig('web/index.js', function(amdConf) {
		test.equals('web/scripts', amdConf.baseDir);
		test.done();
	});

};

exports.getAmdConfig2 = function(test) {

	var api = makeApi('requirejs-basedir');

	api.getAmdConfig('web2/index.js', function(amdConf) {
		test.equals('web2/scripts', amdConf.baseDir);
		test.done();
	});

};

exports.getAmdConfig3 = function(test) {

	var api = makeApi('requirejs-basedir');

	api.getAmdConfig('web3/minimaleditor.js', function(amdConf) {
		test.equals('web3/scripts', amdConf.baseDir);
		test.done();
	});

};

exports.getAmdConfigWithPaths = function (test) {

	var api = makeApi('path-awareness' /*NOT sloppy*/ );

	api.getAmdConfig('web/main.js', function(amdConf) {
		test.equals(toCompareString({
				paths: {
					"sub/submain": "odd-name/submain",
					"sub/subdep": "odd-name/subdep"
				},
				baseDir: "web"
			}),
			toCompareString(amdConf)
        );
		test.done();
	});

};

exports.getAmdConfigWithPaths2 = function (test) {
	//This test is here to see if the baseDir is correctly taken as relative to html file
	// not the .js file.
	var api = makeApi('path-awareness' /*NOT sloppy*/ );

	api.getAmdConfig('web/odd-name/submain.js', function(amdConf) {
		test.equals(toCompareString({
				paths: {
					"sub/submain": "odd-name/submain",
					"sub/subdep": "odd-name/subdep"
				},
				baseDir: "web"
			}),
			toCompareString(amdConf)
        );
		test.done();
	});

};

exports.getAmdConfigWithPathsAndBaseUrl = function (test) {
	//This test is here to see if it also works correctly when we *do* have a baseUrl
	//declaration in the config block.
	var api = makeApi('path-awareness' /*NOT sloppy*/ );

	api.getAmdConfig('web2/scripts/odd-name/submain.js', function(amdConf) {
		test.equals(toCompareString({
			  "baseUrl": "scripts",
			  "paths": {
			    "sub/submain": "odd-name/submain",
			    "sub/subdep": "odd-name/subdep"
			  },
			  "baseDir": "web2/scripts"
			}),
			toCompareString(amdConf)
        );
		test.done();
	});

};

exports.likeScripted = function (test) {
	//In scripted the config isn't in the html file, its in the first and only js script
	//loaded by the html file via a 'datamain' attribute.
	var api = makeApi('like-scripted' /*NOT sloppy*/ );

	api.getAmdConfig('client/scripts/editor.js', function(amdConf) {
		test.equals(toCompareString({
			  paths: {
				i18n: 'requirejs/i18n',
				text: 'requirejs/text',
				fileapi: 'orion/editor/fileapi',
				jquery: 'lib/jquery-1.7.2.min',
				jquery_ui: 'lib/jquery-ui-custom',
				jsbeautify: 'orion/editor/jsbeautify',
				jsrender: 'lib/jsrender'
			  },
			  "baseDir": "client/scripts"
			}),
			toCompareString(amdConf)
        );
		test.done();
	});
};

exports.configBlockPat = function (test) {
	var api = makeApi('path-awareness' /*NOT sloppy*/ );

	var tree = {
	  "type": "ObjectExpression",
	  "properties": [
	    {
	      "type": "Property",
	      "key": {
	        "type": "Identifier",
	        "name": "paths"
	      },
	      "value": {
	        "type": "ObjectExpression",
	        "properties": [
	          {
	            "type": "Property",
	            "key": {
	              "type": "Literal",
	              "value": "sub/submain"
	            },
	            "value": {
	              "type": "Literal",
	              "value": "odd-name/submain"
	            },
	            "kind": "init"
	          },
	          {
	            "type": "Property",
	            "key": {
	              "type": "Literal",
	              "value": "sub/subdep"
	            },
	            "value": {
	              "type": "Literal",
	              "value": "odd-name/subdep"
	            },
	            "kind": "init"
	          }
	        ]
	      },
	      "kind": "init"
	    }
	  ]
	};

	var pat = api.configBlockPat;
	pat(tree)(
		function (node) {
			test.done();
		},
		function () {
			throw 'fail function should not be called';
		}
	);

};


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
var configuration = require('./filesystem');

function addApi(into, from) {
	for (var p in from) {
		if (from.hasOwnProperty(p)) {
			into[p] = from[p];
		}
	}
}

function makeApi(relativeBaseDir) {
	var baseDir = __dirname+'/test-resources/'+relativeBaseDir;
	var conf = configuration.withBaseDir(baseDir);
	var api = require('./amd-resolver').configure(conf);
	var finderApi = require('./amd-config-finder').configure(conf);
	addApi(api, api.forTesting);
	addApi(api, finderApi);
	addApi(api, finderApi.forTesting);
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
			  "packages": [
			    {
			      "name": "dojo",
			      "location": "dojo",
			      "main": "lib/main-browser",
			      "lib": "."
			    },
			    {
			      "name": "dijit",
			      "location": "dijit",
			      "main": "lib/main",
			      "lib": "."
			    }
			  ],
			  "paths": {
			    "i18n": "requirejs/i18n",
			    "text": "requirejs/text",
			    "fileapi": "orion/editor/fileapi",
			    "jquery": "lib/jquery-1.7.2.min",
			    "jquery_ui": "lib/jquery-ui-custom",
			    "jsbeautify": "orion/editor/jsbeautify",
			    "jsrender": "lib/jsrender"
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

function findAmdConfigIn511Project(project) {
	var context = project + '/client/app/game/restApi.js';
	return function (test) {
		var api = makeApi('511');
		
		api.getAmdConfig(context, function (amdConf) {
			test.equals(
				toCompareString(amdConf),
				toCompareString({
				  "baseUrl": "",
				  "pluginPath": "curl/plugin",
				  "paths": {},
				  "packages": [
				    {
				      "name": "cola",
				      "location": "lib/cola",
				      "main": "./cola-main"
				    },
				    {
				      "name": "wire",
				      "location": "lib/wire",
				      "main": "./wire"
				    },
				    {
				      "name": "when",
				      "location": "lib/when",
				      "main": "when"
				    },
				    {
				      "name": "meld",
				      "location": "lib/meld",
				      "main": "meld"
				    },
				    {
				      "name": "poly",
				      "location": "lib/poly",
				      "main": "./poly"
				    },
				    {
				      "name": "curl",
				      "location": "lib/curl/src/curl",
				      "main": "../curl"
				    },
				    {
				      "name": "rest",
				      "location": "lib/rest",
				      "main": "./rest"
				    },
				    {
				      "name": "0.6",
				      "location": "lib/0.6",
				      "main": "./src/curl"
				    }
				  ],
				  "preloads": [
				    "curl/debug"
				  ],
				  "baseDir": project+"/client"
			}));
			test.done();
		});
	};
}

exports.findAmdConfIn511Project = findAmdConfigIn511Project('goats');
exports.findAmdConfIn511ProjectWithRequireJs = findAmdConfigIn511Project('goats-with-requirejs');

exports.findIndirectAmdConfigInHtmlFileWithThreeScriptTags = function (test) {
	var api = makeApi('simple-web-with-shared-configjs');
	api.getAmdConfig("client/main", function (amdConf) {
		test.equals(toCompareString(amdConf),
			toCompareString({
				baseUrl: '.',
				paths: {
					'utils' : 'lib/utils'
				},
				baseDir: 'client'
			})
		);
		test.done();
	});
};

exports.simpleRequireJsProject = function (test) {
	var api = makeApi('requirejs-sample');
	api.getAmdConfig("p/js/app.js", function (amdConf) {
		test.equals(toCompareString(amdConf),
			toCompareString({
			  "baseUrl": "js/lib",
			  "baseDir": "p/js/lib"
			})
		);
		test.done();
	});
};
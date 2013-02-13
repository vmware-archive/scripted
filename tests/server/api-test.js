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

var toCompareString = require('../../server/jsdepend/utils').toCompareString;
var nodeNatives = require('../../server/jsdepend/node-natives');

function makeApi(relativeBaseDir) {
	var baseDir = __dirname+'/test-resources/'+relativeBaseDir;
	var conf = require('../../server/utils/filesystem').withBaseDir(baseDir);
	conf.sloppy = false;
	var api = require("../../server/jsdepend/api").configure(conf);
	return api;
}

//exports.baseDirTest = function (test) {
//	var api = makeApi('simple-web');
//	test.equals(__dirname+'/test-resources/simple-web/bork.js', api.handle2file('bork.js'));
//	test.done();
//};

exports.getDependenciesTest = function(test) {
	var api = makeApi('simple-web');
	api.getDependencies('/bork.js', function (deps) {
		test.equals(toCompareString(deps), toCompareString([{
			kind: 'AMD',
			name: 'foo',
			path: '/foo.js'
		}]));
		test.done();
	});
};

// This is no longer supposed to work. We need listFiles now to search for
// an html file.
//exports.getDependenciesTestWithoutListFiles = function(test) {
//	var api = makeApi('simple-web', true);
//	api.getDependencies('bork.js', function (deps) {
//		test.equals(toCompareString(deps), toCompareString([{
//			kind: 'AMD',
//			name: 'foo',
//			path: 'foo.js'
//		}]));
//		test.done();
//	});
//};

exports.getContentsTest = function(test) {
	var api = makeApi('simple-web');
	api.getContents('/bork.js', function (contents) {
		test.equals(typeof(contents), 'string');
		//console.log(contents);
		test.done();
	});
};

exports.nestedWebReferenceFromMainToSub = function (test) {
	var api = makeApi('nested-web');
	api.getDependencies('/main.js', function (deps) {
		test.equals(toCompareString(deps), toCompareString([{
			kind: 'AMD',
			name: 'sub/submain',
			path: '/sub/submain.js'
		}]));
		test.done();
	});
};

exports.nestedWebReferenceSubToSibling = function (test) {
	var api = makeApi('nested-web');
	api.getDependencies('/sub/submain.js', function (deps) {
		test.equals(toCompareString(deps), toCompareString([{
			kind: 'AMD',
			name: 'sub/subdep',
			path: '/sub/subdep.js'
		}]));
		test.done();
	});
};

exports.nodePlain = function (test) {
	var api = makeApi('node-plain');
	api.getDependencies('/main.js', function (deps) {
		test.equals(toCompareString(deps), toCompareString([{
			kind: 'commonjs',
			name: './utils',
			path: '/utils.js'
		}]));
		test.done();
	});
};

exports.getDependenciesForUnparsable = function (test) {
	//Even if file is unparsable one of the callbacks should get called.
	var api = makeApi('broken');
	api.getDependencies('unparsable.js',
		function (deps) {
			//It is ok if this gets called (e.g. with empty deps)
			test.done();
		},
		function (deps) {
			//It is also ok if this gets called to signal a problem
			test.done();
		}
	);
};

exports.getNativeNodeModuleContentsTest = function (test) {
	var api = makeApi("node-plain");
	api.getContents(nodeNatives.MAGIC_PATH_PREFIX+"path.js", function (contents) {
		test.equals(typeof(contents), 'string');
		test.ok(contents.indexOf('exports.normalize'));
		test.done();
	});
};

exports.getDGraph1 = function (test) {
	var api = makeApi('node-with-shared-util');
	api.getDGraph('/main.js', function (graph) {
		test.equals(toCompareString(graph), toCompareString({
			"/utils.js": {
				"kind": "commonjs",
				"refs": {}
			},
			"/sub/other.js": {
				"kind": "commonjs",
				"refs": {
					"../utils": {
						"kind": "commonjs",
						"name": "../utils",
						"path": "/utils.js"
					}
				}
			},
			"/main.js": {
				"kind": "commonjs",
				"refs": {
					"./sub/other": {
						"kind": "commonjs",
						"name": "./sub/other",
						"path": "/sub/other.js"
					},
					"./utils": {
						"kind": "commonjs",
						"name": "./utils",
						"path": "/utils.js"
					}
				}
			}
		}));
		test.done();
	});
};

exports.getDGraph2 = function (test) {
	var api = makeApi('nested-web');
	api.getDGraph('/main.js', function(deps) {
		test.equals(toCompareString(deps), toCompareString({
			"/sub/subdep.js" : {
				"kind" : "AMD",
				"refs": {}
			},
			"/sub/submain.js" : {
				"kind" : "AMD",
				"refs" : {
					"sub/subdep" : {
						"kind": "AMD",
						"name": "sub/subdep",
						"path": "/sub/subdep.js"
					}
				}
			},
			"/main.js" : {
				"kind" : "AMD",
				"refs" : {
					"sub/submain" : {
						"kind": "AMD",
						"name": "sub/submain",
						"path": "/sub/submain.js"
					}
				}
			}
		}));
		test.done();
	});
};

exports.getDGraphWithCycleTest1 = function(test) {
	var api = makeApi('cycles');
	api.getDGraph('/main.js', function(deps) {
		test.equals(toCompareString(deps), toCompareString({
			"/sub/subdep.js": {
				"kind": "AMD",
				"refs": {
					"main": {
						"kind": "AMD",
						"name": "main",
						"path": "/main.js"
					}
				}
			},
			"/sub/submain.js": {
				"kind": "AMD",
				"refs": {
					"sub/subdep": {
						"kind": "AMD",
						"name": "sub/subdep",
						"path": "/sub/subdep.js"
					}
				}
			},
			"/main.js": {
				"kind": "AMD",
				"refs": {
					"sub/submain": {
						"kind": "AMD",
						"name": "sub/submain",
						"path": "/sub/submain.js"
					},
					"sub/subdep": {
						"kind": "AMD",
						"name": "sub/subdep",
						"path": "/sub/subdep.js"
					}
				}
			}
		}));
		test.done();
	});
};

exports.getDGraphWithCycleTest2 = function(test) {
	var api = makeApi('cycles');
	api.getDGraph('/sub/subdep.js', function(deps) {
		test.equals(toCompareString(deps), toCompareString({
			"/sub/submain.js": {
				"kind": "AMD",
				"refs": {
					"sub/subdep": {
						"kind": "AMD",
						"name": "sub/subdep",
						"path": "/sub/subdep.js"
					}
				}
			},
			"/main.js": {
				"kind": "AMD",
				"refs": {
					"sub/submain": {
						"kind": "AMD",
						"name": "sub/submain",
						"path": "/sub/submain.js"
					},
					"sub/subdep": {
						"kind": "AMD",
						"name": "sub/subdep",
						"path": "/sub/subdep.js"
					}
				}
			},
			"/sub/subdep.js": {
				"kind": "AMD",
				"refs": {
					"main": {
						"kind": "AMD",
						"name": "main",
						"path": "/main.js"
					}
				}
			}
		}));
		test.done();
	});
};

exports.withParseErrors = function(test) {
    var api = makeApi('simple-web-with-errors');
    api.getDGraph('/bork.js', function(deps) {
        test.equals(toCompareString(deps), toCompareString({
            "/foo.js": {
                "kind": "AMD",
                "refs": {}
            },
            "/bork.js": {
                "kind": "AMD",
                "refs": {
                    "foo": {
                        "kind": "AMD",
                        "name": "foo",
                        "path": "/foo.js"
                    }
                }
            }
        }));
        test.done();
    });
};

exports.globalDependenciesSimple1 = function(test) {
	var api = makeApi('with-global-dependencies');
	api.getDGraph('/simple/scripts/main.js', function(deps) {
		test.equals(toCompareString(deps), toCompareString({
			"/simple/scripts/foo.js": {
				"kind": "global",
				"refs": {}
			},
			"/simple/scripts/bar.js": {
				"kind": "global",
				"refs": {
					"it": {
						"kind": "global",
						"path": "/simple/scripts/foo.js"
					}
				}
			},
			"/simple/scripts/main.js": {
				"kind": "global",
				"refs": {
					"it": {
						"kind": "global",
						"path": "/simple/scripts/bar.js"
					}
				}
			}
		}));
		test.done();
	});
};

//TODO: add a globalDependencies test with unparsable html file.

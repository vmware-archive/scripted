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

//Hack Alert! so we can see where a log message is from:
//console.log = console.trace;
//This hack seriously messes up the log output. don't keep it on all the time!

var toCompareString = require('../../server/jsdepend/utils').toCompareString;
var map = require('../../server/jsdepend/utils').map;
var mapk = require('../../server/jsdepend/utils').mapk;
var configuration = require('../../server/utils/filesystem');
var nodeNatives = require('../../server/jsdepend/node-natives');

function makeApi(relativeBaseDir, sloppy) {
	var baseDir = __dirname+'/test-resources/'+relativeBaseDir;
	var conf = configuration.withBaseDir(baseDir);
	conf.sloppy = sloppy || false;
	var api = require('../../server/jsdepend/resolver').configure(conf);
	//We are in test mode so the 'private' apis are ok to use:
	for (var p in api.forTesting) {
		if (api.forTesting.hasOwnProperty(p)) {
			api[p] = api.forTesting[p];
		}
	}

	api.getContents = conf.getContents;
	api.findReferences = require('../../server/jsdepend/reference-finder').findReferences;
	return api;
}

exports.resolveOne = function (test) {
	var api = makeApi('simple-web');
	var dep = {
			name: 'foo',
			kind: 'AMD'
	};
	api.resolve('bork.js', dep, function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString({
				name: 'foo',
				kind: 'AMD',
				path: 'foo.js'
			})
		);
		test.done();
	});
};

exports.resolveList = function (test) {
	var api = makeApi('simple-web');
	var dep = {
			name: 'foo',
			kind: 'AMD'
	};
	api.resolve('bork.js', [dep], function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString([{
				name: 'foo',
				kind: 'AMD',
				path: 'foo.js'
			}])
		);
		test.done();
	});
};

exports.resolveSubToSiblingReference = function (test) {
	var api = makeApi('nested-web');
	var dep = {
		name: 'sub/subdep',
		kind: 'AMD'
	};
	api.resolve('/sub/submain', [dep], function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString([{
				name: 'sub/subdep',
				kind: 'AMD',
				path: '/sub/subdep.js'
			}])
		);
		test.done();
	});
};

exports.resolveInScriptsFolder = function (test) {
	var api = makeApi('nested-web-with-scripts-folder');
	var dep = {
		name: 'dep',
		kind: 'AMD'
	};
	api.resolve('/web-app/scripts/main.js', [dep], function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString([{
				name: 'dep',
				kind: 'AMD',
				path: '/web-app/scripts/dep.js'
			}])
		);
		test.done();
	});
};

exports.resolveSubToSiblingInScriptsFolder = function (test) {
	var api = makeApi('nested-web-with-scripts-folder');
	var dep = {
		name: 'sub/subdep',
		kind: 'AMD'
	};
	api.resolve('web-app/scripts/sub/submain.js', [dep], function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString([{
				name: 'sub/subdep',
				kind: 'AMD',
				path: 'web-app/scripts/sub/subdep.js'
			}])
		);
		test.done();
	});
};

exports.requireCallWithBaseDir = function (test) {
	var api = makeApi('requirejs-basedir');
	var dep = {
		name: 'helpers',
		kind: 'AMD'
	};
	api.resolve('web/index.js', dep, function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString({
				name: 'helpers',
				kind: 'AMD',
				path: 'web/scripts/helpers.js'
			})
		);
		test.done();
	});
};

exports.commonjsRefs = function (test) {
	var api = makeApi('/node-with-amd-defines');
	var dep = {
		kind: 'commonjs',
		name: './utils'
	};
	api.resolve("/main.js", dep, function (resolved) {
		test.equals(toCompareString(resolved),
			toCompareString({
				kind: 'commonjs',
				name: './utils',
				path: '/utils.js'
			})
		);
		test.done();
	});
};

exports.sloppyMode = function (test) {
	var api = makeApi('for-sloppy-mode', 'sloppy');
	var dep = {
		name: 'magic/external',
		kind: 'AMD'
	};
	api.resolve('web-app/scripts/main.js', [dep], function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString([{
				name: 'magic/external',
				kind: 'AMD',
				path: '/libs/external.js'
			}])
		);
		test.done();
	});
};
exports.sloppyModeMissing = function (test) {
	var api = makeApi('for-sloppy-mode', 'sloppy');
	var dep = {
		name: 'magic/missing',
		kind: 'AMD'
	};
	api.resolve('/web-app/scripts/main.js', [dep], function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString([{
				name: 'magic/missing',
				kind: 'AMD'
				//It is now a requirement that we don't return 'path' if the file doesn't exist!!
				//path: 'web-app/scripts/magic/missing.js'
			}])
		);
		test.done();
	});
};

exports.sloppyModeMultiple = function (test) {
	var api = makeApi('for-sloppy-mode', 'sloppy');
	var dep = {
		name: 'magic/several',
		kind: 'AMD'
	};
	api.resolve('/web-app/scripts/main.js', [dep], function (resolved) {
		dep = resolved[0];
		//console.log(JSON.stringify(dep, null, '  '));
		test.equals(true, dep.path==='/libs/several.js' || dep.path==='/web-app/scripts/several.js');
		test.equals(2, dep.candidates.length);
		test.done();
	});
};

exports.sloppyModePreferBestMatch = function (test) {
	var api = makeApi('for-sloppy-mode', 'sloppy');
	var dep = {
		name: 'libs/orion/utils',
		kind: 'AMD'
	};
	api.resolve('web-app/scripts/main.js', dep, function (resolved) {
		//console.log(resolved);
		dep = resolved;
		test.equals(dep.path, 'web-app/libs/orion/utils.js');
		test.equals(5, dep.candidates.length);
		test.done();
	});
};


exports.preciseModeMissing = function (test) {
	var api = makeApi('for-sloppy-mode'); //Yes we use the test fixtures for 'sloppy mode' even though we aren't sloppy moding it.
	var dep = {
		name: 'magic/missing',
		kind: 'AMD'
	};
	api.resolve('web-app/scripts/main.js', [dep], function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString([{
				name: 'magic/missing',
				kind: 'AMD'
				//It is now a requirement that we don't return 'path' if the file doesn't exist!!
				//path: 'web-app/scripts/magic/missing.js'
			}])
		);
		test.done();
	});

};

exports.pathAwarenessSimple = function (test) {
	//This test should pass without enabling 'sloppy' mode. I.e. it should use the declared path infos in the html file!
	var api = makeApi('path-awareness' /*NOT sloppy*/ );
	var dep = {
		name: 'sub/submain',
		kind: 'AMD'
	};
	api.resolve('web/main.js', dep, function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString({
				name: 'sub/submain',
				kind: 'AMD',
				path: 'web/odd-name/submain.js'
			})
		);
		test.done();
	});
};
exports.pathAwarenessSimple2 = function (test) {
	//This test should pass without enabling 'sloppy' mode. I.e. it should use the declared path infos in the html file!
	var api = makeApi('path-awareness' /*NOT sloppy*/ );
	var dep = {
		name: 'sub/subdep',
		kind: 'AMD'
	};
	api.resolve('web/odd-name/submain.js', dep, function (resolved) {
		test.equals( toCompareString(resolved),
			toCompareString({
				name: 'sub/subdep',
				kind: 'AMD',
				path: 'web/odd-name/subdep.js'
			})
		);
		test.done();
	});
};

exports.matchScore = function (test) {
	var api = makeApi('path-awareness' /*NOT sloppy*/ );
	function matchScore(depName, cand) {
		//The actual function expects depName already split in segments.
		//This function is an 'adapter' to make it slightly easier to call in the
		//test code below.
		return api.matchScore(depName.split('/'), cand);
	}
	test.equals(0, matchScore('foo/bar/util', 'bar/foo/util.js'));
	test.equals(2, matchScore('scripts/foo/bar/util', 'foo/bar/util.js'));
	test.equals(2, matchScore('foo/bar/util', 'foo/bar/util.js'));
	test.equals(1, matchScore('bar/util', 'foo/bar/util.js'));
	test.equals(1, matchScore('scripts/bar/util', 'foo/bar/util.js'));
	test.equals(0, matchScore('util', 'util.js'));
	test.done();
};

exports.resolveNativeNodeModules = function(test) {
	var api = makeApi('node-plain');
	var dep = {
		name: 'path',
		kind: 'commonjs'
	};
	api.resolve('main.js', dep, function(resolved) {
		test.equals(toCompareString(resolved),
			toCompareString({
				name: 'path',
				kind: 'commonjs',
				path: nodeNatives.MAGIC_PATH_PREFIX + 'path' + '.js'
			})
		);
		test.done();
	});
};

exports.resolveNodeModule = function(test) {
	var api = makeApi('node-with-node-modules');
	var depNames = ['foo', 'bar', 'zor', 'snif', 'booger'];
	var expectedPaths = [
		'node_modules/foo/loader.js',
		'node_modules/bar/index.js',
		'node_modules/zor.js',
		'node_modules/snif/sniffer.js',
		'node_modules/booger.js' //There are two booger.js one in subfolder and one in the root, but the subfolder one should not be found
	];

	var deps = map(depNames, function (name) {
		return {
			name: name,
			kind: 'commonjs'
		};
	});
	mapk(deps, function (dep, k) {
			api.resolve('main.js', dep, k);
		},
		function (resolveds) {
			test.equals(resolveds.length, expectedPaths.length);
			for (var i = 0; i < expectedPaths.length; i++) {
				test.equals(expectedPaths[i], resolveds[i].path);
			}
			//console.log(resolveds);
			test.done();
		}
	);
};

exports.resolveNodeModulesInParentDir = function(test) {
	var api = makeApi('node-with-node-modules');
	var depNames = ['foo', 'bar', 'zor', 'booger'];
	var expectedPaths = [
		'node_modules/foo/loader.js',
		'node_modules/bar/index.js',
		'node_modules/zor.js',
		'subfolder/node_modules/booger.js' //There are two candidates one in subfolder and one in the root, but the subfolder should take priority
	];

	var deps = map(depNames, function (name) {
		return {
			name: name,
			kind: 'commonjs'
		};
	});
	mapk(deps, function (dep, k) {
			api.resolve('subfolder/main.js', dep, k);
		},
		function (resolveds) {
			test.equals(resolveds.length, expectedPaths.length);
			for (var i = 0; i < expectedPaths.length; i++) {
				test.equals(expectedPaths[i], resolveds[i].path);
			}
			//console.log(resolveds);
			test.done();
		}
	);
};

exports.resolveNodeModulesWithProblem3 = function(test) {
	var api = makeApi('node-with-bad-data');
	var depNames = ['foo3'];
	var expectedPaths = [
		undefined //won't be found because json is unparsable
	];

	var deps = map(depNames, function (name) {
		return {
			name: name,
			kind: 'commonjs'
		};
	});
	mapk(deps, function (dep, k) {
			api.resolve('subfolder/main.js', dep, k);
		},
		function (resolveds) {
			test.equals(resolveds.length, expectedPaths.length);
			for (var i = 0; i < expectedPaths.length; i++) {
				test.equals(expectedPaths[i], resolveds[i].path);
			}
			//console.log(resolveds);
			test.done();
		}
	);
};

exports.resolveNodeModulesWithProblems = function(test) {
	var api = makeApi('node-with-bad-data');
	var depNames = ['foo', 'foo2', 'foo3', 'foo4', 'bar', 'zor', 'booger'];
	var expectedPaths = [
		undefined, //won't be found because the file name is misspelled
		undefined, //won't be found because json contains bad type of data ' "main" : 88
		undefined, //won't be found because json is unparsable
		undefined, //won't be found because dir has neither index.js nor package.json
		//Despite above problems, the rest of the modules should be found still:
		'node_modules/bar/index.js',
		'node_modules/zor.js',
		'subfolder/node_modules/booger.js' //There are two candidates one in subfolder and one in the root, but the subfolder should take priority
	];

	var deps = map(depNames, function (name) {
		return {
			name: name,
			kind: 'commonjs'
		};
	});
	mapk(deps, function (dep, k) {
			api.resolve('subfolder/main.js', dep, k);
		},
		function (resolveds) {
			test.equals(resolveds.length, expectedPaths.length);
			for (var i = 0; i < expectedPaths.length; i++) {
				test.equals(expectedPaths[i], resolveds[i].path);
			}
			//console.log(resolveds);
			test.done();
		}
	);
};

exports.resolveDotDotReference = function (test) {
	var api = makeApi('node-with-shared-util');
	var dep = {
		kind: 'commonjs',
		name: '../utils'
	};
	api.resolve('sub/other.js', dep, function (resolved) {
		test.equals(toCompareString(resolved), toCompareString({
			kind: 'commonjs',
			name: '../utils',
			path: 'utils.js'
		}));
		test.done();
	});

};

exports.resolveDifferentStyleRelativeDotRefs = function (test) {
	var api = makeApi('node-with-different-relative-refs');
	var depNames = ['./libs/foo', './libs/bar', './libs/zor', './snif'];
	var expectedPaths = [
		'project/libs/foo.js',
		'project/libs/bar/index.js',
		'project/libs/zor/lib/zor-main.js',
		'project/snif/sniffer.js'
	];

	var deps = map(depNames, function (name) {
		return {
			name: name,
			kind: 'commonjs'
		};
	});
	mapk(deps, function (dep, k) {
			api.resolve('project/main.js', dep, k);
		},
		function (resolveds) {
			test.equals(resolveds.length, expectedPaths.length);
			for (var i = 0; i < expectedPaths.length; i++) {
				test.equals(expectedPaths[i], resolveds[i].path);
			}
			//console.log(resolveds);
			test.done();
		}
	);
};

exports.resolveDifferentStyleRelativeDotDotRefs = function (test) {
	var api = makeApi('node-with-different-relative-refs');
	var depNames = ['../project/libs/foo', '../project/libs/bar', '../project/libs/zor', '../project/snif'];
	var expectedPaths = [
		'project/libs/foo.js',
		'project/libs/bar/index.js',
		'project/libs/zor/lib/zor-main.js',
		'project/snif/sniffer.js'
	];

	var deps = map(depNames, function (name) {
		return {
			name: name,
			kind: 'commonjs'
		};
	});
	mapk(deps, function (dep, k) {
			api.resolve('project/main.js', dep, k);
		},
		function (resolveds) {
			test.equals(resolveds.length, expectedPaths.length);
			for (var i = 0; i < expectedPaths.length; i++) {
				test.equals(expectedPaths[i], resolveds[i].path);
			}
			//console.log(resolveds);
			test.done();
		}
	);
};

exports.relativeRefsInAmdModuleDotDot = function (test) {
	var api = makeApi('nested-web-with-scripts-folder');
	var dep = {
		kind: 'AMD',
		name: '../relative'
	};
	api.resolve('web-app/scripts/sub/submain.js', dep, function (dep) {
		test.equals(dep.path, 'web-app/scripts/relative.js');
		test.done();
	});
};

exports.relativeRefsInAmdModuleDot = function (test) {
	var api = makeApi('nested-web-with-scripts-folder');
	var dep = {
		kind: 'AMD',
		name: './relative'
	};
	api.resolve('web-app/scripts/main.js', dep, function (dep) {
		test.equals(dep.path, 'web-app/scripts/relative.js');
		test.done();
	});
};

exports.amdResolveBasedOnPackagesConfig = function (test) {
	var api = makeApi('511');
	var dep = {
		kind: 'AMD',
		name: 'cola'
	};
	api.resolve('goats/client/app/main.js', dep, function (dep) {
		test.equals(dep.path, 'goats/client/lib/cola/cola-main.js');
		test.done();
	});
};

exports.commonsJsWrappedModuleInAmdEnabledContext = function (test) {
	var api = makeApi('511');
	var file = "goats/client/app/game/cola-user.js";
	api.getContents(file, function (code) {
		var tree = require('../../server/jsdepend/parser').parse(code);
		api.findReferences(tree, function (refs) {
			test.equals(toCompareString(map(refs, function(ref) { return ref.name; })),
				toCompareString(["cola"])
			);
			api.resolve(file, refs, function (resolveds) {
				test.equals(toCompareString(map(resolveds, function(ref) {return ref.path; })),
					toCompareString(["goats/client/lib/cola/cola-main.js"])
				);
				test.done();
			});
		});
	});
};

/**
 * Create a function that takes an object and copies all interesting properties
 * of the object to a new 'sanitized' object.
 */
function makeObjectSanitizer(interestingProps) {
	function sanitize(obj) {
		var sanitized = {};
		for (var i=0; i<interestingProps.length; i++) {
			var p = interestingProps[i];
			sanitized[p] = obj[p];
		}
		return sanitized;
	}
	return sanitize;
}

exports.usePlugins = function (test) {
	var api = makeApi('use-plugins');
	var file = "p1/bork.js";
	var sanitize = makeObjectSanitizer(['name', 'path', 'ignore']);
	api.getContents(file, function (code) {
		var tree = require('../../server/jsdepend/parser').parse(code);
		api.findReferences(tree, function (refs) {
			test.equals(toCompareString(map(refs, function(ref) { return ref.name; })),
				toCompareString(["foo", "text!template.html", "text!to-strip.html!strip",
					 "i18n!stuff/nls/messages",
					"domReady!", "dunno!booger"])
			);
			api.resolve(file, refs, function (resolveds) {
				test.equals(toCompareString(map(resolveds, sanitize)),
					toCompareString([{
						name: 'foo',
						path: "p1/foo.js"
					}, {
						name: 'text!template.html',
						path: "p1/template.html"
					}, {
						name: 'text!to-strip.html!strip',
						path: "p1/to-strip.html"
					}, {
					    "name": "i18n!stuff/nls/messages",
						"path": "p1/stuff/nls/messages.js"
					}, {
						name: 'domReady!',
						path: undefined,
						ignore: true
					}, {
						name: 'dunno!booger',
						path: undefined,
						ignore: true
					}])
				);
				test.done();
			});
		});
	});
};

exports.voloSample = function (test) {
	var api = makeApi('volo-sample');
	var file = 'www/js/app/main.js';
	var dep = {
		kind: 'AMD',
		name: 'one'
	};
	api.resolve(file, dep, function (dep) {
		test.equals(toCompareString(dep), toCompareString({
			"kind": "AMD",
			"name": "one",
			"path": "www/js/lib/one.js"
		}));
		test.done();
	});
};

//exports.subPackageImport = function (test) {
//	var api = makeApi('with-sub-package-imports');
//	var file = 'client/js/app/main.js';
//	var deps = [{
//		kind: 'AMD',
//		name: 'rest'
//	}, {
//		kind: 'AMD',
//		name: 'rest/interceptors'
//	}];
//	api.resolve(file, deps, function (deps) {
//		test.equals(toCompareString(deps), toCompareString([{
//			kind: 'AMD',
//			name: 'rest',
//			path: 'client/js/components/rest/rest.js'
//		}, {
//			kind: 'AMD',
//			name: 'rest/interceptors',
//			path: 'client/js/components/rest/interceptors.js'
//		}]));
//		test.done();
//	});
//};

exports.subPackageImport = function (test) {
	var api = makeApi('with-sub-package-imports');
	var file = 'client/js/app/main.js';
	var dep = {
		kind: 'AMD',
		name: 'rest/interceptors'
	};
	api.resolve(file, dep, function (dep) {
		test.equals(toCompareString(dep), toCompareString({
			kind: 'AMD',
			name: 'rest/interceptors',
			path: 'client/js/components/rest/interceptors.js'
		}));
		test.done();
	});
};


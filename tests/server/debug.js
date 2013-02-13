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

/*global __dirname exports require console*/
//This file is a 'scratchpad' in which I paste some snippets of code
//to run in debugger.

//THIS CODE IS NOT PART OF scripted (its not loaded by any other module)

//var testCase = require('./file-indexer-test')
//	.scriptedFileAtRoot;

//var testCase = require('./utils-test')
//	.pathNormalize;

//var testCase = require('./filesystem-test')
//	.userHome;

//var testCase = require('./path-glob-test')
//	.win_match;

//var testCase = require('./api-test')
//	.nodePlain;
//	.globalDependenciesSimple1;

//var testCase = require('./dot-scripted-test')
//	.getScriptedRcFile;

//var testCase = require('./module-types-test.js')
//	.bigFile;

//var testCase = require('./amd-resolver-test')
//	.findIndirectAmdConfigInHtmlFileWithThreeScriptTags;
//	.likeScripted;
//	.findAmdConfigIn511Project;
//	.findAmdConfIn511ProjectWithRequireJs;
//	.getAmdConfig2;
//	.simpleRequireJsProject;

//var testCase = require('./plugin-discovery-test')
//	.one;

var testCase = require('./resolver-test')
	.sloppyMode;
//	.commonjsRefs;
//	.pathAwarenessSimple;
//	.subPackageImport;
//	.voloSample;
//	.resolveNodeModule;
//	.commonsJsWrappedModuleInAmdEnabledContext;
//	.usePlugins;
//	.requireCallWithBaseDir;
//	.useTextPlugin;
//	.resolveInScriptsFolder;
//	.pathAwarenessSimple;
//	.resolveOne;
//	.resolveInScriptsFolder;
//	.relatveRefsInAmdModuleDot;
//	.amdResolveBasedOnPackagesConfig;

//var testCase = require('./reference-finder-test')
//	.commonjsRefs;

testCase({
	equals: function (a, b) {
		console.log('equals? '+ a + ' === '+ b);
	},
	ok: function (bool, msg) {
		console.log('ok? '+bool);
		if (!bool) {
			console.error(msg);
		}
	},
	done: function () {
		console.log('done');
	}
});

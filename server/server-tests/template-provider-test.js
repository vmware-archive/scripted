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
 *     Andrew Eisenberg - initial API and implementation
 ******************************************************************************/
 
/*jslint node:true */
/*global __dirname console */

var provider = require('../templates/template-provider');
var completionsModule = require("../templates/completions");

var testResourcesFolder = __dirname + "/test-resources/";
completionsModule.setCompletionsFolder(testResourcesFolder);

exports.providerTest = function(test) {
	provider.process().then(function(allCompletions) {
		test.ok(allCompletions.html);
		test.ok(allCompletions.js);
		test.ok(allCompletions.json);
		
		test.done();
	},
	function(err) {
		test.fail(err);
		test.done();
	});
};
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

var filesystem = require('../../server/utils/filesystem').withBaseDir(undefined);

var provider = require('../../server/templates/template-provider').configure(filesystem);

exports.providerTest = function(test) {
	provider.processTemplates(__dirname + "/test-resources/").then(function(allCompletions) {
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
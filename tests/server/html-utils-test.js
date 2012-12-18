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

var api = require('../../server/jsdepend/html-utils');

exports.shouldMatch = function (test) {
	test.ok(api.isHtml('foo/bar/zor.html'));
	test.ok(api.isHtml('foo/bar/zor.htm'));
	test.ok(api.isHtml('foo/bar/zor.HTM'));
	test.ok(api.isHtml('foo/bar/zor.HTML'));
	test.done();
};

exports.shouldNotMatch = function (test) {
	//The dot is missing
	test.ok(!api.isHtml('foo/bar/zorhtml'));
	test.ok(!api.isHtml('foo/bar/zorhtm'));
	test.ok(!api.isHtml('foo/bar/zorHTM'));
	test.ok(!api.isHtml('foo/bar/zorHTML'));
	
	//Extra stuff added at the end
	test.ok(!api.isHtml('foo/bar/zor.htmlstuff'));
	test.ok(!api.isHtml('foo/bar/zor.htmstuff'));
	test.ok(!api.isHtml('foo/bar/zor.HTMstuff'));
	test.ok(!api.isHtml('foo/bar/zor.HTMLstuff'));
	
	test.done();
};
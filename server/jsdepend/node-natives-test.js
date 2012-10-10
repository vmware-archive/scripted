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

/*global require exports process*/
var api = require('./node-natives');

var getCode = api.getCode;

exports.isNativeNodeModule = function (test) {
	test.ok(!api.isNativeNodeModule('some-random-name'));
	test.ok(api.isNativeNodeModule('path'));
	test.ok(api.isNativeNodeModule('fs'));
	test.done();
};

exports.getCode = function (test) {
	test.ok(!getCode('some-random-name'));
	var code = getCode('path');
	test.equals(code && typeof(code), 'string');
	code = getCode('fs');
	test.equals(code && typeof(code), 'string');
	test.done();
};
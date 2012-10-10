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

//var testCase = require('./module-types-test.js').bigFile;
var testCase = require('./api-test.js').getDGraphWithCycleTest2;

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

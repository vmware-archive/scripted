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
 
/*global require define console module setTimeout XMLHttpRequest */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require, exports, module) {

	var basePath = '/jsdepend';
	
	var makeServletStub = require('./stub-maker').makeServletStub;
	
	//TODO: This information is repeated between client and server code...
	// it shouldn't be.
	var signatures = {
		getDependencies: ['JSON', 'callback'],
		getTransitiveDependencies: ['JSON', 'callback'],
		getContents: ['JSON', 'callback', 'errback'],
		findFileNamesContaining: ['JSON', 'JSON', 'callback', 'errback'],
		getDGraph: ['JSON', 'callback']
	};
	
	var expectedSig = JSON.stringify(['JSON', 'callback', 'errback']);
	
	for (var functionName in signatures) {
		if (signatures.hasOwnProperty(functionName)) {
			exports[functionName] = makeServletStub(basePath+'/'+functionName, signatures[functionName]);
		}
	}
});
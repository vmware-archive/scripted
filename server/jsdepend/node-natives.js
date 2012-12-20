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

/*global exports process*/
var nodeNatives = (process && process.binding('natives')) || {};

var MAGIC_PATH_PREFIX = '/NODE-NATIVES/';

function isNativeNodeModule(name) {
	return nodeNatives.hasOwnProperty(name);
}

//Get the source code for native node module
function getCode(name) {
	var code = nodeNatives[name];
	return typeof(code)==='string' && code;
}

function isNativeNodeModulePath(handle) {
	var r = handle.lastIndexOf(MAGIC_PATH_PREFIX, 0)===0;
//	console.log('isNativeNodeModulePath('+handle+') => '+r);
	return r;
}

function nativeNodeModuleName(handle) {
	//handle looks like: '/NODE_NATIVES/<name>.js'
	return handle.substring(MAGIC_PATH_PREFIX.length, handle.length-3);
}


exports.MAGIC_PATH_PREFIX = MAGIC_PATH_PREFIX;
exports.isNativeNodeModule = isNativeNodeModule;
exports.getCode = getCode;
exports.isNativeNodeModulePath = isNativeNodeModulePath;
exports.nativeNodeModuleName = nativeNodeModuleName;
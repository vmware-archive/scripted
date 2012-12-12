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
 *     Nieraj Singh - initial API and implementation
 ******************************************************************************/

define(function(require, exports, module) {

	var makePromisedServletStub = require('./stub-maker').makePromisedServletStub;
	var servletPathRename = '/filesystem/rename';
	var servletPathDeleteResource = '/filesystem/deleteResource';
	var servletPathmkdir = '/filesystem/mkdir';
	var servletPathCreateFile = '/filesystem/createFile';
	
	exports.rename = makePromisedServletStub(servletPathRename);
	exports.deleteResource = makePromisedServletStub(servletPathDeleteResource);
	exports.mkdir = makePromisedServletStub(servletPathmkdir);
	exports.createFile = makePromisedServletStub(servletPathCreateFile);

});
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
 
/*global console require*/

var servlets = require('../servlets');
var rename = require('../jsdepend/filesystem').withBaseDir(null).rename;
var deleteResource = require('../jsdepend/filesystem').withBaseDir(null).deleteResource;

var makeRequestHandler = require('./servlet-utils').makePromisedRequestHandler;

servlets.register('/filesystem/rename', makeRequestHandler(rename));
servlets.register('/filesystem/deleteResource', makeRequestHandler(deleteResource));

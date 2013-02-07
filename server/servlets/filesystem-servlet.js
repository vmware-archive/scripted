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
var filesystem = require('../utils/filesystem').withBaseDir(null); //TODO: plugable fs
var rename = filesystem.rename;
var deleteResource = filesystem.deleteResource;
var mkDir = filesystem.mkdir;
var createFile = filesystem.putContents;

var makeRequestHandler = require('./servlet-utils').makePromisedRequestHandler;

servlets.register('/filesystem/rename', makeRequestHandler(rename));
servlets.register('/filesystem/deleteResource', makeRequestHandler(deleteResource));
servlets.register('/filesystem/mkdir', makeRequestHandler(mkDir));
servlets.register('/filesystem/createFile', makeRequestHandler(createFile));

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
 
/*global console require*/

var servlets = require('../servlets');
var filesystem = require('../jsdepend/filesystem').withBaseDir(null);
var getScriptedRcFile = require('../jsdepend/dot-scripted').configure(filesystem).getScriptedRcFile;
var makePromisedRequestHandler = require('./servlet-utils').makePromisedRequestHandler;

servlets.register('/conf/scriptedrc', makePromisedRequestHandler(getScriptedRcFile));

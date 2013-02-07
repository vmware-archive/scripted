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

//
// A servlet that provides access to the jsdepend api via
// http.
//

var utils = require('../jsdepend/utils');

var url = require('url');
var servlets = require('../servlets');
var filesystem = require('../utils/filesystem').withBaseDir(null); //TODO: plugable fs
var apiMaker = require('../jsdepend/api');
var makeRequestHandler = require('./servlet-utils').makeRequestHandler;
var extend = utils.extend;
var pathResolve = utils.pathResolve;

var conf = extend(filesystem, {
	sloppy: false, //sloppy resolver turned off.
	amd: {
		//Extra paths automatically added to amd-configs found by scripted
		// this way plugin-apis will receive automatic content assist.
		paths: {
			'scripted/api' : pathResolve(__dirname, '../../client/scripts/scripted/api')
		}
	}
});

var api = apiMaker.configure(conf);

var basePath = "/jsdepend";
   //where to serve all this api's functions. Each function will be served at
   // basePath + '/' + functionName

for (var functionName in api) {
	if (api.hasOwnProperty(functionName)) {
	    console.log('Creating servlet handler for function: '+functionName);
		var fun = api[functionName];
		if (typeof(fun)==='function') {
			servlets.register(basePath+"/"+functionName, makeRequestHandler(fun));
		} else {
		    console.log('SKIPPED: Not a function: '+functionName);
		}
	}
}

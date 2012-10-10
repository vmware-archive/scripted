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
 
/*global require define*/
/*jslint browser:true */

/////////////////////////////////////////
// fileapi
//
//  Some operations needed to access files.
//  These operations are needed by jsdepend to find dependencies of js files.
//  This modules 'exports' should correspond to what jsdepend expects.
//  See jsdepend/configuration.js for a sample implementation that uses
//  node.js fs and path apis to implement the required functions here.
//
//  Note: this module can not be used in nodejs only in browser environments that provide
//  XMLHttpRequest. Nodejs has something that provides similar functionality, but the API
//  is very different in structure.
////////////////////////////////////////
define(['servlets/stub-maker'], function (mStubMaker) {

	var makeServletStub = mStubMaker.makeServletStub;

	/**
	 * @param {String} handle
	 @ @param {function(String)} callback
	 @ @param {function(String)} errback
	 * @return String
	 */
	function getContents(handle, callback, errback) {
		errback = errback || function (err) {
			throw err;
		};
		//TODO: XMLHttpRequest may not be defined in all environments.
		var xhrobj = new XMLHttpRequest();
		try {
			var url = 'http://localhost:7261/get?file='+handle;
			// console.log("url is "+url);
			xhrobj.open("GET",url,true);
			xhrobj.send();
			xhrobj.onreadystatechange= function() {
		        if(xhrobj.readyState === 4) { // 4 means content has finished loading		
					if (xhrobj.status===200) {
						callback(xhrobj.responseText);
					} else {
						errback("Error: xhr request status = "+xhrobj.status);
					}
				}
			};
		} catch (err) {
			errback(err);
		}
	}
	
	/**
	 * @param {String} handle
	 * @return String
	 */
	function getContentsSync(handle) {
		//TODO: XMLHttpRequest may not be defined in all environments.
		var xhrobj = new XMLHttpRequest();
		var url = 'http://localhost:7261/get?file='+handle;
		// console.log("url is "+url);
		xhrobj.open("GET",url,false);
		xhrobj.send();
		if (xhrobj.status === 200) {
			return xhrobj.responseText;
		} else {
			throw "Error: xhr request status = "+xhrobj.status;
		}
	}

	function listFiles(handle, callback, errback) {
		errback = errback || function (err) {
			throw err;
		};
		//TODO: XMLHttpRequest may not be defined in all environments.
		var xhrobj = new XMLHttpRequest();
		try {
			var url = 'http://localhost:7261/ls?file='+handle;
			// console.log("ls url is "+url);
			xhrobj.open("GET",url,true);
			xhrobj.send();
			xhrobj.onreadystatechange= function() {
		        if(xhrobj.readyState === 4) { // 4 means content has finished loading		
					if (xhrobj.status===200) {
						callback(JSON.parse(xhrobj.responseText));
					} else {
						errback("Error: xhr request status = "+xhrobj.status);
					}
				}
			};
		} catch (err) {
			errback(err);
		}
	}
	
	return {
		getContents: getContents,
		getContentsSync: getContentsSync,
		listFiles: listFiles,
		findFilesContaining: makeServletStub('/jsdepend/findFilesContaining', ['JSON', 'callback', 'errback'])
	};

}); //end: define

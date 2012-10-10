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
 
/*global define console XMLHttpRequest*/
define([], function() {

	/**
	 * Wrap a callback function to make it 'single fire'. This means that if
	 * the callback is called more than once, all but the first call is silently
	 * ignored, only the first call is forwarded to the wrapped function.
	 *
	 * It is still unexplained why these double callbacks sometimes happen.
	 * I have only seen them happen during debug stepping through code.
	 */
	function singleFire(callback) {
		var fired = false;
		return function() {
			if (!fired) {
				fired = true;
				callback.apply(this, arguments);
			} else {
				//console.log("DROPPED an extra callback");
			}
		};
	}

	var oneArgSig = JSON.stringify(['JSON', 'callback', 'errback']);
	var twoArgSig = JSON.stringify(['JSON', 'JSON', 'callback', 'errback']);
	var oneArgSigNoErrback = JSON.stringify(['JSON', 'callback']); //Idiom where callback doubles also as errback (commonly used in nodejs lib code).
	var twoArgSigNoErrback = JSON.stringify(['JSON', 'JSON', 'callback']); //Idiom where callback doubles also as errback (commonly used in nodejs lib code).

	function makeServletStub(path, sig) {
		sig = JSON.stringify(sig);
		var stub = null;
		
		//TODO: all these stubs look alike, can we factor this code better?
		
		if (sig===oneArgSig) {
			stub = function(handle, callback, errback) {
				errback = errback || function (err) {
					throw err;
				};
				callback = singleFire(callback);
				errback = singleFire(errback);
				var xhrobj = new XMLHttpRequest();
				try {
					var args = JSON.stringify([handle]);
					var url = 'http://localhost:7261'+path+'?args='+ encodeURIComponent(args);
					// console.log("url is "+url);
					xhrobj.onreadystatechange= function() {
				        if(xhrobj.readyState === 4) { // 4 means content has finished loading		
							if (xhrobj.status===200) {
								callback(JSON.parse(xhrobj.responseText));
							} else if (xhrobj.status===500) {
								errback("Error: xhr request status = "+xhrobj.responseText);
							}
						}
					};
					xhrobj.open("GET",url,true);
					xhrobj.send();
				} catch (err) {
					errback(err);
				}
			};
		} else if (sig===twoArgSig) {
			stub = function(arg1, arg2, callback, errback) {
				errback = errback || function (err) {
					throw err;
				};
				callback = singleFire(callback);
				errback = singleFire(errback);
				var xhrobj = new XMLHttpRequest();
				try {
					var args = JSON.stringify([arg1, arg2]);
					var url = 'http://localhost:7261'+path+'?args='+ encodeURIComponent(args);
					// console.log("url is "+url);
					xhrobj.open("GET",url,true);
					xhrobj.send();
					xhrobj.onreadystatechange= function() {
				        if(xhrobj.readyState === 4) { // 4 means content has finished loading		
							if (xhrobj.status===200) {
								callback(JSON.parse(xhrobj.responseText));
							} else if (xhrobj.status===500) {
								errback("Error: xhr request status = "+xhrobj.responseText);
							}
						}
					};
				} catch (err) {
					errback(err);
				}
			};
		} else if (sig===oneArgSigNoErrback) {
			stub = function(arg1, callback) {
				callback = singleFire(callback);
				var xhrobj = new XMLHttpRequest();
				try {
					var args = JSON.stringify([arg1]);
					var url = 'http://localhost:7261'+path+'?args='+ encodeURIComponent(args);
					// console.log("url is "+url);
					xhrobj.open("GET",url,true);
					xhrobj.send();
					xhrobj.onreadystatechange= function() {
				        if(xhrobj.readyState === 4) { // 4 means content has finished loading		
							if (xhrobj.status===200) {
								callback.apply(null, JSON.parse(xhrobj.responseText));
							} else if (xhrobj.status===500) {
								callback("Error: xhr request status = "+xhrobj.responseText);
							}
						}
					};
				} catch (err) {
					callback(err);
				}
			};
		} else if (sig===twoArgSigNoErrback) {
			stub = function(arg1, arg2, callback) {
				callback = singleFire(callback);
				var xhrobj = new XMLHttpRequest();
				try {
					var args = JSON.stringify([arg1, arg2]);
					var url = 'http://localhost:7261'+path+'?args='+ encodeURIComponent(args);
					// console.log("url is "+url);
					xhrobj.open("GET",url,true);
					xhrobj.send();
					xhrobj.onreadystatechange= function() {
				        if(xhrobj.readyState === 4) { // 4 means content has finished loading		
							if (xhrobj.status===200) {
								callback.apply(null, JSON.parse(xhrobj.responseText));
							} else if (xhrobj.status===500) {
								callback("Error: xhr request status = "+xhrobj.responseText);
							}
						}
					};
				} catch (err) {
					callback(err);
				}
			};
		} else {
			throw "Don't know how to create a stub for signature: "+sig;
		}
		return stub;
	}
	
	return {
		makeServletStub: makeServletStub
	};
});
	
	

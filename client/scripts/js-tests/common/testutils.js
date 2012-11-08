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
 *     Andy Clement (VMware) - initial API and implementation
 ******************************************************************************/

/*jslint browser:true */

define(["jquery"], function() {

	function discoverTestRoot() {
		var xhrobj = new XMLHttpRequest();
		xhrobj.open("GET", '/test-api/server-root', false);
		xhrobj.send();  // synchronous xhr request
		var testroot = xhrobj.responseText;
		if (testroot.charAt(testroot.length-1) !== '/') {
			testroot += '/';
		}
		return testroot;
	}

	function fixUrlForTests() {
		var xhrobj = new XMLHttpRequest();
		xhrobj.open("GET", '/test-api/server-root', false);
		xhrobj.send();  // synchronous xhr request
		var testResourcesRoot = xhrobj.responseText;
		if (testResourcesRoot.charAt(testResourcesRoot.length-1) !== '/') {
			testResourcesRoot += '/';
		}
		
		var popper = function() { 
			$(window).unbind('popstate', popper);
			return false; 
		};
		
		if (window.location.search !== "?" + testResourcesRoot + 'foo.js') {
			history.pushState(null, "Starting", "?" + testResourcesRoot + 'foo.js');
		}
	}

	function insertEditor() {
		var id = 'editorHook';
		var url = '/editor.html';
		var req = new XMLHttpRequest();
		var element=document.getElementById(id);
		req.open('GET',url,false);
		req.send(null);
		var strippedHeader = req.responseText.replace(/<head[\s\S]*head>/,'');
//		console.log(strippedHeader);
		element.innerHTML = strippedHeader;
	}
	
	function getFileContents(root, fname, callback) {
		var xhrobj = new XMLHttpRequest();
		var url = 'http://localhost:7261/get?file=' + root + fname;
		xhrobj.open("GET",url,true);
		xhrobj.onreadystatechange= function() {
	        if (xhrobj.readyState === 4) {
				callback(xhrobj.responseText);
	        }
	    };
	    xhrobj.send();
	}
	
	
	function runTests(tests) {
		for (var t in tests) {
			if (tests.hasOwnProperty(t)) {
			console.log("running "+t);
				if (t.indexOf('test') === 0) {
					test(t, tests[t]);
				} else if (t.indexOf('asyncTest') === 0) {
					asyncTest(t, tests[t]);
				}
			}
		}
	}

	return {
		discoverTestRoot: discoverTestRoot,
		fixUrlForTests: fixUrlForTests,
		insertEditor: insertEditor,
		runTests: runTests
	};
	
});


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
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/
 
// Tests for navHistory.js, navigation and history
/*jslint browser:true */
/*global $ define module localStorage window console */

define(['orion/assert', 'scripted/utils/navHistory', 'setup', 'jquery'], function(assert, mNavHistory) {
	var xhrobj = new XMLHttpRequest();
	xhrobj.open("GET", '/test-api/server-root', false);
	xhrobj.send();  // synchronous xhr request
	var testResourcesRoot = xhrobj.responseText;
	var testResourcesRootNoSlash;
	if (testResourcesRoot.charAt(testResourcesRoot.length-1) !== '/') {
		testResourcesRootNoSlash = testResourcesRoot;
		testResourcesRoot += '/';
	} else {
		testResourcesRootNoSlash = testResourcesRoot.substring(0, testResourcesRoot.length-1);
	}
	
	function getFileContents(fname, callback) {
		var xhrobj = new XMLHttpRequest();
		var url = 'http://localhost:7261/get?file=' + testResourcesRoot + fname;
		xhrobj.open("GET",url,true);
		xhrobj.onreadystatechange= function() {
	        if (xhrobj.readyState === 4) {
				callback(xhrobj.responseText);
	        }
	    };
	    xhrobj.send();
	}
	
	
	function setup() {
		window.fsroot = testResourcesRootNoSlash;
		localStorage.removeItem("scriptedHistory");
		window.editor = mNavHistory._loadEditor(testResourcesRoot + "foo.js");
		mNavHistory.initializeBreadcrumbs(testResourcesRoot + "foo.js");
	}

	module('File loader tests');
	
	var tests = {};
	tests.asyncTestGetContents = function() {
		setup();
		setTimeout(function() {
			assert.ok(window.editor);
			
			getFileContents("foo.js",
				function(contents) {
					assert.equal(window.editor.getText(), contents);
					
					getFileContents("bar.js", function(contents) {
						window.editor = mNavHistory._loadEditor(testResourcesRoot + "bar.js");
						assert.equal(window.editor.getText(), contents);
						assert.start();
					});
				});
		}, 500);
	};
	tests.asyncTestToggleSidePanel = function() {
		setup();
		assert.ok(!window.subeditors[0]);
		$('#side_panel').css('display', 'none');
		mNavHistory.toggleSidePanel();
		
		setTimeout(function() {
			assert.ok(window.subeditors[0]);
			assert.ok(window.editor.getText(), window.subeditors[0].getText());
			mNavHistory.toggleSidePanel();
			setTimeout(function() {
				assert.ok(!window.subeditors[0]);
				assert.start();
			}, 500);
		}, 500);
	};
	
	tests.testBreadcrumb = function() {
		setup();
		mNavHistory.initializeBreadcrumbs(testResourcesRoot + "bar.js");
		var breadcrumbs = $('#breadcrumb');
		assert.equal(breadcrumbs.children().length, 3);
		assert.equal(breadcrumbs.children()[0], $('#historycrumb')[0]);
		assert.equal(breadcrumbs.children()[1].innerHTML, "<span>" + testResourcesRootNoSlash + "</span>");
		assert.equal(breadcrumbs.children()[2].innerHTML, "<span>bar.js</span>");
	};
	
	tests.testEmptyHistorycrumb = function() {
		setup();
		mNavHistory.initializeBreadcrumbs(testResourcesRoot + "bar.js");
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
	};
	
	tests.testHistorycrumb1 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		
		// already on foo.js, navigate to itself
		mNavHistory.navigationEventHandler({testTarget : testResourcesRoot + "foo.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 1);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#0,0");
	};
	
	tests.testHistorycrumb1a = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		
		// navigate to new location.  remember foo
		mNavHistory.navigationEventHandler({testTarget : testResourcesRoot + "bar.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 1);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#0,0");
	};
	
	tests.testHistorycrumb2 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		
		mNavHistory.navigationEventHandler({testTarget : testResourcesRoot + "bar.js" });
		mNavHistory.navigationEventHandler({testTarget : testResourcesRoot + "baz.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 2);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "bar.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "bar.js" + "#0,0");
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, "/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#0,0");
	};
	
	tests.testHistorycrumb3 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		window.editor.setSelection(10, 20);
		
		mNavHistory.navigationEventHandler({testTarget : testResourcesRoot + "bar.js" });
		window.editor.setSelection(15, 25);
		mNavHistory.navigationEventHandler({testTarget : testResourcesRoot + "baz.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 2);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "bar.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "bar.js" + "#15,25");
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, "/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#10,20");
	};
	
	tests.testHistorycrumb4 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		window.editor.setSelection(10, 20);
		
		mNavHistory.navigationEventHandler({testTarget : testResourcesRoot + "bar.js" });
		window.editor.setSelection(15, 25);
		mNavHistory.navigationEventHandler({testTarget : testResourcesRoot + "baz.js" });
		window.editor.setSelection(5, 10);
		mNavHistory.navigationEventHandler({testTarget : testResourcesRoot + "foo.js" });
		window.editor.setSelection(6, 7);
		
		// this one is not stored in history yet
		mNavHistory.navigationEventHandler({testTarget : testResourcesRoot + "foo.js" });
		window.editor.setSelection(6, 8);
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 3);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#6,7");
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "baz.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, "/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "baz.js" + "#5,10");
		assert.equal(historyMenu.children()[2].children[0].innerHTML, "bar.js");
		assert.equal(historyMenu.children()[2].children[0].attributes[0].value, "/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "bar.js" + "#15,25");
	};
	
	// still to test
	
	// raw history object
	// subeditor and state
	
	return tests;
});
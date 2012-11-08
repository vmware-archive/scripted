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

define(['orion/assert', 'scripted/utils/navHistory', 'scripted/utils/pageState', 'setup', 'jquery'], function(assert, mNavHistory, mPageState) {
	
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
		mNavHistory.closeSidePanel();
		window.subeditors = [];
		var editor = mNavHistory._loadEditor(testResourcesRoot + "foo.js");
		if (window.isSub) {
			window.subeditors[0] = editor;
		} else {
			window.editor = editor;
		}
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
		assert.ok(!window.subeditors[0], window.subeditors[0]);
		$('#side_panel').css('display', 'none');
		mNavHistory.toggleSidePanel();
		
		setTimeout(function() {
			assert.ok(window.subeditors[0]);
			assert.equal(window.editor.getText(), window.subeditors[0].getText());
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
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 1);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#0,0");
	};
	
	tests.testHistorycrumb1a = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		
		// navigate to new location.  remember foo
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 1);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#0,0");
	};
	
	tests.testHistorycrumb2 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js" });
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "baz.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 2);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "bar.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "bar.js" + "#0,0");
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#0,0");
	};
	
	tests.testHistorycrumb3 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		window.editor.setSelection(10, 20);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js" });
		window.editor.setSelection(15, 25);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "baz.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 2);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "bar.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "bar.js" + "#15,25");
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#10,20");
	};
	
	tests.testHistorycrumb4 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		window.editor.setSelection(10, 20);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js" });
		window.editor.setSelection(15, 25);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "baz.js" });
		window.editor.setSelection(5, 10);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js" });
		window.editor.setSelection(6, 7);
		
		// this one is not stored in history yet
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js" });
		window.editor.setSelection(6, 8);
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 3);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#6,7");
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "baz.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "baz.js" + "#5,10");
		assert.equal(historyMenu.children()[2].children[0].innerHTML, "bar.js");
		assert.equal(historyMenu.children()[2].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "bar.js" + "#15,25");
	};
	
	// test subeditor navigation applies to history
	tests.testHistorycrumb5 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		window.editor.setSelection(10, 20);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js", shiftKey:true });
		window.subeditors[0].setSelection(15, 25);
//		$(window.editor._domNode).find('.textview').scrollTop(10);
//		var scrollTop1 = $(window.editor._domNode).find('.textview').scrollTop();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "baz.js", shiftKey:true });
		window.subeditors[0].setSelection(5, 10);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js", shiftKey:true });
		window.subeditors[0].setSelection(6, 7);
//		$(window.editor._domNode).find('.textview').scrollTop(12);
//		var scrollTop2 = $(window.editor._domNode).find('.textview').scrollTop();
		
		
		// this one is not stored in history yet
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js" });
		window.subeditors[0].setSelection(6, 8);
		historyMenu = $("#history_menu");
		
		// TODO the scroll positions are a bit brittle and don't seem to work on firefox at all.
		assert.equal(historyMenu.children().length, 3);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		var isFirefox = navigator.userAgent.indexOf("Firefox") >= 0;
		if (isFirefox) {
			// scrollTop not working on firefox
			assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#6,7");
		} else {
			assert.equal(historyMenu.children()[0].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "foo.js" + "#{\"main\":{\"range\":[6,7],\"scroll\":18}}");
		}
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "baz.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "baz.js" + "#5,10");
		assert.equal(historyMenu.children()[2].children[0].innerHTML, "bar.js");
		if (isFirefox) {
			// scrollTop not working on firefox
			assert.equal(historyMenu.children()[2].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "bar.js" + "#15,25");
		} else {
			assert.equal(historyMenu.children()[2].children[0].attributes[0].value, "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html?" + testResourcesRoot + "bar.js" + "#{\"main\":{\"range\":[15,25],\"scroll\":36}}");
		}
	};
	
	tests.asyncTestGetContentsSubEditor = function() {
		setup();
		setTimeout(function() {
			assert.ok(window.editor);
			assert.ok(!window.subeditors[0]);
			$('#side_panel').css('display', 'none');
			mNavHistory.toggleSidePanel();
			assert.ok(window.subeditors[0]);
			
			getFileContents("foo.js",
				function(contents) {
					window.subeditors[0] = mNavHistory._loadEditor(testResourcesRoot + "foo.js",  $('.subeditor')[0], "sub");
					assert.equal(window.subeditors[0].getText(), contents);
					
					getFileContents("bar.js", function(contents) {
						window.subeditors[0] = mNavHistory._loadEditor(testResourcesRoot + "bar.js",  $('.subeditor')[0], "sub");
						assert.equal(window.subeditors[0].getText(), contents);
						assert.start();
					});
				});
		}, 500);
	};
	
	tests.testEditorNavigation1 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30" });
		assert.deepEqual(window.editor.getSelection(), {start:20,end:30});
	};
	
	tests.testEditorNavigation2 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#40,50" });
		assert.deepEqual(window.editor.getSelection(), {start:40,end:50});
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30" });
		assert.deepEqual(window.editor.getSelection(), {start:20,end:30});
	};
	
	tests.testEditorNavigation3 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js" });
		assert.deepEqual(window.editor.getSelection(), {start:0,end:0});
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30" });
		assert.deepEqual(window.editor.getSelection(), {start:20,end:30});
	};
	
//	tests.testEditorNavigation4 = function() {
//		setup();
//		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#NaN,NaN" });
//		assert.deepEqual(window.editor.getSelection(), {start:0,end:0});
//		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30" });
//		assert.deepEqual(window.editor.getSelection(), {start:20,end:30});
//	};
	
	tests.testSubeditorNavigation1 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30", shiftKey:true });
		assert.deepEqual(window.subeditors[0].getSelection(), {start:20,end:30});
	};
	
	tests.testSubeditorNavigation2 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#40,50", shiftKey:true });
		assert.deepEqual(window.subeditors[0].getSelection(), {start:40,end:50});
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30", shiftKey:true });
		assert.deepEqual(window.subeditors[0].getSelection(), {start:20,end:30});
	};
	
	tests.testSubeditorNavigation3 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js", shiftKey:true });
		assert.deepEqual(window.subeditors[0].getSelection(), {start:0,end:0});
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30", shiftKey:true });
		assert.deepEqual(window.subeditors[0].getSelection(), {start:20,end:30});
	};
	
//	tests.testSubeditorNavigation4 = function() {
//		setup();
//		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#NaN,NaN", shiftKey:true });
//		assert.deepEqual(window.subeditors[0].getSelection(), {start:0,end:0});
//		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30", shiftKey:true });
//		assert.deepEqual(window.subeditors[0].getSelection(), {start:20,end:30});
//	};
	
	tests.testNavigateUsingImplicitHistory = function() {
		setup();
		
		// initial selection should be 0
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js" });		
		assert.deepEqual(window.editor.getSelection(), {start:0,end:0});
		
		// explicit set of selection through url
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#40,50" });		
		assert.deepEqual(window.editor.getSelection(), {start:40,end:50});
		
		// go to a new file 
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js" });		
		assert.deepEqual(window.editor.getSelection(), {start:0,end:0});
		
		// back to original file and ensure selection is grabbed from history
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js" });		
		assert.deepEqual(window.editor.getSelection(), {start:40,end:50});
	};
	
	// confirmation after editing
	// no edit main --- no confirm
	tests.testConfirmNoEditMain = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
		}
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js#20,30" });
		
		mNavHistory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30" });
		assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
	};
	// no edit sub --- no confirm
	tests.testConfirmNoEditSub = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js#20,30", shiftKey:true });
		mNavHistory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30", shiftKey:true });
		assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
	};
	// edit sub, navigate in main --- no confirm
	tests.testConfirmEditSubNavMain = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js#20,30" });
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30", shiftKey:true });
		window.subeditors[0].setText('foo', 0,0);
		
		mNavHistory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30" });
		assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
	};
	// edit main navigate in sub  --- no confirm
	tests.testConfirmEditMainNavSub = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js#20,30", shiftKey:true });
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30" });
		window.editor.setText('foo', 0,0);
		
		mNavHistory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30", shiftKey:true });
		assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
	};
	
	// edit main navigate in main to same file --- no confirm
	tests.testConfirmEditMainNavMainSameFile = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30" });
		window.editor.setText('foo', 0,0);
		
		mNavHistory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30" });
		// should be false and not "no" since the confirmation never occurs if in same file
		assert.equal(confirmed, false, "Should not have opened confirm dialog because target is same file");
	};
	// edit sub navigate in sub to same file --- no confirm
	tests.testConfirmEditMainNavMainSameFile = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30", shiftKey:true  });
		window.subeditors[0].setText('foo', 0,0);
		
		mNavHistory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30", shiftKey:true  });
		// should be false and not "no" since the confirmation never occurs if in same file
		assert.equal(confirmed, false, "Should not have opened confirm dialog because target is same file");
	};

	
	// edit main navigate in main --- confirm
	tests.testConfirmEditMainNavMain = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		mNavHistory._setNavigationConfirmer(confirmer);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30" });
		window.editor.setText('foo', 0,0);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js#20,30" });
		assert.equal(confirmed, "yes", "Should have opened confirm dialog because there was an edit");
	};
	// edit sub navigate in sub  --- confirm
	tests.testConfirmEditSubNavSub = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		mNavHistory._setNavigationConfirmer(confirmer);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "bar.js#20,30", shiftKey:true  });
		window.subeditors[0].setText('foo', 0,0);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRoot + "foo.js#20,30", shiftKey:true  });
		assert.equal(confirmed, "yes", "Should have opened confirm dialog because there was an edit");
	};

	// tests a single page only
	function oddUrlTest(fname, urlSuffix, selection) {
		setup();
		getFileContents(fname,
			function(contents) {
				mNavHistory.handleNavigationEvent({testTarget : "http://localhost:7261/scripts/js-tests/scriptedClientServerTests.html" + urlSuffix }, 
					window.editor);
				assert.equal(window.editor.getText(), contents);
				assert.deepEqual(window.editor.getSelection(), {start:selection[0],end:selection[1]});
				assert.start();				
			});
	}
	
	// now we throw a whole bunch of urls at the editor and test to make sure it behaves correctly
	tests.asyncTestOddUrl1= function() {
		oddUrlTest("bar.js", "?" + testResourcesRoot + "bar.js", [0,0]);
	};
	tests.asyncTestOddUrl1a= function() {
		oddUrlTest("bar.js", "?" + testResourcesRoot + "bar.js#", [0,0]);
	};
	tests.asyncTestOddUrl2= function() {
		oddUrlTest("bar.js", "?" + testResourcesRoot + "bar.js#10,20", [10,20]);
	};
	tests.asyncTestOddUrl3= function() {
		oddUrlTest("bar.js", "?#path:'" + testResourcesRoot + "bar.js',range:[10,20]", [10,20]);
	};
	tests.asyncTestOddUrl4= function() {
		oddUrlTest("bar.js", "?#main:{path:'" + testResourcesRoot + "bar.js',range:[10,20]}", [10,20]);
	};
	tests.asyncTestOddUrl5= function() {
		oddUrlTest("bar.js", "?#{main:{path:'" + testResourcesRoot + "bar.js',range:[10,20]}}", [10,20]);
	};
	tests.asyncTestOddUrl6= function() {
		oddUrlTest("bar.js", "#{main:{path:'" + testResourcesRoot + "bar.js',range:[10,20]}}", [10,20]);
	};
	tests.asyncTestOddUrl7= function() {
		oddUrlTest("bar.js", "?" + testResourcesRoot + "bar.js#{main:{range:[10,20]}}", [10,20]);
	};
	
	function changeLocation(url) {
		var state = mPageState.extractPageStateFromUrl("http://localhost:7261" + url);
		mNavHistory.setupPage(state, true);
	}
	
	function testLocation(mainPath, mainSel, subPath, subSel) {
		assert.equal(window.editor.getFilePath(),testResourcesRoot +  mainPath);
		assert.deepEqual(window.editor.getSelection(), {start: mainSel[0], end: mainSel[1]});
		if (subPath) {
			if (!window.subeditors[0]) {
				assert.fail('Expected a subeditor');
			} else {
				assert.equal(window.subeditors[0].getFilePath(), testResourcesRoot + subPath);
				assert.deepEqual(window.subeditors[0].getSelection(), {start: subSel[0], end: subSel[1]});
			}
		} else {
			assert.ok(!window.subeditors[0], "expected no sub-editor");
		}
	}
	
	tests.testPageSetup1 = function() {
		setup();
		changeLocation("?" + testResourcesRoot + "bar.js");
		testLocation("bar.js", [0,0]);
	};

	tests.asyncTestPageSetup2 = function() {
		setup();
		changeLocation("?" + testResourcesRoot + "bar.js");
		changeLocation("?" + testResourcesRoot + "foo.js");
		testLocation("foo.js", [0,0]);
		history.back();
		setTimeout(function() {
			testLocation("bar.js", [0,0]);
			history.forward();
			setTimeout(function() {
				testLocation("foo.js", [0,0]);
				assert.start();
			}, 1000);
		}, 1000);
	};

	tests.asyncTestPageSetup3 = function() {
		setup();
		changeLocation("?" + testResourcesRoot + "bar.js");
		changeLocation("?" + testResourcesRoot + "foo.js");
		testLocation("foo.js", [0,0]);
		history.back();
		setTimeout(function() {
			testLocation("bar.js", [0,0]);
			history.back();
			setTimeout(function() {
				testLocation("foo.js", [0,0]);
				assert.start();
			}, 1000);
		}, 1000);
	};

	tests.asyncTestPageSetup4 = function() {
		setup();
		changeLocation("?" + testResourcesRoot + "bar.js#20,21");
		changeLocation("?" + testResourcesRoot + "foo.js#5,7");
		testLocation("foo.js", [5,7]);
		history.back();
		setTimeout(function() {
			testLocation("bar.js", [20,21]);
			history.back();
			setTimeout(function() {
				testLocation("foo.js", [0,0]);
				assert.start();
			}, 1000);
		}, 1000);
	};

	tests.asyncTestPageSetup5 = function() {
		setup();
		changeLocation("?" + testResourcesRoot + "bar.js#20,21");
		changeLocation("?" + testResourcesRoot + "bar.js#5,7");
		changeLocation("?" + testResourcesRoot + "bar.js#8,10");
		testLocation("bar.js", [8,10]);
		history.back();
		setTimeout(function() {
			testLocation("bar.js", [5,7]);
			history.back();
			setTimeout(function() {
				testLocation("bar.js", [20,21]);
				assert.start();
			}, 1000);
		}, 1000);
	};

	// with sub editor
	tests.asyncTestPageSetup6 = function() {
		setup();
		changeLocation("?" + testResourcesRoot + "bar.js#main:{range:[20,21]},side:{path:\"" + testResourcesRoot + "baz.js\",range:[9,10]}");
		changeLocation("?" + testResourcesRoot + "foo.js#5,7");
		testLocation("foo.js", [5,7]);
		history.back();
		setTimeout(function() {
			testLocation("bar.js", [20,21], "baz.js", [9,10]);
			history.back();
			setTimeout(function() {
				testLocation("foo.js", [0,0]);
				history.forward();
				setTimeout(function() {
					testLocation("bar.js", [20,21], "baz.js", [9,10]);
					assert.start();
				}, 1000);
			}, 1000);
		}, 1000);
	};

	
	tests.asyncTestToggleSide = function() {
		setup();
		changeLocation("?" + testResourcesRoot + "foo.js#5,7");
		testLocation("foo.js", [5,7]);
		mNavHistory.toggleSidePanel();
		testLocation("foo.js", [5,7], "foo.js", [5,7]);
		mNavHistory.toggleSidePanel();
		testLocation("foo.js", [5,7]);
		history.back();
		setTimeout(function() {
			testLocation("foo.js", [5,7], "foo.js", [5,7]);
			history.back();
			setTimeout(function() {
				testLocation("foo.js", [5,7]);
				history.forward();
				assert.start();
			}, 1000);
		}, 1000);
	};
	
	return tests;
});
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

define(['orion/assert', 'scripted/utils/navHistory', 'scripted/utils/pageState', 'tests/client/common/testutils',
	'scripted/pane/sidePanelManager', 'scripted/pane/paneFactory', 'scripted/editor/editorPane', 'scripted/utils/editorUtils', 'scripted/utils/os', 
	'when', 'scripted/utils/behaviourConfig', 'setup', 'jquery'],
function(assert, mNavHistory, mPageState, mTestutils, mSidePanelManager, mPaneFactory, mEditorPane, editorUtils, os, when, behaviourConfig) {
	
	// TODO remove globals
	window.scripted = window.scripted || {};
	window.scripted.config = window.scripted.config || {};
	window.explorer = window.explorer || {};
	
	behaviourConfig.setAsyncBreadcrumbConstruction(false);
	behaviourConfig.setAsyncEditorContentLoading(false);

	var testResourceRootClosingSlash = mTestutils.discoverTestRoot();
	var testResourcesRootOpeningSlash = (os.name === "windows" ? '/' : "") +  mTestutils.discoverTestRoot();
	var testResourcesRootNoClosingSlash = testResourceRootClosingSlash.substring(0, testResourcesRootOpeningSlash.length-1);
	var urlPathPrefix = "/clientServerTests?" + testResourcesRootOpeningSlash;
	var getFileContents = mTestutils.getFileContents;
	
	function setup() {
		var panes = mPaneFactory.getSidePanes();
		for (var i = 0; i < panes.length; i++) {
			mPaneFactory.destroyPane(panes[i]);
		}
		window.fsroot = testResourcesRootNoClosingSlash;
		mSidePanelManager.closeSidePanel();
		localStorage.removeItem("scripted.recentFileHistory");
		createEditor(testResourcesRootOpeningSlash + "foo.js");
		editorUtils.getMainEditor().setSelection(0,0);
		localStorage.removeItem("scripted.recentFileHistory");
		refreshBreadcrumbAndHistory(testResourcesRootOpeningSlash + "bar.js");
	}
	
	function testLocation(mainPath, mainSel, subPath, subSel) {
		assert.equal(editorUtils.getMainEditor().getFilePath(), testResourceRootClosingSlash +  mainPath);
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start: mainSel[0], end: mainSel[1]});
		if (subPath) {
			if (!editorUtils.getSubEditor()) {
				assert.fail('Expected a subeditor');
			} else {
				assert.equal(editorUtils.getSubEditor().getFilePath(), testResourceRootClosingSlash + subPath);
				assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start: subSel[0], end: subSel[1]});
			}
		} else {
			assert.ok(!editorUtils.getSubEditor(), "expected no sub-editor");
		}
	}

	function changeLocation(url) {
		var state = mPageState.extractPageStateFromUrl("http://localhost:7261/clientServerTests" + url);
		mNavHistory.setupPage(state, true);
	}
	
	function createEditor(path, kind) {
		mNavHistory.handleNavigationEvent({testTarget : path, shiftKey : (kind === 'sub') });
	}
	
	function getMainEditorText() {
		var pane = mPaneFactory.getMainPane();
		if (pane) {
			return pane.editor.getText();
		} else {
			return null;
		}
	}
	
	function getSubEditorText() {
		var pane = mPaneFactory.getPane("scripted.editor");
		if (pane) {
			return pane.editor.getText();
		} else {
			return null;
		}
	}
	
	function refreshBreadcrumbAndHistory(path) {
		mEditorPane._initializeBreadcrumbs(path);
	}

	module('File loader tests');
	
	var tests = {};
	tests.asyncTestGetContents = function() {
		setup();
		setTimeout(function() {
			assert.ok(editorUtils.getMainEditor());
			createEditor(testResourcesRootOpeningSlash + "foo.js");
			getFileContents(testResourceRootClosingSlash, "foo.js",
				function(contents) {
					assert.equal(getMainEditorText(), contents);
					
					createEditor(testResourceRootClosingSlash + "bar.js");
					getFileContents(testResourceRootClosingSlash, "bar.js", function(contents) {
						assert.equal(getMainEditorText(), contents);
						assert.start();
					});
				});
		});
	};
	tests.asyncTestToggleSidePanel = function() {
		setup();
		assert.ok(!editorUtils.getSubEditor(), editorUtils.getSubEditor());
		$('#side_panel').css('display', 'none');
		mNavHistory.toggleSidePanel();
		
		setTimeout(function() {
			assert.ok(editorUtils.getSubEditor());
			assert.equal(getMainEditorText(), getSubEditorText());
			mNavHistory.toggleSidePanel();
			setTimeout(function() {
				assert.ok(!editorUtils.getSubEditor());
				assert.start();
			});
		});
	};
	
	tests.testBreadcrumb = function() {
		setup();
		refreshBreadcrumbAndHistory(testResourcesRootOpeningSlash + "bar.js");
		var breadcrumbs = $('#breadcrumb');
		assert.equal(breadcrumbs.children().length, 3);
		assert.equal(breadcrumbs.children()[0], $('#historycrumb')[0]);
		assert.equal(breadcrumbs.children()[1].innerHTML, "<span>" + testResourcesRootNoClosingSlash + "</span>");
		assert.equal(breadcrumbs.children()[2].innerHTML, "<span>bar.js</span>");
	};
	
	tests.testEmptyHistorycrumb = function() {
		setup();
		refreshBreadcrumbAndHistory(testResourcesRootOpeningSlash + "bar.js");
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
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 1);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#0,0");
	};
	
	tests.testHistorycrumb1a = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		
		// navigate to new location.  remember foo
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 1);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#0,0");
	};
	
	tests.testHistorycrumb2 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "baz.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 2);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "bar.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "bar.js" + "#0,0");
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#0,0");
	};
	
	tests.testHistorycrumb3 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		editorUtils.getMainEditor().setSelection(10, 20);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
		editorUtils.getMainEditor().setSelection(15, 25);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "baz.js" });
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 2);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "bar.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "bar.js" + "#15,25");
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#10,20");
	};
	
	tests.testHistorycrumb4 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		editorUtils.getMainEditor().setSelection(10, 20);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
		editorUtils.getMainEditor().setSelection(15, 25);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "baz.js" });
		editorUtils.getMainEditor().setSelection(5, 10);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js" });
		editorUtils.getMainEditor().setSelection(6, 7);
		
		// this one is not stored in history yet
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js" });
		editorUtils.getMainEditor().setSelection(6, 8);
		historyMenu = $("#history_menu");
		
		assert.equal(historyMenu.children().length, 3);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#6,7");
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "baz.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, urlPathPrefix + "baz.js" + "#5,10");
		assert.equal(historyMenu.children()[2].children[0].innerHTML, "bar.js");
		assert.equal(historyMenu.children()[2].children[0].attributes[0].value, urlPathPrefix + "bar.js" + "#15,25");
	};
	
	// test subeditor navigation applies to history
	tests.testHistorycrumb5 = function() {
		setup();
		var historyMenu = $("#history_menu");
		// history should be empty because no navigation happened
		assert.equal(historyMenu.children().length, 0);
		editorUtils.getMainEditor().setSelection(10, 20);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js", shiftKey:true });
		editorUtils.getSubEditor().setSelection(15, 25);
//		$(editorUtils.getMainEditor()._domNode).find('.textview').scrollTop(10);
//		var scrollTop1 = $(editorUtils.getMainEditor()._domNode).find('.textview').scrollTop();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "baz.js", shiftKey:true });
		editorUtils.getSubEditor().setSelection(5, 10);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js", shiftKey:true });
		editorUtils.getSubEditor().setSelection(6, 7);
//		$(editorUtils.getMainEditor()._domNode).find('.textview').scrollTop(12);
//		var scrollTop2 = $(editorUtils.getMainEditor()._domNode).find('.textview').scrollTop();
		
		
		// this one is not stored in history yet
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js" });
		editorUtils.getSubEditor().setSelection(6, 8);
		historyMenu = $("#history_menu");
		
		// TODO the scroll positions are a bit brittle and don't seem to work on firefox at all.
		assert.equal(historyMenu.children().length, 3);
		assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
		var menuUrl = historyMenu.children()[0].children[0].attributes[0].value;
//		if (isFirefox) {
			// scrollTop not working on firefox
			assert.equal(menuUrl, urlPathPrefix + "foo.js" + "#6,7");
//		} else {
//			assert.equal(menuUrl, urlPathPrefix + "foo.js" + "#{\"main\":{\"range\":[6,7],\"scroll\":18}}");
//		}
		assert.equal(historyMenu.children()[1].children[0].innerHTML, "baz.js");
		assert.equal(historyMenu.children()[1].children[0].attributes[0].value, urlPathPrefix + "baz.js" + "#5,10");
		assert.equal(historyMenu.children()[2].children[0].innerHTML, "bar.js");

		menuUrl = historyMenu.children()[2].children[0].attributes[0].value;
//		if (isFirefox) {
			// scrollTop not working on firefox
			assert.equal(menuUrl, urlPathPrefix + "bar.js" + "#15,25");
//		} else {
//			assert.equal(menuUrl, urlPathPrefix + "bar.js" + "#{\"main\":{\"range\":[15,25],\"scroll\":36}}");
//		}
	};
	
	tests.asyncTestGetContentsSubEditor = function() {
		setup();
		setTimeout(function() {
			assert.ok(editorUtils.getMainEditor());
			assert.ok(!editorUtils.getSubEditor());
			$('#side_panel').css('display', 'none');
			mNavHistory.toggleSidePanel();
			assert.ok(editorUtils.getSubEditor());
			createEditor(testResourcesRootOpeningSlash + "foo.js");
			getFileContents(testResourceRootClosingSlash, "foo.js",
				function(contents) {
					createEditor(testResourcesRootOpeningSlash + "foo.js",  "sub");
					assert.equal(getSubEditorText(), contents);
					
					getFileContents(testResourceRootClosingSlash, "bar.js", function(contents) {
						createEditor(testResourcesRootOpeningSlash + "bar.js", "sub");
						assert.equal(getSubEditorText(), contents);
						assert.start();
					});
				});
		});
	};
	
	tests.testEditorNavigation1 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:20,end:30});
	};
	
	tests.testEditorNavigation2 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#40,50" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:40,end:50});
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:20,end:30});
	};
	
	tests.testEditorNavigation3 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:0,end:0});
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:20,end:30});
	};
	
	tests.testEditorNavigation4 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#NaN,NaN" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:0,end:0});
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:20,end:30});
	};
	
	tests.testSubeditorNavigation1 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
		assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:20,end:30});
	};
	
	tests.testSubeditorNavigation2 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#40,50", shiftKey:true });
		assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:40,end:50});
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
		assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:20,end:30});
	};
	
	tests.testSubeditorNavigation3 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js", shiftKey:true });
		assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:0,end:0});
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
		assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:20,end:30});
	};
	
	tests.testSubeditorNavigation4 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#NaN,NaN", shiftKey:true });
		assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:0,end:0});
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
		assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:20,end:30});
	};
	
	tests.testNavigateUsingImplicitHistory = function() {
		setup();
		
		// initial selection should be 0
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:0,end:0});
		
		// explicit set of selection through url
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#40,50" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:40,end:50});
		
		// go to a new file
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:0,end:0});
		
		// back to original file and ensure selection is grabbed from history
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
		assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:40,end:50});
	};
	
	// confirmation after editing
	// no edit main --- no confirm
	tests.testConfirmNoEditMain = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
		}
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30" });
		
		mPaneFactory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
	};
	// no edit sub --- no confirm
	tests.testConfirmNoEditSub = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30", shiftKey:true });
		mPaneFactory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
		assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
	};
	// edit sub, navigate in main --- no confirm
	tests.testConfirmEditSubNavMain = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30" });
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
		editorUtils.getSubEditor().setText('foo', 0,0);
		
		mPaneFactory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
	};
	// edit main navigate in sub  --- no confirm
	tests.testConfirmEditMainNavSub = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30", shiftKey:true });
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		editorUtils.getMainEditor().setText('foo', 0,0);
		
		mPaneFactory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
		assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
	};
	
	// edit main navigate in main to same file --- no confirm
	tests.testConfirmEditMainNavMainSameFile = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		editorUtils.getMainEditor().setText('foo', 0,0);
		
		mPaneFactory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
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
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true  });
		editorUtils.getSubEditor().setText('foo', 0,0);
		
		mPaneFactory._setNavigationConfirmer(confirmer);
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true  });
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
		mPaneFactory._setNavigationConfirmer(confirmer);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		editorUtils.getMainEditor().setText('foo', 0,0);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30" });
		assert.equal(confirmed, "yes", "Should have opened confirm dialog because there was an edit");
	};
	// edit sub navigate in sub  --- confirm
	tests.testConfirmEditSubNavSub = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		mPaneFactory._setNavigationConfirmer(confirmer);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true  });
		editorUtils.getSubEditor().setText('foo', 0,0);
		
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30", shiftKey:true  });
		assert.equal(confirmed, "yes", "Should have opened confirm dialog because there was an edit");
	};

	// tests a single page only
	function oddUrlTest(fname, urlSuffix, selection) {
		setup();
		getFileContents(testResourceRootClosingSlash, fname,
			function(contents) {
				mNavHistory.handleNavigationEvent({testTarget : "http://localhost:7261/clientServerTests" + urlSuffix },
					editorUtils.getMainEditor());
				assert.equal(getMainEditorText(), contents);
				assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:selection[0],end:selection[1]});
				assert.start();
			});
	}
	
	// now we throw a whole bunch of urls at the editor and test to make sure it behaves correctly
	tests.asyncTestOddUrl1= function() {
		oddUrlTest("bar.js", "?" + testResourceRootClosingSlash + "bar.js", [0,0]);
	};
	tests.asyncTestOddUrl1a= function() {
		oddUrlTest("bar.js", "?" + testResourceRootClosingSlash + "bar.js#", [0,0]);
	};
	tests.asyncTestOddUrl2= function() {
		oddUrlTest("bar.js", "?" + testResourceRootClosingSlash + "bar.js#10,20", [10,20]);
	};
	tests.asyncTestOddUrl3= function() {
		oddUrlTest("bar.js", "?#path:'" + testResourceRootClosingSlash + "bar.js',range:[10,20]", [10,20]);
	};
	tests.asyncTestOddUrl4= function() {
		oddUrlTest("bar.js", "?#main:{path:'" + testResourceRootClosingSlash + "bar.js',range:[10,20]}", [10,20]);
	};
	tests.asyncTestOddUrl5= function() {
		oddUrlTest("bar.js", "?#{main:{path:'" + testResourceRootClosingSlash + "bar.js',range:[10,20]}}", [10,20]);
	};
	tests.asyncTestOddUrl6= function() {
		oddUrlTest("bar.js", "#{main:{path:'" + testResourceRootClosingSlash + "bar.js',range:[10,20]}}", [10,20]);
	};
	tests.asyncTestOddUrl7= function() {
		oddUrlTest("bar.js", "?" + testResourceRootClosingSlash + "bar.js#{main:{range:[10,20]}}", [10,20]);
	};
	
	tests.testPageSetup1 = function() {
		setup();
		changeLocation("?" + testResourceRootClosingSlash + "bar.js");
		testLocation("bar.js", [0,0]);
	};

	tests.asyncTestPageSetup2 = function() {
		setup();
		
		// need to add a timeout here in order to ensure that the
		// pop state handler from navHistory is added before running this test.
		setTimeout(function() {
			changeLocation("?" + testResourceRootClosingSlash + "bar.js");
			changeLocation("?" + testResourceRootClosingSlash + "foo.js");
			testLocation("foo.js", [0,0]);
			history.back();
			$(window).one('popstate', function() {
				testLocation("bar.js", [0,0]);
				history.forward();
				$(window).one('popstate', function() {
					testLocation("foo.js", [0,0]);
					assert.start();
				});
			});
		});
	};

	tests.asyncTestPageSetup3 = function() {
		setup();
		changeLocation("?" + testResourceRootClosingSlash + "bar.js");
		changeLocation("?" + testResourceRootClosingSlash + "foo.js");
		testLocation("foo.js", [0,0]);
		history.back();
		$(window).one('popstate', function() {
			testLocation("bar.js", [0,0]);
			history.back();
			$(window).one('popstate', function() {
				testLocation("foo.js", [0,0]);
				assert.start();
			});
		});
	};

	tests.asyncTestPageSetup4 = function() {
		setup();
		changeLocation("?" + testResourceRootClosingSlash + "bar.js#20,21");
		changeLocation("?" + testResourceRootClosingSlash + "foo.js#5,7");
		testLocation("foo.js", [5,7]);
		history.back();
		$(window).one('popstate', function() {
			testLocation("bar.js", [20,21]);
			history.back();
			$(window).one('popstate', function() {
				testLocation("foo.js", [0,0]);
				assert.start();
			});
		});
	};

	tests.asyncTestPageSetup5 = function() {
		setup();
		changeLocation("?" + testResourceRootClosingSlash + "bar.js#20,21");
		changeLocation("?" + testResourceRootClosingSlash + "bar.js#5,7");
		changeLocation("?" + testResourceRootClosingSlash + "bar.js#8,10");
		testLocation("bar.js", [8,10]);
		history.back();
		$(window).one('popstate', function() {
			testLocation("bar.js", [5,7]);
			history.back();
			$(window).one('popstate', function() {
				testLocation("bar.js", [20,21]);
				assert.start();
			});
		});
	};

	// with sub editor
	tests.asyncTestPageSetup6 = function() {
		setup();
		changeLocation("?" + testResourceRootClosingSlash + "bar.js#main:{range:[20,21]},side:{path:\"" + testResourceRootClosingSlash + "baz.js\",range:[9,10]}");
		changeLocation("?" + testResourceRootClosingSlash + "foo.js#5,7");
		testLocation("foo.js", [5,7]);
		history.back();
		$(window).one('popstate', function() {
			testLocation("bar.js", [20,21], "baz.js", [9,10]);
			history.back();
			$(window).one('popstate', function() {
				testLocation("foo.js", [0,0]);
				history.forward();
				$(window).one('popstate', function() {
					testLocation("bar.js", [20,21], "baz.js", [9,10]);
					assert.start();
				});
			});
		});
	};
	
	tests.asyncTestToggleSide = function() {
		setup();
		changeLocation("?" + testResourceRootClosingSlash + "foo.js#5,7");
		testLocation("foo.js", [5,7]);
		mNavHistory.toggleSidePanel();
		testLocation("foo.js", [5,7], "foo.js", [5,7]);
		mNavHistory.toggleSidePanel();
		testLocation("foo.js", [5,7]);
		history.back();
		$(window).one('popstate', function() {
			testLocation("foo.js", [5,7], "foo.js", [5,7]);
			history.back();
			$(window).one('popstate', function() {
				testLocation("foo.js", [5,7]);
				history.forward();
				assert.start();
			});
		});
	};
	
	return tests;
});
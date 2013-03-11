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

	behaviourConfig.setAsyncBreadcrumbConstruction(true);
	behaviourConfig.setAsyncEditorContentLoading(true);

	var testResourceRootClosingSlash = mTestutils.discoverTestRoot();
	var testResourcesRootOpeningSlash = (os.name === "windows" ? '/' : "") +  mTestutils.discoverTestRoot();
	var testResourcesRootNoClosingSlash = testResourceRootClosingSlash.substring(0, testResourcesRootOpeningSlash.length-1);
	var urlPathPrefix = "/clientServerTests?" + testResourcesRootOpeningSlash;
	var getFileContents = mTestutils.getFileContents;

	function setup() {
		console.log("Starting");
		var panes = mPaneFactory.getSidePanes();
		for (var i = 0; i < panes.length; i++) {
			mPaneFactory.destroyPane(panes[i]);
		}
		window.fsroot = testResourcesRootNoClosingSlash;
		mSidePanelManager.closeSidePanel();
		localStorage.removeItem("scripted.recentFileHistory");
		var deferred = when.defer();
		createEditor(testResourcesRootOpeningSlash + "foo.js").editorLoadedPromise.then(function() {
			editorUtils.getMainEditor().setSelection(0,0);
			$(editorUtils.getMainEditor()._domNode).find('.textview').scrollTop(10);
			localStorage.removeItem("scripted.recentFileHistory");
			$(document).one('breadcrumbsInitialized', function() {
				deferred.resolve();
			});
			refreshBreadcrumbAndHistory(testResourcesRootOpeningSlash + "foo.js");
		});
		return deferred.promise;
	}

	function testLocation(mainPath, mainSel, subPath, subSel) {
		var deferred = when.defer();
		editorUtils.getMainEditor().editorLoadedPromise.then(function() {
			assert.equal(editorUtils.getMainEditor().getFilePath(), testResourceRootClosingSlash +  mainPath,
			"Results: " + editorUtils.getMainEditor().getFilePath() + " and " + testResourceRootClosingSlash +  mainPath);

			assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start: mainSel[0], end: mainSel[1]}, "Main editor selection should be equal");
			if (subPath) {
				editorUtils.getSubEditor().editorLoadedPromise.then(function() {

					if (!editorUtils.getSubEditor()) {
						assert.fail('Expected a subeditor');
					} else {
						assert.equal(editorUtils.getSubEditor().getFilePath(), testResourceRootClosingSlash + subPath);
						assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start: subSel[0], end: subSel[1]}, "Sub editor selection should be equal");
					}
					deferred.resolve();
				});
			} else {
				assert.ok(!editorUtils.getSubEditor(), "expected no sub-editor");
				deferred.resolve();
			}
		});
		return deferred.promise;
	}

	function changeLocation(url) {
		var state = mPageState.extractPageStateFromUrl("http://localhost:7261/clientServerTests" + url);
		mNavHistory.setupPage(state, true);
	}

	function createEditor(path, kind) {
		mNavHistory.handleNavigationEvent({testTarget : path, shiftKey : (kind === 'sub') });
		return (kind === 'sub') ? editorUtils.getSubEditor() : editorUtils.getMainEditor();
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
			var editor = createEditor(testResourcesRootOpeningSlash + "foo.js");
			editor.editorLoadedPromise.then(function() {
				getFileContents(testResourceRootClosingSlash, "foo.js",
					function(contents) {
						assert.equal(getMainEditorText(), contents);

						editor = createEditor(testResourceRootClosingSlash + "bar.js");
						editor.editorLoadedPromise.then(function() {
							getFileContents(testResourceRootClosingSlash, "bar.js", function(contents) {
								assert.equal(getMainEditorText(), contents);
								assert.start();
							});
						});
					});
				});
		});
	};
	tests.asyncTestToggleSidePanel = function() {
		setup();
		assert.ok(!editorUtils.getSubEditor(), editorUtils.getSubEditor());
		$('#side_panel').css('display', 'none');
		mNavHistory.toggleSidePanel().then(function() {
			assert.ok(editorUtils.getSubEditor());
			assert.equal(getMainEditorText(), getSubEditorText());
			mNavHistory.toggleSidePanel().then(function() {
				assert.ok(!editorUtils.getSubEditor());
				assert.start();
			});
		});
	};

	tests.asyncTestBreadcrumb = function() {
		setup();
		refreshBreadcrumbAndHistory(testResourcesRootOpeningSlash + "bar.js");
		var breadcrumbs = $('#breadcrumb');
		assert.equal(breadcrumbs.children().length, 2);
		assert.equal(breadcrumbs.children()[0], $('#historycrumb')[0]);

/* breadcrumb no longer includes inferred root
		assert.equal(breadcrumbs.children()[1].innerHTML, "<span>" + testResourcesRootNoClosingSlash + "</span>");
*/
		assert.equal(breadcrumbs.children()[1].innerHTML, "<span>bar.js</span>");
		assert.start();
	};

	tests.asyncTestEmptyHistorycrumb = function() {
		setup().then(function() {
			refreshBreadcrumbAndHistory(testResourcesRootOpeningSlash + "bar.js");
			var historyMenu = $("#history_menu");
			// history should be empty because no navigation happened
			assert.equal(historyMenu.children().length, 0);
			assert.start();
		});
	};

	tests.asyncTestHistorycrumb1 = function() {
		setup().then(function() {
			var historyMenu = $("#history_menu");
			// history should be empty because no navigation happened
			assert.equal(historyMenu.children().length, 0);

			// already on foo.js, navigate to itself
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js" });
			$(document).one('breadcrumbsInitialized', function() {
				historyMenu = $("#history_menu");

				assert.equal(historyMenu.children().length, 1);
				assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
				assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#0,0");
				assert.start();
			});
		});
	};

	tests.asyncTestHistorycrumb1a = function() {
		setup().then(function() {
			var historyMenu = $("#history_menu");
			// history should be empty because no navigation happened
			assert.equal(historyMenu.children().length, 0);

			// navigate to new location.  remember foo
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
			$(document).one('breadcrumbsInitialized', function() {
				historyMenu = $("#history_menu");

				assert.equal(historyMenu.children().length, 1);
				assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
				assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#0,0");
				assert.start();
			});
		});
	};

	tests.asyncTestHistorycrumb2 = function() {
		setup().then(function() {
			var historyMenu = $("#history_menu");
			// history should be empty because no navigation happened
			assert.equal(historyMenu.children().length, 0);

			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
			$(document).one('breadcrumbsInitialized', function() {

				mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "baz.js" });
				$(document).one('breadcrumbsInitialized', function() {

					historyMenu = $("#history_menu");

					assert.equal(historyMenu.children().length, 2);
					assert.equal(historyMenu.children()[0].children[0].innerHTML, "bar.js");
					assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "bar.js" + "#0,0");
					assert.equal(historyMenu.children()[1].children[0].innerHTML, "foo.js");
					assert.equal(historyMenu.children()[1].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#0,0");
					assert.start();
				});
			});
		});
	};

	tests.asyncTestHistorycrumb3 = function() {
		setup().then(function() {
			var historyMenu = $("#history_menu");
			// history should be empty because no navigation happened
			assert.equal(historyMenu.children().length, 0);
			editorUtils.getMainEditor().setSelection(10, 20);


			// hmmmm...looks like there is a chance that the editor contents is not loaded before
			// the breadcrumbsInitialized event gets fired. Maybe need to add a then() on the editorLoadedPromise
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
			$(document).one('breadcrumbsInitialized', function() {
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					editorUtils.getMainEditor().setSelection(15, 25);
					mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "baz.js" });
					$(document).one('breadcrumbsInitialized', function() {
						historyMenu = $("#history_menu");

						assert.equal(historyMenu.children().length, 2);
						assert.equal(historyMenu.children()[0].children[0].innerHTML, "bar.js");
						assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "bar.js" + "#15,25");
						assert.equal(historyMenu.children()[1].children[0].innerHTML, "foo.js");
						assert.equal(historyMenu.children()[1].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#10,20");
						assert.start();
					});
				});
			});
		});
	};

	tests.asyncTestHistorycrumb4 = function() {
		setup().then(function() {
			var historyMenu = $("#history_menu");
			// history should be empty because no navigation happened
			assert.equal(historyMenu.children().length, 0);
			editorUtils.getMainEditor().setSelection(10, 20);
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });

			$(document).one('breadcrumbsInitialized', function() {
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					editorUtils.getMainEditor().setSelection(15, 25);
					mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "baz.js" });
					$(document).one('breadcrumbsInitialized', function() {
						editorUtils.getMainEditor().setSelection(5, 10);
						mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js" });
						$(document).one('breadcrumbsInitialized', function() {

							editorUtils.getMainEditor().setSelection(6, 7);
							// this one is not stored in history yet
							mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js" });
							$(document).one('breadcrumbsInitialized', function() {
								editorUtils.getMainEditor().setSelection(6, 8);
								historyMenu = $("#history_menu");

								assert.equal(historyMenu.children().length, 3);
								if (historyMenu.children().length == 3) {
									assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
									assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#6,7");
									assert.equal(historyMenu.children()[1].children[0].innerHTML, "baz.js");
									assert.equal(historyMenu.children()[1].children[0].attributes[0].value, urlPathPrefix + "baz.js" + "#5,10");
									assert.equal(historyMenu.children()[2].children[0].innerHTML, "bar.js");
									assert.equal(historyMenu.children()[2].children[0].attributes[0].value, urlPathPrefix + "bar.js" + "#15,25");
								}
								assert.start();
							});
						});
					});
				});
			});
		});
	};

	// test subeditor navigation applies to history
	tests.asyncTestHistorycrumb5 = function() {
		setup().then(function() {
			var historyMenu = $("#history_menu");
			// history should be empty because no navigation happened
			assert.equal(historyMenu.children().length, 0);
			editorUtils.getMainEditor().setSelection(10, 20);
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js", shiftKey:true });
			$(document).one('breadcrumbsInitialized', function() {
				editorUtils.getSubEditor().editorLoadedPromise.then(function() {
					editorUtils.getSubEditor().setSelection(15, 25);
					mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "baz.js", shiftKey:true });
					$(document).one('breadcrumbsInitialized', function() {
						editorUtils.getSubEditor().setSelection(5, 10);
						mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js", shiftKey:true });
						$(document).one('breadcrumbsInitialized', function() {
							editorUtils.getSubEditor().setSelection(6, 7);

							// this one is not stored in history yet
							mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js" });
							$(document).one('breadcrumbsInitialized', function() {
								// not exactly sure why this is necessary. I think there
								// is an extra breadcrumbsInitialized event being raise on FF and Chrome, but not phantom
								// so must wait for a timeout to ensure all initialization events are done.
								setTimeout(function() {
//								editorUtils.getMainEditor().editorLoadedPromise
									editorUtils.getMainEditor().setSelection(6, 8);
									historyMenu = $("#history_menu");

									assert.equal(historyMenu.children().length, 3);
									if (historyMenu.children().length == 3) {
										assert.equal(historyMenu.children()[0].children[0].innerHTML, "foo.js");
										assert.equal(historyMenu.children()[0].children[0].attributes[0].value, urlPathPrefix + "foo.js" + "#6,7");
										assert.equal(historyMenu.children()[1].children[0].innerHTML, "baz.js");
										assert.equal(historyMenu.children()[1].children[0].attributes[0].value, urlPathPrefix + "baz.js" + "#5,10");
										assert.equal(historyMenu.children()[2].children[0].innerHTML, "bar.js");
										assert.equal(historyMenu.children()[2].children[0].attributes[0].value, urlPathPrefix + "bar.js" + "#15,25");
									}
									assert.start();
								}, 2000);
							});
						});
					});
				});
			});
		});
	};

	tests.asyncTestGetContentsSubEditor = function() {
		setup();
		setTimeout(function() {
			assert.ok(editorUtils.getMainEditor());
			assert.ok(!editorUtils.getSubEditor());
			$('#side_panel').css('display', 'none');
			mNavHistory.toggleSidePanel();
			assert.ok(editorUtils.getSubEditor());
			createEditor(testResourcesRootOpeningSlash + "foo.js").editorLoadedPromise.then(function() {
				getFileContents(testResourceRootClosingSlash, "foo.js", function(contents) {
					createEditor(testResourcesRootOpeningSlash + "foo.js",  "sub").editorLoadedPromise.then(function() {
						assert.equal(getSubEditorText(), contents);
						getFileContents(testResourceRootClosingSlash, "bar.js", function(contents) {
							createEditor(testResourcesRootOpeningSlash + "bar.js", "sub").editorLoadedPromise.then(function() {
								assert.equal(getSubEditorText(), contents);
								assert.start();
							});
						});
					});
				});
			});
		});
	};

	tests.asyncTestEditorNavigation1 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		editorUtils.getMainEditor().editorLoadedPromise.then(function() {
			assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:20,end:30});
			assert.start();
		});
	};

	tests.asyncTestEditorNavigation2 = function() {
		setup();
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#40,50" });
		editorUtils.getMainEditor().editorLoadedPromise.then(function() {
			assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:40,end:50});
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:20,end:30});
				assert.start();
			});
		});
	};

	tests.asyncTestEditorNavigation3 = function() {
		setup().then(function() {
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:0,end:0});
				mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:20,end:30});
					assert.start();
				});
			});
		});
	};

	tests.asyncTestEditorNavigation4 = function() {
		setup().then(function() {
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#NaN,NaN" });
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:0,end:0});
				mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:20,end:30});
					assert.start();
				});
			});
		});
	};

	tests.asyncTestSubeditorNavigation1 = function() {
		setup().then(function() {
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
			editorUtils.getSubEditor().editorLoadedPromise.then(function() {
				assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:20,end:30});
				assert.start();
			});
		});
	};

	tests.asyncTestSubeditorNavigation2 = function() {
		setup().then(function() {
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#40,50", shiftKey:true });
			editorUtils.getSubEditor().editorLoadedPromise.then(function() {
				assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:40,end:50});
				mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
				editorUtils.getSubEditor().editorLoadedPromise.then(function() {
					assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:20,end:30});
					assert.start();
				});
			});
		});
	};

	tests.asyncTestSubeditorNavigation3 = function() {
		setup().then(function() {
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js", shiftKey:true });
			editorUtils.getSubEditor().editorLoadedPromise.then(function() {
				assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:0,end:0});
				mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
				editorUtils.getSubEditor().editorLoadedPromise.then(function() {
					assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:20,end:30});
					assert.start();
				});
			});
		});
	};

	tests.asyncTestSubeditorNavigation4 = function() {
		setup().then(function() {
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#NaN,NaN", shiftKey:true });
			editorUtils.getSubEditor().editorLoadedPromise.then(function() {
				assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:0,end:0});
				mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
				editorUtils.getSubEditor().editorLoadedPromise.then(function() {
					assert.deepEqual(editorUtils.getSubEditor().getSelection(), {start:20,end:30});
					assert.start();
				});
			});
		});
	};

	tests.asyncTestNavigateUsingImplicitHistory = function() {
		setup().then(function() {

			// initial selection should be 0
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:0,end:0});

				// explicit set of selection through url
				mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#40,50" });
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:40,end:50});

					// go to a new file
					mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js" });
					editorUtils.getMainEditor().editorLoadedPromise.then(function() {
						assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:0,end:0});

						// back to original file and ensure selection is grabbed from history
						mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js" });
						editorUtils.getMainEditor().editorLoadedPromise.then(function() {
							assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:40,end:50});
							assert.start();
						});
					});
				});
			});
		});
	};

	// confirmation after editing
	// no edit main --- no confirm
	tests.asyncTestConfirmNoEditMain = function() {
		setup().then(function() {
			var confirmed = false;
			function confirmer(done) {
				confirmed = done ? "yes" : "no";
			}
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30" });
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				mPaneFactory._setNavigationConfirmer(confirmer);
				mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
					assert.start();
				});
			});
		});
	};
	// no edit sub --- no confirm
	tests.asyncTestConfirmNoEditSub = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}

		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30", shiftKey:true });
		editorUtils.getSubEditor().editorLoadedPromise.then(function() {
			mPaneFactory._setNavigationConfirmer(confirmer);
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
			editorUtils.getSubEditor().editorLoadedPromise.then(function() {
				assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
				assert.start();
			});
		});
	};

	// edit sub, navigate in main --- no confirm
	tests.asyncTestConfirmEditSubNavMain = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}

		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30" });
		editorUtils.getMainEditor().editorLoadedPromise.then(function() {
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
			editorUtils.getSubEditor().editorLoadedPromise.then(function() {
				editorUtils.getSubEditor().setText('foo', 0,0);

				mPaneFactory._setNavigationConfirmer(confirmer);
				mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
					assert.start();
				});
			});
		});
	};
	// edit main navigate in sub  --- no confirm
	tests.asyncTestConfirmEditMainNavSub = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30", shiftKey:true });
		editorUtils.getSubEditor().editorLoadedPromise.then(function() {

			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				editorUtils.getMainEditor().setText('foo', 0,0);

				mPaneFactory._setNavigationConfirmer(confirmer);
				mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true });
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					assert.equal(confirmed, "no", "Should not have opened confirm dialog if no edits");
					assert.start();
				});
			});
		});
	};

	// edit main navigate in main to same file --- no confirm
	tests.asyncTestConfirmEditMainNavMainSameFile = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}

		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		editorUtils.getSubEditor().editorLoadedPromise.then(function() {
			editorUtils.getMainEditor().setText('foo', 0,0);

			mPaneFactory._setNavigationConfirmer(confirmer);
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
			editorUtils.getSubEditor().editorLoadedPromise.then(function() {
				// should be false and not "no" since the confirmation never occurs if in same file
				assert.equal(confirmed, false, "Should not have opened confirm dialog because target is same file");
				assert.start();
			});
		});
	};
	// edit sub navigate in sub to same file --- no confirm
	tests.asyncTestConfirmEditMainNavMainSameFile = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}

		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true  });
		editorUtils.getSubEditor().editorLoadedPromise.then(function() {
			editorUtils.getSubEditor().setText('foo', 0,0);

			mPaneFactory._setNavigationConfirmer(confirmer);
			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true  });
			editorUtils.getSubEditor().editorLoadedPromise.then(function() {
				// should be false and not "no" since the confirmation never occurs if in same file
				assert.equal(confirmed, false, "Should not have opened confirm dialog because target is same file");
				assert.start();
			});
		});
	};


	// edit main navigate in main --- confirm
	tests.asyncTestConfirmEditMainNavMain = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		mPaneFactory._setNavigationConfirmer(confirmer);

		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30" });
		editorUtils.getMainEditor().editorLoadedPromise.then(function() {
			editorUtils.getMainEditor().setText('foo', 0,0);

			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30" });
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				assert.equal(confirmed, "yes", "Should have opened confirm dialog because there was an edit");
				assert.start();
			});
		});
	};
	// edit sub navigate in sub  --- confirm
	tests.asyncTestConfirmEditSubNavSub = function() {
		var confirmed = false;
		function confirmer(done) {
			confirmed = done ? "yes" : "no";
			return true;
		}
		mPaneFactory._setNavigationConfirmer(confirmer);

		mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "bar.js#20,30", shiftKey:true  });
		editorUtils.getSubEditor().editorLoadedPromise.then(function() {
			editorUtils.getSubEditor().setText('foo', 0,0);

			mNavHistory.handleNavigationEvent({testTarget : testResourcesRootOpeningSlash + "foo.js#20,30", shiftKey:true  });
			editorUtils.getSubEditor().editorLoadedPromise.then(function() {
				assert.equal(confirmed, "yes", "Should have opened confirm dialog because there was an edit");
				assert.start();
			});
		});
	};

	// tests a single page only
	function oddUrlTest(fname, urlSuffix, selection) {
		setup();
		getFileContents(testResourceRootClosingSlash, fname,
			function(contents) {
				mNavHistory.handleNavigationEvent({testTarget : "http://localhost:7261/clientServerTests" + urlSuffix },
					editorUtils.getMainEditor());
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					assert.equal(getMainEditorText(), contents);
					assert.deepEqual(editorUtils.getMainEditor().getSelection(), {start:selection[0],end:selection[1]});
					assert.start();
				});
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

	// with sub editor
	tests.asyncTestPageSetup6 = function() {
		setup().then(function() {
			// failing occasionally. add timeout to help ensure all previous events are finished before starting this test
			setTimeout(function() {
				changeLocation("?" + testResourceRootClosingSlash + "bar.js#main:{range:[20,21]},side:{path:\"" + testResourceRootClosingSlash + "baz.js\",range:[9,10]}");
				editorUtils.getSubEditor().editorLoadedPromise.then(function() {
					editorUtils.getMainEditor().editorLoadedPromise.then(function() {
						changeLocation("?" + testResourceRootClosingSlash + "foo.js#5,7");
						editorUtils.getMainEditor().editorLoadedPromise.then(function() {
							testLocation("foo.js", [5,7]).then(function() {
								$(document).one('pageSetupComplete', function() {
									testLocation("bar.js", [20,21], "baz.js", [9,10]).then(function() {
										$(document).one('pageSetupComplete', function() {
											testLocation("foo.js", [0,0]).then(function() {
												$(document).one('pageSetupComplete', function() {
													testLocation("bar.js", [20,21], "baz.js", [9,10]).then(function() {
														assert.start();
													});
												});
												history.forward();
											});
										});
										history.back();
									});
								});
								history.back();
							});
						});
					});
				});
			}, 2000);
		});
	};

	tests.asyncTestPageSetup1 = function() {
		setup();
		changeLocation("?" + testResourceRootClosingSlash + "bar.js");
		testLocation("bar.js", [0,0]).then(function() {
			assert.start();
		});
	};

	tests.asyncTestPageSetup2 = function() {
		setup().then(function() {
			changeLocation("?" + testResourceRootClosingSlash + "bar.js");
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				changeLocation("?" + testResourceRootClosingSlash + "foo.js");
				testLocation("foo.js", [0,0]).then(function() {
					$(document).one('pageSetupComplete', function() {
						testLocation("bar.js", [0,0]).then(function() {
							$(document).one('pageSetupComplete', function() {
								testLocation("foo.js", [0,0]).then(function() {
									assert.start();
								});
							});
							history.forward();
						});
					});
					history.back();
				});
			});
		});
	};

	tests.asyncTestPageSetup3 = function() {
		setup().then(function() {
			changeLocation("?" + testResourceRootClosingSlash + "bar.js");
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				changeLocation("?" + testResourceRootClosingSlash + "foo.js");
				testLocation("foo.js", [0,0]).then(function() {
					$(document).one('pageSetupComplete', function() {
						testLocation("bar.js", [0,0]).then(function() {
							$(document).one('pageSetupComplete', function() {
								testLocation("foo.js", [0,0]).then(function() {
									assert.start();
								});
							});
							history.back();
						});
					});
					history.back();
				});
			});
		});
	};

	tests.asyncTestPageSetup4 = function() {
		setup().then(function() {
			changeLocation("?" + testResourceRootClosingSlash + "bar.js#20,21");
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				changeLocation("?" + testResourceRootClosingSlash + "foo.js#5,7");
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					testLocation("foo.js", [5,7]).then(function() {
						$(document).one('pageSetupComplete', function() {
							editorUtils.getMainEditor().editorLoadedPromise.then(function() {
								testLocation("bar.js", [20,21]).then(function() {
									$(document).one('pageSetupComplete', function() {
										console.log("in tests");
										testLocation("foo.js", [0,0]).then(function() {
											assert.start();
										});
									});
									history.back();
								});
							});
						});
						history.back();
					});
				});
			});
		});
	};

	tests.asyncTestPageSetup5 = function() {
		setup().then(function() {
			changeLocation("?" + testResourceRootClosingSlash + "bar.js#20,21");
			editorUtils.getMainEditor().editorLoadedPromise.then(function() {
				changeLocation("?" + testResourceRootClosingSlash + "bar.js#5,7");
				editorUtils.getMainEditor().editorLoadedPromise.then(function() {
					changeLocation("?" + testResourceRootClosingSlash + "bar.js#8,10");
					editorUtils.getMainEditor().editorLoadedPromise.then(function() {
						testLocation("bar.js", [8,10]).then(function() {
							$(document).one('pageSetupComplete', function() {
								editorUtils.getMainEditor().editorLoadedPromise.then(function() {
									testLocation("bar.js", [5,7]).then(function() {
										$(document).one('pageSetupComplete', function() {
											testLocation("bar.js", [20,21]).then(function() {
												assert.start();
											});
										});
										history.back();
									});
								});
							});
							history.back();
						});
					});
				});
			});
		});
	};

	tests.asyncTestToggleSide = function() {
		setup();
		changeLocation("?" + testResourceRootClosingSlash + "foo.js#5,7");
		testLocation("foo.js", [5,7]).then(function() {
			mNavHistory.toggleSidePanel();
			testLocation("foo.js", [5,7], "foo.js", [5,7]).then(function() {
				mNavHistory.toggleSidePanel();
				testLocation("foo.js", [5,7]).then(function() {
					$(document).one('pageSetupComplete', function() {
						testLocation("foo.js", [5,7], "foo.js", [5,7]).then(function() {
							$(document).one('pageSetupComplete', function() {
								testLocation("foo.js", [5,7]).then(function() {
									history.forward();
									assert.start();
								});
							});
							history.back();
						});
					});
					history.back();
				});
			});
		});
	};

	return tests;
});
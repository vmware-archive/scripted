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
 *     Chris Johnson - initial implementation
 *      Andy Clement
 *    Andrew Eisenberg - refactoring for a more consistent approach to navigation
 ******************************************************************************/
/*jslint browser:true */
/*global window setTimeout define explorer document console location XMLHttpRequest alert confirm orion scripted dojo $ localStorage JSON5 scriptedLogger */

/**
 * This module defines the navigation and history functionality of scripted.
 */
define(["scripted/pane/sidePanelManager", "scripted/pane/paneFactory", "scripted/utils/pageState", "scripted/utils/os", "scripted/utils/editorUtils", 'lib/json5'],
function(mSidePanelManager, mPaneFactory, mPageState, mOsUtils, editorUtils) {
	
	var EDITOR_TARGET = {
		main : "main",
		sub : "sub",
		tab : "tab"
	};
	var LINE_SCROLL_OFFSET = 5;
	var GET_URL = "/get?file=";
	
	// define as forward reference
	var navigate;
	
	var findTarget = function(event) {
		var target;
		if (mOsUtils.isCtrlOrMeta(event)) {
			target = EDITOR_TARGET.tab;
		} else {
			var subNavigationDisabled = (editorUtils.getMainEditor().loadResponse === 'error') ? true : false;
			target = (event.shiftKey || event.makeShift) && !subNavigationDisabled ? EDITOR_TARGET.sub : EDITOR_TARGET.main;
		}
		return target;
	};

	/**
	 * @param {Editor} editor
	 */
	var scrollToSelection = function(editor) {
		var tv = editor.getTextView();
		var model = tv.getModel();
		var offset = tv.getCaretOffset();
		var line = model.getLineAtOffset(offset);
		if (line >= LINE_SCROLL_OFFSET) {
			line = line - LINE_SCROLL_OFFSET;
		}
		tv.setTopIndex(line);
	};
		
	/**
	 * Handles navigation requests from clicking on links
	 */
	var handleNavigationEvent = function(event, editor) {
		var url = event.testTarget ? event.testTarget : (
			event.altTarget ? $(event.altTarget).attr('href') : $(event.currentTarget).attr('href'));
		var pageState = mPageState.extractPageStateFromUrl(url);
		if (pageState.main) {
			var path = pageState.main.path;
			var histItem = mPageState.getHistoryAsObject()[path];
			var range = pageState.main.range;
			if (!range) {
				// try to get range from history
				if (histItem) {
					range = histItem.range;
				}
			}
			var scroll = pageState.main.scroll;
			if (!scroll) {
				// try to get scroll from history
				if (histItem) {
					scroll = histItem.scroll;
				}
			}
			var target = findTarget(event);
			if (editor) {
				// if coming from sub-editor, we want to stay in same editor if no modifiers are used
				if (editor.type === EDITOR_TARGET.sub) {
					if (target === EDITOR_TARGET.sub) {
						target = EDITOR_TARGET.main;
					} else if (target === EDITOR_TARGET.main) {
						target = EDITOR_TARGET.sub;
					}
				}
			}
			navigate({path:path, range:range, scroll:scroll}, target, true);
		} else {
			// not a valid url
		}
		return false;
	};

	var switchEditors = function() {
		if (!editorUtils.getSubEditor()) {
			return false;
		}
		var mainEditor = editorUtils.getMainEditor();
		var subEditor = editorUtils.getSubEditor();
		
		var main_path = mainEditor.getFilePath();
		var main_scrollpos = $(mainEditor._domNode).find('.textview').scrollTop();
		var main_sel = mainEditor.getTextView().getSelection();
		var main_text = mainEditor.getText();
		var main_dirty = mainEditor.isDirty();
		
		var sub_path = subEditor.getFilePath();
		var sub_scrollpos = $(subEditor._domNode).find('.textview').scrollTop();
		var sub_sel = subEditor.getTextView().getSelection();
		var sub_text = subEditor.getText();
		var sub_dirty = subEditor.isDirty();
		
		// TODO This is not working when using the button to switch since
		// clicking on the button will call a blur() on the active editor
		var main_active = mainEditor.getTextView().hasFocus();
		
		navigate({path:main_path, range:[main_sel.start, main_sel.end], scroll:main_scrollpos}, EDITOR_TARGET.sub, true);
		navigate({path:sub_path, range:[sub_sel.start, sub_sel.end], scroll:sub_scrollpos}, EDITOR_TARGET.main, true);
		
		$(mainEditor._domNode).find('.textview').scrollTop(sub_scrollpos);
		$(subEditor._domNode).find('.textview').scrollTop(main_scrollpos);
		
		if (sub_dirty) {
			mainEditor.setText(sub_text);
		}
		if (main_dirty) {
			subEditor.setText(main_text);
		}
		
		setTimeout(function() {
			if (main_active) {
				subEditor.getTextView().focus();
			} else {
				mainEditor.getTextView().focus();
			}
		}, 200);
	};
	
	var toggleSidePanel = function() {
		var sidePanelOpen = mSidePanelManager.isSidePanelOpen();
		var mainEditor = editorUtils.getMainEditor();
		var subEditor = editorUtils.getSubEditor();
	
		storeAllState(true);
		if (sidePanelOpen) {
			mSidePanelManager.closeSidePanel();
		} else {
			// first, open side panel
			mSidePanelManager.showSidePanel();
			
			if (!mainEditor.getFilePath) {
				// no main editor, so nothing else to do
				return;
			}
			
			// now open file of main editor in side panel
			var sel = mainEditor.getSelection();
			navigate({
				path:mainEditor.getFilePath(),
				range:[sel.start, sel.end],
				scroll: $(mainEditor._domNode).find('.textview').scrollTop()
			}, "sub");
			subEditor = editorUtils.getSubEditor();
			subEditor.getTextView().focus();
		}
		
		storeAllState(false);
		return true;
	};
	
	/**
	 * Opens the given editor on the given definition
	 * @param {{String|Object}} modifier either EDITOR_TARGET.main, EDITOR_TARGET.sub, or EDITOR_TARGET.tab
	 * @param {{range:Array.<Number>,path:String}} definition
	 * @param {{Editor}} editor
	 */
	var openOnRange = function(modifier, definition, editor) {
		if (!definition.range && !definition.path) {
			return;
		}
		var defnrange = definition.range ? definition.range : [0,0];
		var filepath = definition.path ? definition.path : editor.getFilePath();
		
		var target;
		if (typeof modifier === "object") {
			target = findTarget(modifier);
		} else if (typeof modifier === "string") {
			target = modifier;
		}
		if (target) {
			if (editor) {
				// if coming from sub-editor, we want to stay in same editor if no modifiers are used
				if (editor.type === EDITOR_TARGET.sub) {
					if (target === EDITOR_TARGET.sub) {
						target = EDITOR_TARGET.main;
					} else if (target === EDITOR_TARGET.main) {
						target = EDITOR_TARGET.sub;
					}
				}
			}
			navigate({path:filepath, range:defnrange}, target, true);
		}
	};
	
	var setupPage = function(state, doSaveState) {
		if (doSaveState) {
			storeAllState(doSaveState);
		}

		if (!state.side) {
			if ($('#side_panel').css('display') !== 'none') {
				mSidePanelManager.closeSidePanel();
			}
		}
		
		// when navigating, don't store browser state, since that
		// is taken care of in this function
		if (state.main) {
			navigate(state.main, EDITOR_TARGET.main, false);
			if (state.side) {
				navigate(state.side, EDITOR_TARGET.sub, false);
			}
		} else {
			navigate(state, EDITOR_TARGET.main, false);
		}
		var mainItem  = state.main ? state.main : state;
		var subItem = state.side;
		if (doSaveState) {
			mPageState.storeBrowserState(mainItem, subItem);
		}
	};
	
	var storeAllState = function(doReplace) {
		var mainItem;
		var subItem;
		var mainEditor = editorUtils.getMainEditor();
		var subEditor = editorUtils.getSubEditor();
		mainItem = mPageState.generateHistoryItem(mainEditor);
		if (subEditor) {
			subItem = mPageState.generateHistoryItem(subEditor);
		}
		mPageState.storeBrowserState(mainItem, subItem, doReplace);
	};


	/**
	 * handles the onpopstate event
	 */
	var popstateHandler = function(event) {
		var state = event.originalEvent.state;
		if (state) {
			setupPage(state);
			return false;
		} else {
			return true;
		}
	};
		
	/**
	 * Navigates to a new editor
	 * @param {{path:String,range:Array.<Number>,scroll:Number}} editorDesc A description of the editor to open, including file path, selected range and scroll position
	 * @param {String} target the target of the navigation, either EDITOR_TARGET.main, EDITOR_TARGET.sub, or EDITOR_TARGET.tab for
	 * displaying in the main editor, the sub-editor or a new tab.  If a null or invalid value is passed
	 * there will be an attempt to guess the target
	 *
	 * @return {boolean} true if navigation occurred successfully and false otherwise.
	 */
	navigate = function(editorDesc, target, doSaveState) {
		var mainItem, filepath = editorDesc.path, range = editorDesc.range, scroll = editorDesc.scroll;
		var mainEditor = editorUtils.getMainEditor();
		var subEditor = editorUtils.getSubEditor();

		if (mainEditor) {
			// if any editor exists at all, save the state.
			mainItem = mPageState.generateHistoryItem(mainEditor);
			mPageState.storeScriptedHistory(mainItem);
			var sideItem;
			if (subEditor) {
				sideItem = mPageState.generateHistoryItem(subEditor);
				mPageState.storeScriptedHistory(sideItem);
			}
			
			// replace existing history with current page state (ie- update selection ranges and scroll pos
			if (doSaveState) {
				mPageState.storeBrowserState(mainItem, sideItem, true);
			}
		}

		if (target === EDITOR_TARGET.sub || target === EDITOR_TARGET.main) {
			var targetPane = mPaneFactory.getPane("scripted.editor", target === EDITOR_TARGET.main);
			var isSame = targetPane && targetPane.editor.getFilePath() === filepath;
			if (!isSame && targetPane && !mPaneFactory.confirmNavigation(targetPane)) {
				// user chose not to move from existing editor
				return false;
			}
			
			if (target === EDITOR_TARGET.sub && !mSidePanelManager.isSidePanelOpen()) {
				mSidePanelManager.showSidePanel();
			}
			if (!isSame) {
				// delete old editor if edists
				if (targetPane) {
					mPaneFactory.destroyPane(targetPane);
				}
				targetPane = mPaneFactory.createPane("scripted.editor", target, {
					filepath : editorDesc.path
				});
			}
			var targetEditor = targetPane.editor;

			if (range) {
				if (isNaN(range[0]) || isNaN(range[1])) {
					scriptedLogger.warn("invalid range, ignoring", scriptedLogger.SETUP);
					scriptedLogger.warn(range, scriptedLogger.SETUP);
				} else {
					targetEditor.getTextView().setSelection(range[0], range[1], true);
				}
			}
			
			if (scroll) {
				if (isNaN(range[0])) {
					scriptedLogger.warn("invalid scroll, ignoring", scriptedLogger.SETUP);
					scriptedLogger.warn(scroll, scriptedLogger.SETUP);
					scrollToSelection(targetEditor);
				} else {
					$(targetEditor._domNode).find('.textview').scrollTop(scroll);
				}
			} else {
				scrollToSelection(targetEditor);
			}

			if (target === EDITOR_TARGET.main) {
				// explicit check for false since navigator might be 'undefined' at this point
				if (window.scripted.navigator !== false) {
					// if model not yet available, highlighting is handled elsewhere.
					// TODO Yikes!  Yet another global variable.  We should make explorer non-global
					if (explorer.model) {
						explorer.highlight(filepath);
					}
				}
			}
			targetPane.updateContents(targetEditor);
			
			// now add a history entry for the new page state
			if (doSaveState) {
				mainEditor = editorUtils.getMainEditor();
				subEditor = editorUtils.getSubEditor();
				mPageState.storeBrowserState(
					mPageState.generateHistoryItem(mainEditor),
					subEditor ? mPageState.generateHistoryItem(subEditor) : null);
			}
			targetEditor.getTextView().focus();

		} else if (target === EDITOR_TARGET.tab) {
			// open editor in new tab
			window.open(mPageState.generateUrl({path:filepath, range:range}));
		}

		return false;
	};
	
	/**
	* Navigates to the given resource URL, opening it in the specified editor (main or sub). If no editor type is specified, it will open
	* it in the main editor by default.
	*/
	var navigateToURL = function(url, editorType) {
			var editorToOpen = !editorType ? EDITOR_TARGET.main : editorType;
			navigate({
				path: url
			}, editorToOpen, true);
		};
	
	return {
		navigateToURL: navigateToURL,
		handleNavigationEvent: handleNavigationEvent,
		popstateHandler: popstateHandler,
		setupPage: setupPage,
		switchEditors: switchEditors,
		toggleSidePanel: toggleSidePanel,
		openOnRange: openOnRange,
		storeAllState : storeAllState
	};
});

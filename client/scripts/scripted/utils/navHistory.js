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
define(["scripted/keybindings/keybinder", "scripted/editor/scriptedEditor", "orion/textview/keyBinding", "scripted/utils/pageState", "orion/searchClient", "scripted/widgets/OpenResourceDialog", "scripted/widgets/OpenOutlineDialog",
"scripted/fileSearchClient", "scripted/widgets/SearchDialog", "scripted/utils/os", 'lib/json5'], 
function(mKeybinder, mEditor, mKeyBinding, mPageState, mSearchClient, mOpenResourceDialog, mOpenOutlineDialog,
	mFileSearchClient, mSearchDialog, mOsUtils) {
	
	var EDITOR_TARGET = {
		main : "main",
		sub : "sub",
		tab : "tab"
	};
	var LINE_SCROLL_OFFSET = 5;
	var GET_URL = "http://localhost:7261/get?file=";
	var FS_LIST_URL = "http://localhost:7261/fs_list/";
	
	// define as forward reference
	var navigate;
	
	var findTarget = function(event) {
		var target;
		if (mOsUtils.isCtrlOrMeta(event)) {
			target = EDITOR_TARGET.tab;
		} else {
			var subNavigationDisabled = (window.editor.loadResponse === 'error') ? true : false;
			target = (event.shiftKey || event.makeShift) && !subNavigationDisabled ? EDITOR_TARGET.sub : EDITOR_TARGET.main;
		}
		return target;
	};

	
	var close_side = function(editor) {
		$('#side_panel').hide();
		$('#editor').css('margin-right', '0');
		if (editor && editor._textView) {
			editor._textView._updatePage();
		}
		$('#side_panel').trigger('close');
	};
	
	var open_side = function(editor) {
		var sidePanel = $('#side_panel');
		if ( sidePanel.css('display') === 'block') {
			return false;
		}
		sidePanel.show();
		// restore last size if known
		var storedWidth = localStorage.getItem("scripted.sideWidth");
		if (storedWidth) {
			sidePanel.width(storedWidth);
			sidePanel.resize();
		}
		$('#editor').css('margin-right', $('#side_panel').width());
		editor._textView._updatePage();
		sidePanel.trigger('open');

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


		
	var isBinary = function(path) {
		try {
			var xhrobj = new XMLHttpRequest();
			var url = GET_URL + path;
			xhrobj.open("GET", url, false); // synchronous xhr
			xhrobj.send();
			if (xhrobj.readyState === 4) {
				if (xhrobj.status === 204 || xhrobj.status === 1223) { //IE9 turns '204' status codes into '1223'...
					return true;
				} else {
					return false;
				}
			}
		} catch (e) {
			console.log("Error getting " + path);
			console.log(e);
			return true;
		}
		return false;
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
			if (isBinary(path)) {
				alert("Cannot open binary files");
				return false;
			}

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
		if (window.subeditors[0] === undefined) {
			return false;
		}
		var main_path = window.editor.getFilePath();
		var main_scrollpos = $(window.editor._domNode).find('.textview').scrollTop();
		var main_sel = window.editor.getTextView().getSelection();
		var main_text = window.editor.getText();
		var main_dirty = window.editor.isDirty();
		
		var sub_path = window.subeditors[0].getFilePath();
		var sub_scrollpos = $(window.subeditors[0]._domNode).find('.textview').scrollTop();
		var sub_sel = window.subeditors[0].getTextView().getSelection();
		var sub_text = window.subeditors[0].getText();
		var sub_dirty = window.subeditors[0].isDirty();
		
		// TODO This is not working when using the button to switch since 
		// clicking on the button will call a blur() on the active editor
		var main_active = window.editor.getTextView().hasFocus();
		
		navigate({path:main_path, range:[main_sel.start, main_sel.end], scroll:main_scrollpos}, EDITOR_TARGET.sub, true);
		navigate({path:sub_path, range:[sub_sel.start, sub_sel.end], scroll:sub_scrollpos}, EDITOR_TARGET.main, true);
		
		$(window.editor._domNode).find('.textview').scrollTop(sub_scrollpos);
		$(window.subeditors[0]._domNode).find('.textview').scrollTop(main_scrollpos);
		
		if (sub_dirty) {
			window.editor.setText(sub_text);
		}
		if (main_dirty) {
			window.subeditors[0].setText(main_text);
		}
		
		setTimeout(function() {
			if (main_active) {
				window.subeditors[0].getTextView().focus();
			} else {
				window.editor.getTextView().focus();
			}
		}, 200);
	};
	
	var confirmer;
	var _setNavigationConfirmer = function(callback) {
		confirmer = callback;
	};

	var confirmNavigation = function(editor) {
	
		if (editor && editor.isDirty()) {
			if (confirmer) {
				// non-blocking mode for tests
				confirmer(true);
				return true;
			} else {
				return confirm("Editor has unsaved changes.  Are you sure you want to leave this page?  Your changes will be lost.");
			}
		} else {
			if (confirmer) {
				confirmer(false);
			}
			return true;
		}
	};
	
	
	/**
	 * Opens the given editor on the given definition
	 * @param {{String|Object}} modifier either EDITOR_TARGET.main, EDITOR_TARGET.sub, or EDITOR_TARGET.tab
	 * @param {{range:List.<Number>,path:String}} definition
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

	function openOnClick(event, editor) {
		if (mOsUtils.isCtrlOrMeta(event)) {
			var rect = editor.getTextView().convert({x:event.pageX, y:event.pageY}, "page", "document");
			var offset = editor.getTextView().getOffsetAtLocation(rect.x, rect.y);
			var definition = editor.findDefinition(offset);
			if (definition) {
				openOnRange(event.shiftKey ? EDITOR_TARGET.sub : EDITOR_TARGET.main, definition, editor);
			}
		}
	}
	
	/**
	 * Adds one-time configuration to the main editor
	 * TODO Should go somewhere else
	 */
	var buildMaineditor = function() {
		$('#editor').click(function(event) {
			openOnClick(event, window.editor);
		});
	};
	
	var closeSidePanel = function() {
		if (window.subeditors && window.subeditors[0] && confirmNavigation(window.subeditors[0])) {
			$('.subeditor_wrapper').remove();
			window.subeditors.pop();
		}
		close_side(window.editor);
		// might be the dom element 'editor' or the actual editor so check for getTextview
		if (window.editor && window.editor.getTextView) {
			window.editor.getTextView().focus();
		}
	};

	var toggleSidePanel = function() {
		var sidePanelClosed = $('#side_panel').css('display') === 'none';
		var mainItem = mPageState.generateHistoryItem(window.editor);
		var subItem = sidePanelClosed ? null : mPageState.generateHistoryItem(window.subeditors[0]);
		mPageState.storeBrowserState(mainItem, subItem, true);
		if (sidePanelClosed) {
			var sel = window.editor.getSelection();
			var range = [sel.start, sel.end];
			navigate({path:window.editor.getFilePath(), range:range, 
					scroll:$(window.editor._domNode).find('.textview').scrollTop()}, EDITOR_TARGET.sub);
			window.subeditors[0].getTextView().focus();
		} else {
			closeSidePanel();
		}
		mainItem = mPageState.generateHistoryItem(window.editor);
		subItem = sidePanelClosed ? mPageState.generateHistoryItem(window.subeditors[0]) : null;
		mPageState.storeBrowserState(mainItem, subItem, false);
	};
	
	var fileEntryCompare = function(a, b) {
		a = a.name.toLowerCase();
		b = b.name.toLowerCase();
		if (a<b) {
			return +1;
		} else if (a>b) {
			return -1;
		} else {
			return 0;
		}
	};

	var buildSubeditor = function(filepath) {
		var filename = filepath.split('/').pop();
		
		// TODO move this html snippet to separate file
		var subeditor = 
		$('<div class="subeditor_wrapper">'+
			'<div class="subeditor_titlebar">'+
				'<span class="subeditor_title" title="'+filepath+'">'+filename+'</span>'+
				'<span class="subeditor_options">'+
					'<span class="subeditor_switch" title="Switch Subeditor and Main Editor"></span>'+
					'<span class="subeditor_close" title="Close Subeditor"></span>'+
				'</span>'+
			'</div>'+
			'<div class="subeditor scriptededitor"></div>'+
		'</div>');
		$('#side_panel').append(subeditor);
		
		var sideHeight = $('#side_panel').height();
		var subeditorMargin = parseInt($('.subeditor_wrapper').css('margin-top'), 10);
		
		$('.subeditor_wrapper').height(sideHeight - (subeditorMargin*2));
		$('.subeditor').height(
			$('.subeditor_wrapper').height() -
			$('.subeditor_titlebar').height()
		);
		
		// must reattach these handlers on every new subeditor open since we always delete the old editor
		$('.subeditor_close').click(toggleSidePanel);
		
		$('.subeditor_switch').click(switchEditors);
		
		$('.subeditor').click(function(event) {
			openOnClick(event, window.subeditors[0]);
		});
		return subeditor;
	};
	
	var initializeHistoryMenu = function() {
		var historyCrumb = $('#historycrumb');
		if (!historyCrumb.html()) {
			historyCrumb = $('<li id="historycrumb" data-id="-1"><span><img src="/images/icon.png" /></span></li>');
			$('#breadcrumb').append(historyCrumb);
		}		
		var historyMenu = $('<ul id="history_menu" class="breadcrumb_menu" data-id="-1"></ul>');
		historyMenu.css('left', historyCrumb.position().left);
		historyMenu.css('top', $('header').height() + $('#breadcrumb').height());
		$('#main').append(historyMenu);
		
		
		var history = mPageState.getHistory();
		
		for (var i = history.length-1; i >= 0; i--) {
			var newHistoryElem = $('<li></li>');
			var newHistoryAnchor = $("<a href='" + mPageState.generateUrl(history[i]) + "'>" + 
				history[i].path.split('/').pop() + '</a>');
			$(newHistoryAnchor).click(handleNavigationEvent);
			newHistoryElem.append(newHistoryAnchor);
			historyMenu.append(newHistoryElem);
		}
	};
	
	var initializeBreadcrumbs = function(path) {
		var root = window.fsroot;
	
//		$('#breadcrumb li:not(:first)').remove();
		$('.breadcrumb_menu').remove();
		$('#breadcrumb li').remove();

		initializeHistoryMenu();
		
		var crumbs = path.substring(1 + root.length, path.length).split('/'); // the first position is moved up by 1 for the trailing '/'
		crumbs.splice(0, 0, root);
		var constructedPath = "", newCrumbElem, xhrobj, url;
			
		for (var i = 0, len = crumbs.length; i < len; i++) {
			newCrumbElem = $('<li class="light_gradient" data-id="'+i+'"><span>' + crumbs[i] + '</span></li>');
			$('#breadcrumb').append(newCrumbElem);	

			if (i + 1 === len) { 
				constructedPath += crumbs[i];
			} else {
				constructedPath += crumbs[i] + '/';
				url = FS_LIST_URL + constructedPath.substring(0, constructedPath.length-1);
				xhrobj = new XMLHttpRequest();
				xhrobj.open("GET",url,false); // TODO naughty? synchronous xhr
				xhrobj.send();
				var kids = JSON5.parse(xhrobj.responseText).children;
				if (kids) {

					kids.sort(fileEntryCompare);

					var newMenu = $('<ul class="breadcrumb_menu" data-id="'+i+'"></ul>');
					for(var j = 0; j < kids.length; j++) {
						if (kids[j].directory === false) {
							if (kids[j].name.lastIndexOf('.',0)!==0) {
								var href = mPageState.generateUrl(kids[j].Location);
								var newMenuItem = $('<li></li>');
								var newMenuAnchor = $("<a href='"+href+"'>"+kids[j].name+'</a>');
								newMenuItem.append(newMenuAnchor);
								newMenu.prepend(newMenuItem);

								$(newMenuAnchor).click(handleNavigationEvent);
							}
						}
					}
					newMenu.css('left', newCrumbElem.position().left);
					newMenu.css('min-width', newCrumbElem.outerWidth());
					newMenu.css('top', $('header').height() + $('#breadcrumb').height());
					$('#main').append(newMenu);
				}
			}
		}

		var id;
		
		$('#breadcrumb > li').on('mouseenter', function(evt) {
			id = $(this).attr('data-id');
			$('.breadcrumb_menu[data-id='+id+']').css('left', $(this).position().left);
			$('.breadcrumb_menu[data-id='+id+']').show();
		});

		$('#breadcrumb > li').on('mouseleave', function(evt) {
			id = $(this).attr('data-id');
			if (evt.pageY < this.offsetTop + $(this).outerHeight()) { 
				$('.breadcrumb_menu[data-id='+id+']').hide();
			}
		});
		
		$('.breadcrumb_menu').on('mouseleave', function(evt) {
			$(this).hide();
		});

		$('.breadcrumb_menu > li').hover(function() {
			$(this).addClass('light_gradient_active');
			$(this).removeClass('light_gradient');
		}, function() {
			$(this).addClass('light_gradient');
			$(this).removeClass('light_gradient_active');
		});
	};
	
	// Need to load searcher here instead of scriptedEditor.js to avoid circular dependencies
	// Before : scriptedEditor.js -> searchClient.js -> navHistory.js -> scriptedEditor.js : BAD
	
	var attachSearchClient = function(editor) {
	
		var searcher = new mSearchClient.Searcher({
			serviceRegistry: null,
			commandService: null,
			fileService: null
		});

		// from globalCommands.js
		var openResourceDialog = function(searcher, serviceRegistry, editor) {
			var dialog = new scripted.widgets.OpenResourceDialog({
				searcher: searcher,
				searchRenderer: searcher.defaultRenderer,
				favoriteService: null,
				changeFile: handleNavigationEvent,
				editor: editor
			});
			if (editor) {
				dojo.connect(dialog, "onHide", function() {
//					editor.getTextView().focus(); // focus editor after dialog close, dojo's doesnt work
				});
			}
			window.setTimeout(function() {
				dialog.show();
			}, 0);
		};
		
		if (editor) {
			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("f", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Find File Named...");
			editor.getTextView().setAction("Find File Named...", function() {
				openResourceDialog(searcher, null, editor);
				return true;
			});		
		} else {
			$('body').on('keydown', function(evt) {
				if (evt.shiftKey && evt.ctrlKey && evt.which === 70 /*F*/) {
					openResourceDialog(searcher, null, null);
					return true;
				}
			});
		}
	};
	
	var attachOutlineClient = function(editor) {

		// from globalCommands.js
		var openOutlineDialog = function(searcher, serviceRegistry, editor) {
			var dialog = new scripted.widgets.OpenOutlineDialog({
				// TODO FIXADE Do we need this?
//				changeFile: handleNavigationEvent,
				editor: editor
			});
			if (editor) {
				dojo.connect(dialog, "onHide", function() {
//					editor.getTextView().focus(); // focus editor after dialog close, dojo's doesnt work
				});
			}
			window.setTimeout(function() {
				dialog.show();
			}, 0);
		};
		
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("o", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Show Outline");
		editor.getTextView().setAction("Show Outline", function() {
			openOutlineDialog(null,/*searcher,*/ null, editor);
			return true;
		});		
	};
	

	// TODO move to scriptedEditor.js
	var attachFileSearchClient = function(editor) {
	
		var fileSearcher = new mFileSearchClient.FileSearcher({
		});
	
		var openFileSearchDialog = function(editor) {
			var dialog = new scripted.widgets.SearchDialog({
				editor: editor,
				fileSearcher: fileSearcher,
				fileSearchRenderer: fileSearcher.defaultRenderer,
				style:"width:800px",
				openOnRange: openOnRange
			});
			
			//TODO we should explicitly set focus to the previously active editor if the dialog has been canceled
//			if (editor) {
//				dojo.connect(dialog,"onHide", function() {
//					editor.getTextView().focus(); // focus editor after dialog closed
//				});
//			}
			window.setTimeout(function() {
				dialog.show();
			},0);
		};
		
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("l",/*CMD/CTRL*/true,/*SHIFT*/true,/*ALT*/false),"Look in files");
		editor.getTextView().setAction("Look in files",function() {
			openFileSearchDialog(editor);
		});
	};
	
	
	// TODO move to scriptedEditor.js
	var attachDefinitionNavigation = function(editor) {
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ false, /*shift*/ false, /*alt*/ false), "Open declaration in same editor");
		editor.getTextView().setAction("Open declaration in same editor", function() { 
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				openOnRange(EDITOR_TARGET.main, definition, editor);
			}
		});
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ true, /*shift*/ false, /*alt*/ false), "Open declaration in new tab");
		editor.getTextView().setAction("Open declaration in new tab", function() {
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				openOnRange(EDITOR_TARGET.tab, definition, editor);
			}
		});
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ false, /*shift*/ true, /*alt*/ false), "Open declaration in other editor");
		editor.getTextView().setAction("Open declaration in other editor", function() {
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				openOnRange(EDITOR_TARGET.sub, definition, editor);
			}
		});
	};
	
	// TODO move to scriptedEditor.js
	var attachEditorSwitch = function(editor) {
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("s", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Switch Subeditor and Main Editor");
		editor.getTextView().setAction("Switch Subeditor and Main Editor", switchEditors);
		
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("e", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Toggle Subeditor");
		editor.getTextView().setAction("Toggle Subeditor", toggleSidePanel);
	};
	
	/**
	 * Adds a listener to the browser to update page state when the state of an editor changes
	 */
	var installPageStateListener = function(editor) {
		var currentRequest;
		function selListener(evt) {
			if (currentRequest) {
				clearTimeout(currentRequest);
			}
			currentRequest = setTimeout(function() {
				var mainItem = mPageState.generateHistoryItem(window.editor);
				var subItem = window.subeditors && window.subeditors.length > 0 ? mPageState.generateHistoryItem(window.subeditors[0]) : null;
				mPageState.storeBrowserState(mainItem, subItem, true);
			}, 1000);
			
		}
		editor.getTextView().addEventListener("Selection", selListener);
	};

	
	/**
	 * This handles initial page load
	 */
	var loadEditor = function(filepath, domNode, type) {
		if (!type) {
			type = "main";
		}
		if (!domNode) {
			domNode = $('#editor')[0];
		}
		$(domNode).show();
		$('body').off('keydown');
		var editor = mEditor.makeEditor(domNode, filepath, type);
		if (editor.loadResponse === 'error') {
			$(domNode).hide();
			attachSearchClient(null);
			closeSidePanel();
			return editor;
		}
		
		// TODO move to scriptedEditor.js
		attachSearchClient(editor);
		attachOutlineClient(editor);
		attachDefinitionNavigation(editor);
		attachFileSearchClient(editor);
		attachEditorSwitch(editor);
		mKeybinder.installOn(editor); //Important: keybinder should be installed after all other things
		                              //that register keybindings to the editor.
		editor.cursorFix();
		
		if (type === 'main') {
			setTimeout(function() {
				editor.getTextView().focus();
			}, 5);
		}
		
		installPageStateListener(editor);
		return editor;
	};
	
	var setupPage = function(state, doSaveState) {
		var mainItem;
		var subItem;
		var hasMainEditor = window.editor && window.editor.getText;
		if (doSaveState && hasMainEditor) {
			var hasSubEditor = hasMainEditor && window.subeditors.length > 0;
			mainItem = mPageState.generateHistoryItem(window.editor);
			if (hasSubEditor) {
				subItem = mPageState.generateHistoryItem(window.subeditors[0]);
			}
			
			// replace existing history with current page state (ie- update selection ranges and scroll pos
			mPageState.storeBrowserState(mainItem, subItem, true);
		}

		if (!state.side) {
			if ($('#side_panel').css('display') !== 'none') {
				closeSidePanel();
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
		mainItem  = state.main ? state.main : state;
		subItem = state.side;
		if (doSaveState) {
			mPageState.storeBrowserState(mainItem, subItem);
		}
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
	 * @param {String} filepath the path to the target file
	 * @param {Array.<Number>} range 2 element array specifying offset and length of target selection
	 * @param {String} target the target of the navigation, either EDITOR_TARGET.main, EDITOR_TARGET.sub, or EDITOR_TARGET.tab for 
	 * displaying in the main editor, the sub-editor or a new tab.  If a null or invalid value is passed
	 * there will be an attempt to guess the target
	 *
	 * @return {boolean} true if navigation occurred successfully and false otherwise.
	 */
	navigate = function(editorDesc, target, doSaveState) {
		var mainItem, filepath = editorDesc.path, range = editorDesc.range, scroll = editorDesc.scroll;
		// check if the editor has been created yet, or if
		// window.editor is a dom node
		var hasMainEditor = window.editor && window.editor.getText;
		var hasSubEditor = hasMainEditor && window.subeditors.length > 0;
		if (hasMainEditor) {
			mainItem = mPageState.generateHistoryItem(window.editor);
			mPageState.storeScriptedHistory(mainItem);
			var sideItem;
			if (hasSubEditor) {
				sideItem = mPageState.generateHistoryItem(window.subeditors[0]);
				mPageState.storeScriptedHistory(sideItem);
			}
			
			// replace existing history with current page state (ie- update selection ranges and scroll pos
			if (doSaveState) {
				mPageState.storeBrowserState(mainItem, sideItem, true);
			}
		}

		if (target === EDITOR_TARGET.sub || target === EDITOR_TARGET.main) {
			var targetEditor = target === EDITOR_TARGET.main ? window.editor : window.subeditors[0];
			var hasEditor = targetEditor && targetEditor.getText;
			var isSame = hasEditor && targetEditor.getFilePath() === filepath;
			if (!isSame && hasEditor && !confirmNavigation(targetEditor)) {
				return false;
			}
			
			// this is annoying...the targetEditor is destroyed and recreated here so can't get the dom node undil after this if statement
			if (target === EDITOR_TARGET.sub && !isSame) {
				open_side(window.editor);
				$('.subeditor_wrapper').remove();
				buildSubeditor(filepath);
			}
			var domNode = target === EDITOR_TARGET.main ? $('#editor') : $('.subeditor');
			if (target === EDITOR_TARGET.main) {
				if (!hasEditor) {
					buildMaineditor(filepath);
				}
				domNode.css('display','block');
			}

			if (!hasEditor || !isSame) {
				targetEditor = loadEditor(filepath,  domNode[0], target);
			}

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
					if (explorer.model) {
						explorer.highlight(filepath);
					}
				}
				initializeBreadcrumbs(filepath);
				window.editor = targetEditor;
			} else {
				window.subeditors[0] = targetEditor;
				initializeHistoryMenu();
			}
			
			// now add a history entry for the new page state
			if (doSaveState) {
				mPageState.storeBrowserState(
					mPageState.generateHistoryItem(window.editor), 
					window.subeditors && window.subeditors.length > 0 ? mPageState.generateHistoryItem(window.subeditors[0]) : null);
			}
			targetEditor.getTextView().focus();

		} else if (target === EDITOR_TARGET.tab) {
			window.open(mPageState.generateUrl({path:filepath, range:range}));
		}

		return false;
	};
	
	return {
		// private functions that are only exported to help with testing
		_loadEditor: loadEditor,
		_setNavigationConfirmer : _setNavigationConfirmer,
		
//		highlightSelection: highlightSelection,  don't think we need this
		openOnRange: openOnRange,
		initializeBreadcrumbs: initializeBreadcrumbs,
		handleNavigationEvent: handleNavigationEvent,
		popstateHandler: popstateHandler,
		toggleSidePanel: toggleSidePanel,
		setupPage: setupPage,
		closeSidePanel: closeSidePanel
	};
});

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
 *    Andrew Eisenberg - initial implementation
 *     Chris Johnson - functions
 ******************************************************************************/

// implements the pane interface for editors
/*global scripted JSON5 dojo confirm*/
/*jslint browser:true */
define(["scripted/keybindings/keybinder", "scripted/editor/scriptedEditor", "scripted/pane/paneFactory", "scripted/utils/navHistory", "orion/textview/keyBinding", "scripted/utils/pageState", "orion/searchClient", "scripted/dialogs/openResourceDialog", "scripted/widgets/OpenOutlineDialog",
"scripted/fileSearchClient", "scripted/widgets/SearchDialog", "scripted/utils/os", 'lib/json5', 'jquery'],
function(mKeybinder, mEditor, mPaneFactory, mNavHistory, mKeyBinding, mPageState, mSearchClient, mOpenResourceDialog, mOpenOutlineDialog,
	mFileSearchClient, mSearchDialog, mOsUtils) {

	var FS_LIST_URL = "http://localhost:7261/fs_list/";
	// FIXADE copied from navhistory
	var EDITOR_TARGET = {
		main : "main",
		sub : "sub",
		tab : "tab"
	};

	function openOnClick(event, editor) {
		if (mOsUtils.isCtrlOrMeta(event)) {
			var rect = editor.getTextView().convert({x:event.pageX, y:event.pageY}, "page", "document");
			var offset = editor.getTextView().getOffsetAtLocation(rect.x, rect.y);
			var definition = editor.findDefinition(offset);
			if (definition) {
				mNavHistory.openOnRange(event.shiftKey ? EDITOR_TARGET.sub : EDITOR_TARGET.main, definition, editor);
			}
		}
	}
	
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
			$(newHistoryAnchor).click(mNavHistory.handleNavigationEvent);
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

								$(newMenuAnchor).click(mNavHistory.handleNavigationEvent);
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

		if (editor) {
			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("f", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Find File Named...");
			editor.getTextView().setAction("Find File Named...", function() {
				mOpenResourceDialog.openDialog(searcher, editor, mNavHistory.handleNavigationEvent);
				return true;
			});
		} else {
			$('body').on('keydown', function(evt) {
				if (evt.shiftKey && evt.ctrlKey && evt.which === 70 /*F*/) {
					mOpenResourceDialog.openDialog(searcher, null, null);
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
//				changeFile: mNavHistory.handleNavigationEvent,
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

	var attachFileSearchClient = function(editor) {

		var fileSearcher = new mFileSearchClient.FileSearcher({
		});

		var openFileSearchDialog = function(editor) {
			var dialog = new scripted.widgets.SearchDialog({
				editor: editor,
				fileSearcher: fileSearcher,
				fileSearchRenderer: fileSearcher.defaultRenderer,
				style:"width:800px",
				openOnRange: mNavHistory.openOnRange
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
			return true;
		});
	};


	var attachDefinitionNavigation = function(editor) {
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ false, /*shift*/ false, /*alt*/ false), "Open declaration in same editor");
		editor.getTextView().setAction("Open declaration in same editor", function() {
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				mNavHistory.openOnRange(EDITOR_TARGET.main, definition, editor);
			}
		});
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ true, /*shift*/ false, /*alt*/ false), "Open declaration in new tab");
		editor.getTextView().setAction("Open declaration in new tab", function() {
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				mNavHistory.openOnRange(EDITOR_TARGET.tab, definition, editor);
			}
		});
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ false, /*shift*/ true, /*alt*/ false), "Open declaration in other editor");
		editor.getTextView().setAction("Open declaration in other editor", function() {
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				mNavHistory.openOnRange(EDITOR_TARGET.sub, definition, editor);
			}
		});
	};

	var attachEditorSwitch = function(editor) {
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("s", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Switch Subeditor and Main Editor");
		editor.getTextView().setAction("Switch Subeditor and Main Editor", mNavHistory.switchEditors);

		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("e", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Toggle Subeditor");
		editor.getTextView().setAction("Toggle Subeditor", mNavHistory.toggleSidePanel);
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
	 * Adds one-time configuration to the main editor
	 */
	var buildMainEditor = function() {
		var domNode = $('#editor');
		domNode.click(function(event) {
			openOnClick(event, window.editor);
		});
		$(document).on('sidePanelClosed.mainEditor', function(event) {
			// ensure that the main editor goes back to full size
			domNode.css('margin-right', '0');
		});
		$(document).on('sidePanelShown.mainEditor', function(event) {
			// ensure that the main editor goes back to full size
			domNode.css('margin-right', $('#side_panel').width());
		});
		domNode.css('display','block');
		return domNode;
	};

	
	var buildSubEditor = function(filepath, evtName) {
		var filename = filepath.split('/').pop();
		// remove this html snippet to separate file
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
		var domNode = $('.subeditor');
		
		var sideHeight = $('#side_panel').height();
		var subeditorMargin = parseInt($('.subeditor_wrapper').css('margin-top'), 10);
		
		$('.subeditor_wrapper').height(sideHeight - (subeditorMargin*2));
		domNode.height(
			$('.subeditor_wrapper').height() -
			$('.subeditor_titlebar').height()
		);
		
		// must reattach these handlers on every new subeditor open since we always delete the old editor
		$('.subeditor_close').on('click.' + evtName, mNavHistory.toggleSidePanel);
		$('.subeditor_switch').on('click.' + evtName, mNavHistory.switchEditors);
		
		domNode.click(function(event) {
			openOnClick(event, window.subeditors[0]);
		});
		return domNode;
	};

	var EditorPane = function(options) {
		var filepath = options.filepath, kind = options.kind;
		if (!kind) {
			kind = EDITOR_TARGET.main;
		}
		this.evtName = Date.now();
		var domNode;
		if (kind === EDITOR_TARGET.main) {
			domNode = buildMainEditor();
		} else {
			domNode = buildSubEditor(filepath, this.evtName);
		}
		
		domNode.show();
		$('body').off('keydown');
		var editor = mEditor.makeEditor(domNode[0], filepath, kind);
		if (editor.loadResponse === 'error') {
			domNode.hide();
			attachSearchClient(null);
			return editor;
		}
		
		attachSearchClient(editor);
		attachOutlineClient(editor);
		attachDefinitionNavigation(editor);
		attachFileSearchClient(editor);
		attachEditorSwitch(editor);
		mKeybinder.installOn(editor); //Important: keybinder should be installed after all other things
		                              //that register keybindings to the editor.
		editor.cursorFix();
		
		if (kind === EDITOR_TARGET.main) {
			setTimeout(function() {
				editor.getTextView().focus();
			}, 5);
		}
		
		installPageStateListener(editor);
		this.editor = editor;
		this.kind = kind;
	};

	EditorPane.prototype = {
		/**
		 * Pane API
		 */
		destroy : function() {
			if (this.isMain) {
				$(document).off('sidePanelClosed.mainEditor');
				$(document).off('sidePanelShown.mainEditor');
				delete window.editor;
			} else {
				$('.subeditor_close').off('click.' + this.evtName, mNavHistory.toggleSidePanel);
				$('.subeditor_switch').off('click.' + this.evtName, mNavHistory.switchEditors);
				$('.subeditor_wrapper').remove();
				window.subeditors = [];
			}
		},
		/**
		 * Pane API
		 */
		isDirty : function() {
			return this.editor.isDirty();
		},
		
		/**
		 * Pane API
		 * @return true iff pane can be navigated away from.  typically opens a dialog for user to click through.
		 */
		confirm : function() {
			return confirm("Editor has unsaved changes.  Are you sure you want to leave this page?  Your changes will be lost.");
		},
		
		/**
		 * Pane API
		 */
		updateContents : function(newContents) {
			this.editor = newContents;
			if (this.kind === EDITOR_TARGET.main) {
				initializeBreadcrumbs(newContents.getFilePath());
				window.editor = newContents;
			} else {
				window.subeditors[0] = newContents;
				initializeHistoryMenu();
			}
		}
	};

	mPaneFactory.registerPane("scripted.editor", function(options) {
		return new EditorPane(options);
	});
	
	
	return {
		
	};
});
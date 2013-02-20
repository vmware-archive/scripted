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
 *      Andy Clement
 *      Tony Georgiev - https://github.com/scripted-editor/scripted/pull/183
 ******************************************************************************/

// implements the pane interface for editors
/*global scripted JSON5 dojo confirm define $*/
/*jslint browser:true */
define(["scripted/keybindings/keybinder", "scripted/editor/scriptedEditor", "scripted/pane/paneFactory", "scripted/utils/navHistory",
"orion/textview/keyBinding", "scripted/utils/pageState", "scripted/dialogs/openResourceDialog", "scripted/dialogs/outlineDialog",
"scripted/dialogs/lookInFilesDialog", "scripted/utils/os", "scripted/utils/behaviourConfig", 'when', 'lib/json5', 'jquery'],
function(mKeybinder, mEditor, mPaneFactory, mNavHistory, mKeyBinding, mPageState, mOpenResourceDialog, mOutlineDialog,
	mLookInFilesDialog, mOsUtils, behaviourConfig, when) {

	var FS_LIST_URL = "/fs_list/";
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

	var initializeBreadcrumbsTimeout;

	var initializeBreadcrumbs = function(path) {
		if (behaviourConfig.getAsyncBreadcrumbConstruction()) {
			clearTimeout(initializeBreadcrumbsTimeout);
			initializeBreadcrumbsTimeout = setTimeout(function() {
				initializeBreadcrumbsActual(path);
			},300);
		} else {
			initializeBreadcrumbsActual(path);
		}
	};


	var initializeBreadcrumbsActual = function(path) {
		var autoActivation = (window.scripted &&
			window.scripted.config &&
			window.scripted.config.ui &&
			window.scripted.config.ui.auto_activation)
			|| 500;

		var root = window.fsroot;

		$('.breadcrumb_menu').remove();
		$('#breadcrumb li').remove();

		initializeHistoryMenu();

		var start = root.length;
		if (root[root.length-1]!=='/') {
			// the first position is moved up by 1 for the separating '/'
			start++;
		}
		var crumbs = path.substring(start, path.length).split('/');
		crumbs.splice(0, 0, root);
		var constructedPath = "", newCrumbElem, xhrobj, url;

		for (var i = 0, len = crumbs.length; i < len; i++) {
			// Uncomment when the tests bloody well behave with this change in, stupid things.
//			if (i===0 && crumbs[i]===window.fsroot) {
//				continue;
//			}
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

		var openRequests = {};
		var closeRequests = {};

		// breadcrumb enter will open drop-down after auto-activation time
		$('#breadcrumb > li').on('mouseenter', function(evt) {
			var self = this;
			var id = $(self).attr('data-id');
			if (closeRequests[id]) {
				window.clearTimeout(closeRequests[id]);
				delete closeRequests[id];
			} else {
				openRequests[id] = setTimeout(function() {
					$('.breadcrumb_menu[data-id='+id+']').css('left', $(self).position().left);
					$('.breadcrumb_menu[data-id='+id+']').show();
					delete openRequests[id];
				}, autoActivation);
			}
		});

		// breadcrumb leave will close drop-down after auto-activation time
		$('#breadcrumb > li').on('mouseleave', function(evt) {
			var self = this;
			var id = $(self).attr('data-id');
			if (openRequests[id]) {
				window.clearTimeout(openRequests[id]);
				delete openRequests[id];
			} else {
				closeRequests[id] = setTimeout(function() {
					if (evt.pageY < self.offsetTop + $(self).outerHeight()) {
						$('.breadcrumb_menu[data-id='+id+']').hide();
					}
					delete closeRequests[id];
				}, autoActivation);
			}
		});

		// breadcrumb drop-down enter will stop the auto-close of drop-down
		$('.breadcrumb_menu').on('mouseenter', function(evt) {
			var self = this;
			var id = $(self).attr('data-id');
			if (closeRequests[id]) {
				window.clearTimeout(closeRequests[id]);
				delete closeRequests[id];
			}
		});

		// breadcrumb drop-down leave will auto-close the drop-down after auto-activation time
		$('.breadcrumb_menu').on('mouseleave', function(evt) {
			var self = this;
			var id = $(self).attr('data-id');
			if (openRequests[id]) {
				window.clearTimeout(openRequests[id]);
				delete openRequests[id];
			} else {
				closeRequests[id] = setTimeout(function() {
					$(self).hide();
					delete closeRequests[id];
				}, autoActivation);
			}
		});

		$('.breadcrumb_menu > li').hover(function() {
			$(this).addClass('light_gradient_active');
			$(this).removeClass('light_gradient');
		}, function() {
			$(this).addClass('light_gradient');
			$(this).removeClass('light_gradient_active');
		});

		// event raise async so that event handlers can be
		// added after the initial call to initializing breadcrumbs
		setTimeout(function() {
			$(document).trigger('breadcrumbsInitialized');
		});
	};

	var attachSearchClient = function(editor) {

		if (editor) {
			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("f", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Find File Named...");
			editor.getTextView().setAction("Find File Named...", function() {
				mOpenResourceDialog.openDialog(editor, mNavHistory.handleNavigationEvent);
				return true;
			});
		} else {
			$('body').on('keydown', function(evt) {
				if (evt.shiftKey && evt.ctrlKey && evt.which === 70 /*F*/) {
					mOpenResourceDialog.openDialog(null, null);
					return true;
				}
			});
		}
	};

	var attachOutlineClient = function(editor) {
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("o", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Show Outline");
		editor.getTextView().setAction("Show Outline", function() {
			mOutlineDialog.openDialog(editor);
			return true;
		});
	};

	var attachFileSearchClient = function(editor) {
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("l",/*CMD/CTRL*/true,/*SHIFT*/true,/*ALT*/false),"Look in files");
		editor.getTextView().setAction("Look in files",function() {
			mLookInFilesDialog.openDialog(editor, mNavHistory.openOnRange);
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
				mNavHistory.storeAllState(true);
			}, 1000);

		}
		editor.getTextView().addEventListener("Selection", selListener);
	};

	/**
	 * Adds one-time configuration to the main editor
	 */
	var attachEventHandlers = function(editor, domNode, isMain) {
		if (isMain) {
			domNode.click(function(event) {
				openOnClick(event, editor);
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
		} else {
			domNode.click(function(event) {
				openOnClick(event, editor);
			});
		}
	};


	var buildSubEditor = function(filepath, evtName) {
		var filename = filepath.split('/').pop();
		// remove this html snippet to separate file
		var subeditorHTML =
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

		$('#side_panel').append(subeditorHTML);
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

		return domNode;
	};

	var EditorPane = function(options) {
		var filepath = options.filepath, kind = options.kind;
		if (!kind) {
			kind = EDITOR_TARGET.main;
		}
		this.evtName = Date.now();
		var domNode;
		var titleNode; // TODO could be the node rather than just the selector, check on usage
		if (kind === EDITOR_TARGET.main) {
			domNode = $('#editor');
			titleNode = '#breadcrumb';
		} else {
			domNode = buildSubEditor(filepath, this.evtName);
			// TODO work to do here when multiple subeditors
			titleNode = '.subeditor_titlebar';
		}

		domNode.show();
		var editor = mEditor.makeEditor(domNode[0], filepath, kind);
		editor._titleNode = titleNode;
		attachEventHandlers(editor, domNode, kind === EDITOR_TARGET.main);

		$('body').off('keydown');
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
			var self = this;
			setTimeout(function() {
				self.setFocus();
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
			} else {
				$('.subeditor_close').off('click.' + this.evtName, mNavHistory.toggleSidePanel);
				$('.subeditor_switch').off('click.' + this.evtName, mNavHistory.switchEditors);
				$('.subeditor_wrapper').remove();
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
			// bad? creating a new promise, what about those holding on to old promises?
			this.editor = newContents;
			if (this.kind === EDITOR_TARGET.main) {
				initializeBreadcrumbs(newContents.getFilePath());
			} else {
				initializeHistoryMenu();
				// raise event asynchronously so that event handlers
				// can be added
				setTimeout(function() {
					$(document).trigger('breadcrumbsInitialized');
				});
			}
		},

		setFocus : function() {
			this.editor.getTextView().focus();
		}
	};

	mPaneFactory.registerPane("scripted.editor", function(options) {
		return new EditorPane(options);
	});


	return {
		// exposed for testing
		_initializeBreadcrumbs : initializeBreadcrumbsActual
	};
});

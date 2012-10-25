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
/*global window setTimeout define explorer document console location XMLHttpRequest alert confirm orion scripted dojo $ localStorage*/
define(["scripted/editor/scriptedEditor", "orion/textview/keyBinding", "orion/searchClient", "scripted/widgets/OpenResourceDialog", "scripted/widgets/OpenOutlineDialog",
"scripted/fileSearchClient", "scripted/widgets/SearchDialog"], 
function(mEditor, mKeyBinding, mSearchClient, mOpenResourceDialog, mOpenOutlineDialog,
	mFileSearchClient, mSearchDialog) {
	
	var EDITOR_TARGET = {
		main : "main",
		sub : "sub",
		tab : "tab"
	};
	var LINE_SCROLL_OFFSET = 5;
	
	// define as forward reference
	var navigate;
	
	var isMac = navigator.platform.indexOf("Mac") !== -1;
	
	var findTarget = function(event) {
		var target;
		if ((isMac && event.metaKey) || (!isMac && event.ctrlKey)) {
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
		editor._textView._updatePage();
	};
	
	var open_side = function(editor) {
		if ( $('#side_panel').css('display') === 'block') { return false; }
		$('#side_panel').show();
		$('#editor').css('margin-right', $('#side_panel').width());
		editor._textView._updatePage();
	};
	
	var scrollDefinition = function(editor) {
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
	 * Retrieves the history from local storage
	 * @return {Array.<{filename:string,filepath:string,range:Array.<Number>,posiiion,url:string}>}
	 */
	var getHistory = function() {
		var historyJSON = localStorage.getItem("scriptedHistory");
		if (!historyJSON) {
			historyJSON = "[]";
		}
		return JSON.parse(historyJSON);
	};
	
	var setHistory = function(history) {
		localStorage.setItem("scriptedHistory", JSON.stringify(history));
	};
	
	
	/**
	 * generates an item to be stored in scriptedHistory as well as browser state
	 */
	var generateHistoryItem = function(editor) {
		var filepath = editor.getFilePath();
		var scrollPos = $(editor._domNode).find('.textview').scrollTop();
		var selection = editor.getSelection();
		var url = window.location.pathname + '?' + filepath + "#" + selection.start + "," + selection.end;
		return {
			filename: filepath.split('/').pop(),
			filepath: filepath,
			range: [selection.start, selection.end],
			position: scrollPos,
			url: url
		};
	};
	
	
	var storeScriptedHistory = function(histItem) {
		var scriptedHistory = getHistory();
		for (var i = 0; i < scriptedHistory.length; i++) {
			if (scriptedHistory[i].filepath === histItem.filepath) {
				scriptedHistory.splice(i,1);
			}
		}
		scriptedHistory.push(histItem);
		
		// arbitrarily keep track of 8 scriptedHistory items
		// TODO should we have a .scripted setting to customize this?
		while (scriptedHistory.length > 8) {
			scriptedHistory.shift();
		}
		
		setHistory(scriptedHistory);
	};
	
	var storeBrowserState = function(histItem, doReplace) {
		try {
			if (doReplace) {
				window.history.replaceState(histItem, histItem.filename, histItem.url);
			} else {
				window.history.pushState(histItem, histItem.filename, histItem.url);
			}
		} catch (e) {
			console.log(e);
		}
	};
		
	var isBinary = function(filepath) {
		try {
			var xhrobj = new XMLHttpRequest();
			var url = 'http://localhost:7261/get?file=' + filepath;
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
			console.log(filepath);
			console.log(e);
			return true;
		}
		return false;
	};


	/*
		This handles navigations from
			-Navigator
			-Breadcrumb
			-Open File
	*/
	var navigationEventHandler = function(event) {
		var filepath = event.testTarget ? event.testTarget : (
			event.altTarget ? $(event.altTarget).attr('href') : $(event.currentTarget).attr('href'));
		var query_index = filepath.indexOf('?');
		if (query_index !== -1) {
			filepath = filepath.substring(query_index+1, filepath.length);
		}
		
		var hashIndex = filepath.indexOf('#');
		var range;
		if (hashIndex !== -1) {
			try {
				range = JSON.parse("[" + filepath.substring(hashIndex+1) + "]");
			} catch (e) {
				console.log("Invalid hash: " + filepath);
			}
			filepath = filepath.substring(0, hashIndex);
		}
		
		if (isBinary(filepath)) {
			alert("Cannot open binary files");
			return false;
		}
		
		var target = findTarget(event);
		navigate(filepath, range, target, true);	
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
		
		navigate(main_path, [main_sel.start, main_sel.end], EDITOR_TARGET.sub, true);
		navigate(sub_path, [sub_sel.start, sub_sel.end], EDITOR_TARGET.main, true);
		
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
	
	var confirmNavigation = function(editor) {
		if (editor && editor.isDirty()) {
			return confirm("Editor has unsaved changes.  Are you sure you want to leave this page?  Your changes will be lost.");
		} else {
			return true;
		}
	};
	
	var highlightSelection  = function(editor) {	
		try{
			var loc = JSON.parse("[" + location.hash.substring(1) + "]");
			if (loc && loc.constructor === Array && loc.length > 0) {
				var start = loc[0];
				var end = loc.length > 1 ? loc[1] : start;
				editor.getTextView().setSelection(start, end, true);
				scrollDefinition(editor);
			}
		} catch (e) {
			console.log("Could not navigate to location specified in hash. Hash value: " + location.hash);
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
		
		$('.subeditor_close').click(function() {
			if (window.subeditors[0] && confirmNavigation(window.subeditors[0])) {
				$('.subeditor_wrapper').remove();
				window.subeditors.pop();
				close_side(window.editor);
				window.editor.getTextView().focus();
			}
		});
		
		$('.subeditor_switch').click(switchEditors);
							
		return subeditor;
	};
	
	var toggleSidePanel = function() {
		if ($('#side_panel').css('display') === 'none') {
			var sel = window.editor.getSelection();
			var range = [sel.start, sel.end];
			navigate(window.editor.getFilePath(), range, EDITOR_TARGET.sub);
			window.subeditors[0].getTextView().focus();
		} else {
			$('.subeditor_close').click();
		}
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
		
		
		var history = getHistory();
		
		for (var i = history.length-1; i >= 0; i--) {
			var newHistoryElem = $('<li></li>');
			var newHistoryAnchor = $('<a href="' + history[i].url + '">'+history[i].filename+'</a>');
			$(newHistoryAnchor).click(navigationEventHandler);
			newHistoryElem.append(newHistoryAnchor);
			historyMenu.append(newHistoryElem);
		}
	};
	
	var initializeBreadcrumbs = function(path) {
		var root = window.fsroot;
		var basepath = window.location.protocol + "//" + window.location.host + window.location.pathname + '?';
	
//		$('#breadcrumb li:not(:first)').remove();
		$('.breadcrumb_menu').remove();
		$('#breadcrumb li').remove();

		initializeHistoryMenu();
		
		var crumbs = path.substring(1 + root.length, path.length).split('/'); // the first position is moved up by 1 for the trailing '/'
		crumbs.splice(0, 0, root);
		var constructedPath = "", newCrumbElem, xhrobj, url;
			
		for (var i = 0, len = crumbs.length; i < len; i++) {
			newCrumbElem = $('<li class="light_gradient" data-id="'+i+'"><span>' + crumbs[i] + '</span></li>');

			if (i + 1 === len) { 
				constructedPath += crumbs[i];
			} else {
				constructedPath += crumbs[i] + '/';
				url = 'http://localhost:7261/fs_list/'+constructedPath.substring(0, constructedPath.length-1);
				xhrobj = new XMLHttpRequest();
				xhrobj.open("GET",url,false); // TODO naughty? synchronous xhr
				xhrobj.send();
				if (xhrobj.status !== 200) {
					i=len; // terminate early - the rest of the directory structure looks like it does not exist
				} else {
					$('#breadcrumb').append(newCrumbElem);	
					var kids = JSON.parse(xhrobj.responseText).children;
					if (kids) {

						kids.sort(fileEntryCompare);

						var newMenu = $('<ul class="breadcrumb_menu" data-id="'+i+'"></ul>');
						for(var j = 0; j < kids.length; j++) {
							if (kids[j].directory === false) {
								if (kids[j].name.lastIndexOf('.',0)!==0) {
									var href = basepath + kids[j].Location;
									var newMenuItem = $('<li></li>');
									var newMenuAnchor = $('<a href="'+href+'">'+kids[j].name+'</a>');
									newMenuItem.append(newMenuAnchor);
									newMenu.prepend(newMenuItem);

									$(newMenuAnchor).click(navigationEventHandler);
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
				changeFile: navigationEventHandler,
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
				changeFile: navigationEventHandler,
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
	
	/**
	 * @param {{String|Object}} modifier either EDITOR_TARGET.main, EDITOR_TARGET.sub, or EDITOR_TARGET.tab
	 * @param {{range:List.<Number>,path:String}} definition
	 * @param {{Editor}} editor
	 */
	var openDeclaration = function(modifier, definition, editor) {
		if (!definition.range && !definition.path) {
			return;
		}
		var defnrange = definition.range ? definition.range : editor.getSelection();
		var filepath = definition.path ? definition.path : editor.getFilePath();
		
		console.log("navigation: "+JSON.stringify({path: filepath, range: defnrange}));
		
		var target;
		if (typeof modifier === "object") {
			target = findTarget(modifier);
		} else if (typeof modifier === "string") {
			target = modifier;
		}
		if (target) {
			navigate(filepath, defnrange, target, true);
		}
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
				openDeclaration: openDeclaration
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
	
	var attachDefinitionNavigation = function(editor) {
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ false, /*shift*/ false, /*alt*/ false), "Open declaration");
		editor.getTextView().setAction("Open declaration", function() { 
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				openDeclaration(EDITOR_TARGET.main, definition, editor);
			}
		});
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ true, /*shift*/ false, /*alt*/ false), "Open declaration in new tab");
		editor.getTextView().setAction("Open declaration in new tab", function() {
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				openDeclaration(EDITOR_TARGET.tab, definition, editor);
			}
		});
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ false, /*shift*/ true, /*alt*/ false), "Open declaration in subeditor");
		editor.getTextView().setAction("Open declaration in subeditor", function() {
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				openDeclaration(EDITOR_TARGET.sub, definition, editor);
			}
		});
	};
	
	var attachEditorSwitch = function(editor) {
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("s", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Switch Subeditor and Main Editor");
		editor.getTextView().setAction("Switch Subeditor and Main Editor", switchEditors);
		
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("e", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Toggle Subeditor");
		editor.getTextView().setAction("Toggle Subeditor", toggleSidePanel);		
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
			$('.subeditor_close').click();
			return editor;
		}
		attachSearchClient(editor);
		attachOutlineClient(editor);
		attachDefinitionNavigation(editor);
		attachFileSearchClient(editor);
		attachEditorSwitch(editor);
		editor.cursorFix();
		if (type === 'main') {
			setTimeout(function() {
				editor.getTextView().focus();
			}, 5);
		}
		return editor;
	};

	/**
	 * handles the onpopstate event
	 */
	var popstateHandler = function(event) {
		var cont = true;
		if (window.editor.isDirty() || (window.subeditors[0] && window.subeditors[0].isDirty())) {
			cont = confirm("Editor has unsaved changes.  Are you sure you want to leave this page?  Your changes will be lost.");
		}
		if (cont) {
			var target = findTarget(event);
			var state = event.originalEvent.state;
			if (state && state.filepath) {
				navigate(state.filepath, state.range, target);
				return false;
			} else {
				return true;
			}
		} else {
			return false;
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
	navigate = function(filepath, range, target, doSaveState) {
		// check if the editor has been created yet, or if
		// window.editor is a dom node
		var histItem;
		var hasEditor = window.editor.getText;
		if (hasEditor) {
			histItem = generateHistoryItem(window.editor);
			storeScriptedHistory(histItem);
			if (doSaveState) {
				storeBrowserState(histItem, true);
			}
			if (window.subeditors[0]) {
				var subHistItem = generateHistoryItem(window.subeditors[0]);
				storeScriptedHistory(subHistItem);
			}
		}
		if (target === EDITOR_TARGET.sub) {
			if (hasEditor && !confirmNavigation(window.subeditors[0])) {
				return false;
			}
			open_side(window.editor);
			$('.subeditor_wrapper').remove();
			buildSubeditor(filepath);
			window.subeditors[0] = loadEditor(filepath, $('.subeditor')[0], 'sub');
			if (range) {
				if (isNaN(range[0]) || isNaN(range[1])) {
					console.log("invalid range");
					console.log(range);
				}
				window.subeditors[0].getTextView().setSelection(range[0], range[1], true);
				scrollDefinition(window.subeditors[0]);
			}
			initializeHistoryMenu();
			window.subeditors[0].getTextView().focus();
		} else if (target === EDITOR_TARGET.main) {
			if (hasEditor && !confirmNavigation(window.editor)) {
				return false;
			}
			$('#editor').css('display','block');
			window.editor = loadEditor(filepath, $('#editor')[0], EDITOR_TARGET.main);
			if (range) {
				window.editor.getTextView().setSelection(range[0], range[1], false);
				scrollDefinition(window.editor);
			}

			// explicit check for false since navigator might be 'undefined' at this point
			if (window.scripted.navigator !== false) {
				// if model not yet available, highlighting is handled elsewhere.
				if (explorer.model) {
					explorer.highlight(filepath);
				}
			}
			initializeBreadcrumbs(filepath);
			window.editor.getTextView().focus();
			if (doSaveState) {
				histItem = generateHistoryItem(window.editor);
				storeBrowserState(histItem);
			}
			
		} else if (target === EDITOR_TARGET.tab) {
			var targetPath = range ? filepath + "#" + range : filepath;
			var rootpath = window.location.protocol + "//" + window.location.host + window.location.pathname + '?';
			window.open(rootpath + targetPath);
		}

		return false;
	};
	
	return {
		// loadEditor is a private function and only exposed for testing purposes
		_loadEditor: loadEditor,
		
		initializeBreadcrumbs: initializeBreadcrumbs,
		navigationEventHandler: navigationEventHandler,
		highlightSelection: highlightSelection,
		popstateHandler: popstateHandler,
		toggleSidePanel: toggleSidePanel,
		navigate: navigate
	};
});

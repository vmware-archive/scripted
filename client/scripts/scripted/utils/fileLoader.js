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
 ******************************************************************************/

/*jslint browser:true */
/*global window setTimeout define explorer document console location XMLHttpRequest alert confirm orion scripted dojo $*/
define(["scripted/editor/scriptedEditor", "orion/textview/keyBinding", "orion/searchClient", "scripted/widgets/OpenResourceDialog", "scripted/widgets/OpenOutlineDialog",
"scripted/fileSearchClient", "scripted/widgets/SearchDialog"], 
function(mEditor, mKeyBinding, mSearchClient, mOpenResourceDialog, mOpenOutlineDialog,
	mFileSearchClient, mSearchDialog){

	var initializeBreadcrumbs, loadEditor, attachSearchClient, attachOutlineClient, attachDefinitionNavigation, attachEditorSwitch, clickNavigation, backNavigation, mainNavigation, subNavigation, openDeclaration, attachFileSearchClient, close_side, open_side;
	
	var isMac = navigator.platform.indexOf("Mac") !== -1;
	
	var LINE_SCROLL_OFFSET = 5;
	
	close_side = function(editor){
		$('#side_panel').hide();
		$('#editor').css('margin-right', '0');
		editor._textView._updatePage();
	};
	
	open_side = function(editor){
		if ( $('#side_panel').css('display') === 'block') { return false; }
		$('#side_panel').show();
		$('#editor').css('margin-right', $('#side_panel').width());
		editor._textView._updatePage();
	};
	
	var scrollDefinition = function(editor){
		var tv = editor.getTextView();
		var model = tv.getModel();
		var offset = tv.getCaretOffset();
		var line = model.getLineAtOffset(offset);
		if (line >= LINE_SCROLL_OFFSET) {
			line = line - LINE_SCROLL_OFFSET;
		}
		tv.setTopIndex(line);
	};
	
	var pushHistory = function(editor){
		var filepath = editor.getFilePath();
		var history = window.scriptedHistory;

		for (var i = 0; i < history.length; i++){
			if (history[i].filepath === filepath){
				var sel = history[i].selection;
				if(sel !== undefined){
					editor.setSelection(sel.start, sel.end, true);
				}
				if (history[i].position){
					$(editor._domNode).find('.textview').scrollTop(history[i].position);
				}
				history.splice(i,1);
			}
		}
		
		var scrollPos = $(editor._domNode).find('.textview').scrollTop();

		history.push({
			filename: filepath.split('/').pop(),
			filepath: filepath,
			selection: editor.getSelection(),
			position: scrollPos
		});
		
	};
	
	var switchEditors = function(){
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
		
		var main_active = (document.activeElement === $(window.editor._domNode).find('.textviewContent')[0]);
		
		subNavigation(main_path, null, false);
		mainNavigation(sub_path, null, false);
		
		window.history.pushState(null, null, window.location.pathname + '?' + sub_path);
		pushHistory(window.editor);
		
		$(window.editor._domNode).find('.textview').scrollTop(sub_scrollpos);
		$(window.subeditors[0]._domNode).find('.textview').scrollTop(main_scrollpos);
		
		if (sub_dirty){
			window.editor.setText(sub_text);
		}
		if (main_dirty){
			window.subeditors[0].setText(main_text);
		}
		
		setTimeout(function(){
			if (main_active){
				window.subeditors[0].getTextView().focus();
				window.subeditors[0].getTextView().setSelection(main_sel.start, main_sel.end, true);
			} else {
				window.editor.getTextView().setSelection(sub_sel.start, sub_sel.end, true);
				window.editor.getTextView().focus();
			}
		}, 200);
	};
	
	var confirmNavigation = function(editor){
		if (editor.isDirty()){
			return confirm("Editor has unsaved changes.  Are you sure you want to leave this page?  Your changes will be lost.");
		} else {
			return true;
		}
	};
	
	var highlightSelection  = function(editor){	
		try{
			var loc = JSON.parse("[" + location.hash.substring(1) + "]");
			if (loc && loc.constructor === Array && loc.length > 0) {
				var start = loc[0];
				var end = loc.length > 1 ? loc[1] : start;
				editor.getTextView().setSelection(start, end, true);
				scrollDefinition(editor);
			}
		} catch (e){
			console.log("Could not navigate to location specified in hash. Hash value: " + location.hash);
		}
	};
	
	var buildSubeditor = function(filepath){
		var filename = filepath.split('/').pop();
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
		
		$('.subeditor_close').click(function(){
			if (window.subeditors[0] && confirmNavigation(window.subeditors[0])){
				$('.subeditor_wrapper').remove();
				window.subeditors.pop();
				close_side(window.editor);
				window.editor.getTextView().focus();
			}
		});
		
		$('.subeditor_switch').click(switchEditors);
							
		return subeditor;
	};
	
	var toggleSidePanel = function(){
		if ($('#side_panel').css('display') === 'none'){
			var sel = window.editor.getSelection();
			var range = [sel.start, sel.end];
			subNavigation(window.editor.getFilePath(), range);
			window.subeditors[0].getTextView().focus();
		} else {
			$('.subeditor_close').click();
		}
	};
	
	var isBinary = function(filepath){
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
	
	initializeBreadcrumbs = function(path){
		var root = window.fsroot;
		var basepath = window.location.protocol + "//" + window.location.host + window.location.pathname + '?';
	
//		$('#breadcrumb li:not(:first)').remove();
		$('#breadcrumb li').remove();
		$('.breadcrumb_menu').remove();
		
		var historyCrumb = $('<li data-id="-1"><span><img src="images/icon.png" /></span></li>');
		$('#breadcrumb').append(historyCrumb);
		
		var historyMenu = $('<ul class="breadcrumb_menu" data-id="-1"></ul>');
		historyMenu.css('left', historyCrumb.position().left);
		historyMenu.css('top', $('header').height() + $('#breadcrumb').height());
		$('#main').append(historyMenu);
		
		var history = window.scriptedHistory;
		
		for (var i = 0; i < history.length; i++){
			var newHistoryElem = $('<li></li>');
			var newHistoryAnchor = $('<a href="' + basepath + history[i].filepath + '">'+history[i].filename+'</a>');
			$(newHistoryAnchor).click(clickNavigation);
			newHistoryElem.append(newHistoryAnchor);
			historyMenu.append(newHistoryElem);
		}

		var crumbs = path.substring(1 + root.length, path.length).split('/'); // the first position is moved up by 1 for the trailing '/'
		crumbs.splice(0, 0, root);
		var constructedPath = "", newCrumbElem, xhrobj, url;
			
		for (var i = 0, len = crumbs.length; i < len; i++) {
			newCrumbElem = $('<li class="light_gradient" data-id="'+i+'"><span>' + crumbs[i] + '</span></li>');
			$('#breadcrumb').append(newCrumbElem);	

			if (i + 1 === len){ 
				constructedPath += crumbs[i];
			}
			else {
				constructedPath += crumbs[i] + '/';
				url = 'http://localhost:7261/fs_list/'+constructedPath.substring(0, constructedPath.length-1);
				xhrobj = new XMLHttpRequest();
				xhrobj.open("GET",url,false); // TODO naughty? synchronous xhr
				xhrobj.send();
				var kids = JSON.parse(xhrobj.responseText).children;
				if (kids) {

					kids.sort(fileEntryCompare);

					var newMenu = $('<ul class="breadcrumb_menu" data-id="'+i+'"></ul>');
					for(var j = 0; j < kids.length; j++){
						if (kids[j].directory === false){
							if (kids[j].name.lastIndexOf('.',0)!==0) {
								var href = basepath + kids[j].Location;
								var newMenuItem = $('<li></li>');
								var newMenuAnchor = $('<a href="'+href+'">'+kids[j].name+'</a>');
								newMenuItem.append(newMenuAnchor);
								newMenu.prepend(newMenuItem);

								$(newMenuAnchor).click(clickNavigation);
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

		$('.breadcrumb_menu > li').hover(function(){
			$(this).addClass('light_gradient_active');
			$(this).removeClass('light_gradient');
		}, function(){
			$(this).addClass('light_gradient');
			$(this).removeClass('light_gradient_active');
		});
	};
	
	// Need to load searcher here instead of scriptedEditor.js to avoid circular dependencies
	// Before : scriptedEditor.js -> searchClient.js -> fileLoader.js -> scriptedEditor.js : BAD
	
	attachSearchClient = function(editor){
	
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
				changeFile: clickNavigation,
				editor: editor
			});
			if (editor) {
				dojo.connect(dialog, "onHide", function() {
					editor.getTextView().focus(); // focus editor after dialog close, dojo's doesnt work
				});
			}
			window.setTimeout(function() {
				dialog.show();
			}, 0);
		};
		
		if (editor){
			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("f", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Find File Named...");
			editor.getTextView().setAction("Find File Named...", function() {
				openResourceDialog(searcher, null, editor);
				return true;
			});		
		} else {
			$('body').on('keydown', function(evt){
				if (evt.shiftKey && evt.ctrlKey && evt.which === 70 /*F*/){
					openResourceDialog(searcher, null, null);
					return true;
				}
			});
		}
	};
	
	attachOutlineClient = function(editor){

		// from globalCommands.js
		var openOutlineDialog = function(searcher, serviceRegistry, editor) {
			var dialog = new scripted.widgets.OpenOutlineDialog({
				changeFile: clickNavigation,
				editor: editor
			});
			if (editor) {
				dojo.connect(dialog, "onHide", function() {
					editor.getTextView().focus(); // focus editor after dialog close, dojo's doesnt work
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
	
	attachFileSearchClient = function(editor) {
	
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
			if (editor) {
				dojo.connect(dialog,"onHide", function() {
					editor.getTextView().focus(); // focus editor after dialog closed
				});
			}
			window.setTimeout(function() {
				dialog.show();
			},0);
		};
		
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("l",/*CMD/CTRL*/true,/*SHIFT*/true,/*ALT*/false),"Search files");
		editor.getTextView().setAction("Search files",function() {
			openFileSearchDialog(editor);
		});
	};
	
	/**
	 * @param String modifier
	 * @param {{range:List.<Number>,path:String}} definition
	 * @param {{Editor}} editor
	 */
	openDeclaration = function(modifier, definition, editor) {
		if (!definition.range && !definition.path) {
			return;
		}
		var defnrange = definition.range ? definition.range : editor.getSelection();
		var filepath = definition.path ? definition.path : editor.getFilePath();
		
		console.log("navigation: "+JSON.stringify({path: filepath, range: defnrange}));
		
		if (modifier === "shift"){
			subNavigation(filepath, defnrange);
			scrollDefinition(window.subeditors[0]);
		} else if (modifier === "ctrl"){
			filepath = filepath + "#" + defnrange;
			var rootpath = window.location.protocol + "//" + window.location.host + window.location.pathname + '?';
			window.open(rootpath + filepath);
		} else if (modifier === "none"){
			if (definition.path){
				if (editor.type === 'main'){
					window.history.pushState(null, null, window.location.pathname + '?' + filepath);
					mainNavigation(filepath, defnrange, true);
					scrollDefinition(window.editor);
				} else if (editor.type === 'sub'){
					subNavigation(filepath, defnrange, true);
					scrollDefinition(window.subeditors[0]);
				} 
			} else {
				editor.getTextView().setSelection(defnrange[0], defnrange[1], true);
			}
		}
	};

	attachDefinitionNavigation = function(editor){
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ false, /*shift*/ false, /*alt*/ false), "Open declaration");
		editor.getTextView().setAction("Open declaration", function() { 
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				openDeclaration("none", definition, editor);
			}
		});
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ true, /*shift*/ false, /*alt*/ false), "Open declaration in new tab");
		editor.getTextView().setAction("Open declaration in new tab", function() {
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				openDeclaration("ctrl", definition, editor);
			}
		});
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding(/*F8*/ 119, /*command/ctrl*/ false, /*shift*/ true, /*alt*/ false), "Open declaration in subeditor");
		editor.getTextView().setAction("Open declaration in subeditor", function() {
			var definition = editor.findDefinition(editor.getTextView().getCaretOffset());
			if (definition) {
				openDeclaration("shift", definition, editor);
			}
		});
	};
	
	attachEditorSwitch = function(editor){
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("s", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Switch Subeditor and Main Editor");
		editor.getTextView().setAction("Switch Subeditor and Main Editor", switchEditors);
		
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("e", /*command/ctrl*/ true, /*shift*/ true, /*alt*/ false), "Toggle Subeditor");
		editor.getTextView().setAction("Toggle Subeditor", toggleSidePanel);		
	};
	
	/*
		This handles navigations from
			-Navigator
			-Breadcrumb
			-Open File
	*/
	clickNavigation = function(event){
		var filepath = event.altTarget ? $(event.altTarget).attr('href') : $(event.currentTarget).attr('href') ;
		var query_index = filepath.indexOf('?');
		if (query_index !== -1){
			filepath = filepath.substring(query_index+1, filepath.length);
		}
		
		if (isBinary(filepath)){
			alert("Cannot open binary files");
			return false;
		}
		
		if ((isMac && event.metaKey) || (!isMac && event.ctrlKey)) {
			return true; // if ctrl key is pressed, open in new tab
		}
		var subNavigationDisabled = (window.editor.loadResponse === 'error') ? true : false;
		if ((event.shiftKey || event.makeShift) && !subNavigationDisabled){ // if shift key is pressed, open in subeditor
			subNavigation(filepath, null, true);
			return false;
		} else {
			mainNavigation(filepath, null, true);
			window.history.pushState(null, null, window.location.pathname + '?' + filepath);
			return false;
		}
	};
	
	/*
		This handles forward/back button navigation
		TODO:  Handle dirty changes
	*/
	backNavigation = function(){
		var filepath = window.location.getPath();
		window.editor = loadEditor(filepath, $('#editor')[0], 'main');
		explorer.highlight(filepath);
		
/*		var historyEntry = window.scriptedHistory[window.scriptedHistory.length - 1];
		historyEntry.selection = window.editor.getSelection();
		historyEntry.position = $(window.editor._domNode).find('.textview').scrollTop();*/
		
		pushHistory(window.editor);
		initializeBreadcrumbs(filepath);
	};
	
	mainNavigation = function(filepath, range, confirm){
		if (!confirm || confirmNavigation(window.editor)){
			$('#editor').css('display','block');
			if (window.scripted.navigator !== false){
				explorer.highlight(filepath);
			}
			
			var historyEntry = window.scriptedHistory[window.scriptedHistory.length - 1];
			historyEntry.selection = window.editor.getSelection();
			historyEntry.position = $(window.editor._domNode).find('.textview').scrollTop();
			
			window.editor = loadEditor(filepath, $('#editor')[0], 'main');
			if (range) {
				window.editor.getTextView().setSelection(range[0], range[1], true);
			}
			//pushHistory(window.editor); //TODO: not sure what this should be doing.... but what it seems to be doing, is moving the selection in unpredictable patterns.
			initializeBreadcrumbs(filepath);
			window.editor.getTextView().focus();
			return true;
		} else {
			return false;
		}
	};
	
	subNavigation = function(filepath, range, confirm){
		if (window.subeditors[0] !== undefined && confirm){
			if (!confirmNavigation(window.subeditors[0])){
				return false;
			}
		}
		open_side(window.editor);
		$('.subeditor_wrapper').remove();
		buildSubeditor(filepath);
		window.subeditors[0] = loadEditor(filepath, $('.subeditor')[0], 'sub');

		if (range) {
			window.subeditors[0].getTextView().setSelection(range[0], range[1], true);
		}
	};
	
	/*
		This handles initial page load
	*/
	loadEditor = function(filepath, domNode, type){
		$(domNode).show();
		$('body').off('keydown');
		var editor = mEditor.makeEditor(domNode, filepath, type);
		if (editor.loadResponse === 'error'){
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
		if (type === 'main'){
			setTimeout(function(){
				editor.getTextView().focus();
			}, 5);
		}
		return editor;
	};
	
	return {
		initializeBreadcrumbs: initializeBreadcrumbs,
		clickNavigation: clickNavigation,
		backNavigation: backNavigation,
		loadEditor: loadEditor,
		toggleSidePanel: toggleSidePanel,
		highlightSelection: highlightSelection
	};
});

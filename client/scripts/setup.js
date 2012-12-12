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
 *     Andrew Eisenberg
 *     Andrew Clement
 *     Kris De Volder
 *     Christopher Johnson
 *     Scott Andrews
 ******************************************************************************/

/*global location confirm localStorage requirejs $ console window require XMLHttpRequest SockJS setTimeout document*/
/*jslint browser:true */

/**
 * Set to false to disable a category
 *
 * Logger categories.  Change to false to disable
 * To use, include a parameter when calling the scriptedLogger function
 * The OTHER category is for messages that have no explicit category and
 * The ALL category disables all messages.
 * You may add new categories as necessary
 */
var scriptedLoggerCategories = {
	ALL : true,
	OTHER : true,
	INDEXER : false,
	CONTENT_ASSIST : true,
	EXPLORER_TABLE : true,
	SETUP : true,
	PANE : true
};

var scriptedLogger = {
	SHOW_CALLER : false,
	INFO : true,
	DEBUG : true,
	WARN : true,
	ERROR : true,  // I don't know why we'd want to disable error handling, but I'll keep it here
	info : function(msg, category) {
		if (this.INFO && this.isEnabled(category)) {
			msg = this.SHOW_CALLER ? msg + " --- " + this.info.caller : msg;
			console.info(msg);
		}
	},
	debug : function(msg, category) {
		if (this.DEBUG && this.isEnabled(category)) {
			msg = this.SHOW_CALLER ? msg + " --- " + this.debug.caller : msg;
			console.debug(msg);
		}
	},
	warn : function(msg, category) {
		if (this.WARN && this.isEnabled(category)) {
			msg = this.SHOW_CALLER ? msg + " --- " + this.warn.caller : msg;
			console.warn(msg);
		}
	},
	error : function(msg, category) {
		if (this.ERROR && this.isEnabled(category)) {
			msg = this.SHOW_CALLER ? msg + " --- " + this.error.caller : msg;
			console.error(msg);
		}
	},
	
	// A message is
	isEnabled : function(catName) {
		if (!scriptedLoggerCategories.ALL) {
			return false;
		}
		return !catName || scriptedLoggerCategories[catName] === undefined ?
			scriptedLoggerCategories.OTHER :
			scriptedLoggerCategories[catName];
	}
};


requirejs.config({
	packages:	[{ name: 'dojo', location: 'lib/dojo', main:'lib/main-browser', lib:'.'},
				{ name: 'dijit',location: 'lib/dijit',main:'lib/main',lib: '.'}],
	paths: {
	//require: 'lib/requirejs/require',
		i18n: 'lib/requirejs/i18n',
		text: 'lib/requirejs/text',
		jquery_ui: 'lib/jquery-ui-custom',
		jsbeautify: 'lib/beautify',
		jsrender: 'lib/jsrender',
		jquery: 'lib/jquery-1.7.2.min',
		sockjs:'lib/sockjs-592774a-0.3.1.min',
		fileapi: 'scripted/fileapi',
		'esprima/esprima' : 'lib/esprima/esprima',
		'doctrine/doctrine' : 'lib/doctrine/doctrine',
		jshint: 'lib/jshint-r12-80277ef',
		when: 'lib/when-aaa0898-1.6.1',
		'websocket-multiplex': 'lib/websocket-multiplex/multiplex_client'
	}
});

require(["scripted/editor/scriptedEditor", "scripted/navigator/explorer-table", "fileapi", "orion/textview/keyBinding",
		 "scripted/keybindings/keystroke", "orion/searchClient",
		 "jquery", "scripted/utils/navHistory", "scripted/utils/pageState", "servlets/jsdepend-client", "scripted/utils/os",
		 "scripted/exec/exec-console", "scripted/exec/exec-on-load", "when", "scripted/editor/jshintdriver", "scripted/editor/editorPane"],
		 
	function(mEditor, mExplorerTable, mFileApi, mKeyBinding,
		mKeystroke, mSearchClient, mJquery,
		mNavHistory, mPageState, mJsdepend, mOsUtils,
		mExecConsole, mExecOnLoad, mWhen, mJshintDriver) {
			
	if (!window.scripted) {
		window.scripted = {};
	}

	/**
	 * This function will perform checks on the configuration and where appropriate ensure options are consistent.
	 * Currently, it:
	 * 1) ensures if formatter indentation is configured, it sets editor indentation options, and vice versa
	 */
	var processConfiguration = function() {
	
		// 1. Ensuring consistency of options across formatter and editor configuration
		// formatter configuration options:
		//  formatter.js.indent_size (number)
		//  formatter.js.indent_char (string)
		// editor configuration options:
		//  editor.expandtab (boolean)
		//  editor.tabsize (number)
		// rule: if possible (compatible), copy one config to the other
		var editor_expandtab_set = window.scripted.config.editor && window.scripted.config.editor.expandtab!==null;
		var editor_tabsize_set = window.scripted.config.editor && window.scripted.config.editor.tabsize!==null;
		var formatter_js_indent_size_set = window.scripted.config.formatter && window.scripted.config.formatter.js &&
											window.scripted.config.formatter.js.indent_size!==null;
		var formatter_js_indent_char_set = window.scripted.config.formatter && window.scripted.config.formatter.js &&
											window.scripted.config.formatter.js.indent_char!==null;
											
		// Just do the common cases for now:
		if (editor_expandtab_set || editor_tabsize_set) {
			if (!(formatter_js_indent_size_set || formatter_js_indent_char_set)) {
				if (editor_expandtab_set && window.scripted.config.editor.expandtab && !formatter_js_indent_char_set) {
					// Set the indent char to space
					if (!window.scripted.config.formatter) {
						window.scripted.config.formatter = { "js": { "indent_char": " " }};
					} else if (!window.scripted.config.formatter.js) {
						window.scripted.config.formatter.js = { "indent_char": " "};
					} else {
						window.scripted.config.formatter.js.indent_char = " ";
					}
				}
				if (editor_tabsize_set && !formatter_js_indent_size_set) {
					// Set the indent size to match the tabsize
					var tabsize = window.scripted.config.editor.tabsize;
					if (!window.scripted.config.formatter) {
						window.scripted.config.formatter = { "js": { "indent_size": tabsize }};
					} else if (!window.scripted.config.formatter.js) {
						window.scripted.config.formatter.js = { "indent_size": tabsize};
					} else {
						window.scripted.config.formatter.js.indent_size = tabsize;
					}
				}
			}
		} else {
			if (formatter_js_indent_size_set || formatter_js_indent_char_set) {
				var indent_char_isspace = formatter_js_indent_char_set && window.scripted.config.formatter.js.indent_char===" ";
				if (indent_char_isspace) {
					// Set the expandtab if we can
					if (!window.scripted.config.editor) {
						window.scripted.config.editor = { "expandtab": true };
					} else {
						window.scripted.config.editor.expandtab = true;
					}
					if (formatter_js_indent_size_set) {
						// Set the tabsize to match the indent size
						var indentsize = window.scripted.config.formatter.js.indent_size;
						if (!window.scripted.config.editor) {
							window.scripted.config.editor = { "tabsize": indentsize };
						} else {
							window.scripted.config.editor.tabsize = indentsize;
						}
					}
				}
			}
		}
	};
	
	// Create new FileExplorer
	var explorer  = new mExplorerTable.FileExplorer({
		//serviceRegistry: serviceRegistry, treeRoot: treeRoot, selection: selection,
		//searcher: searcher, fileClient: fileClient, commandService: commandService,
		//contentTypeService: contentTypeService,
		parentId: "explorer-tree"
		//breadcrumbId: "location", toolbarId: "pageActions",
	    //selectionToolsId: "selectionTools", preferences: preferences
	});

	window.explorer = explorer;

	var pageState = mPageState.extractPageStateFromUrl(window.location.toString());

	/* Locate the nearest .jshintrc. It will look relative to the initially opened
	 * location - so ok if the .jshintrc is at the project root. But if the file is
	 * elsewhere in the tree it sometimes won't find it depending on what is opened.
	 */
	var loadJshintrc = function() {
		// TODO fix it up to do a better job of finding it
		// TODO return value shouldn't be trampling on the config object itself, should be an object in
		// which the config is a member.
		// TODO a timing window problem does exist here - where if the .jshintrc file isn't
		// found quickly enough the first linting will not respect it. fix it!
		var deferred = mWhen.defer();
		mJsdepend.retrieveNearestFile(pageState.main.path, window.fsroot, '.jshintrc', function(jshintrc) {
			if (jshintrc && jshintrc.fsroot) {
				// it was found at that location
				scriptedLogger.info("Found .jshintrc at "+jshintrc.fsroot);
				if (jshintrc.error) {
					scriptedLogger.error(jshintrc.error);
				} else {
//					scriptedLogger.info(JSON.stringify(jshintrc,null," "));
					mJshintDriver.resolveConfiguration(jshintrc);
//					window.scripted.config.jshint = jshintrc;
				}
			} else {
				scriptedLogger.info("No .jshintrc found");
				mJshintDriver.resolveConfiguration({});
			}
			deferred.resolve();
		});
		return deferred.promise;
	};
	
	// TODO why is getConf on jsdepend?
	mJsdepend.getConf(pageState.main.path, function (dotScripted) {
//		scriptedLogger.info("fetched dot-scripted conf from server");
//		scriptedLogger.info(JSON.stringify(dotScripted, null, "  ")); // too verbose to print this out
		window.fsroot = dotScripted.fsroot;
		window.scripted.config = dotScripted;
		
		if (window.scripted.config && window.scripted.config.ui && window.scripted.config.ui.navigator===false) {
			window.scripted.navigator=false; // default is true
			$('#navigator-wrapper').hide();
		}
		
		processConfiguration();
		// Start the search for .jshintrc
		window.scripted.promises = { "loadJshintrc": loadJshintrc()};
		
		if (window.scripted.navigator === undefined || window.scripted.navigator === true) {
			explorer.loadResourceList(window.fsroot/*pageParams.resource*/, false, function() {
					//	mGlobalCommands.setPageTarget(explorer.treeRoot, serviceRegistry, commandService, null, /* favorites target */explorer.treeRoot);
					// highlight the row we are using
				setTimeout(function() {explorer.highlight(pageState.main.path);},500);
			});
		} else {
			$('#editor').css('margin-left', 0);
			$('#editor').css("left","0px");
			$('#explorer-tree').remove();
		}
		window.subeditors = [];
		mNavHistory.setupPage(pageState, false);
		
		require(['jquery_ui'], function(mJqueryUI){
			/*Resizable navigator*/
			var nav = $('#navigator-wrapper');
			nav.resizable({
				handles: "e"
			});

			nav.resize(function(){
				var width = $('#navigator-wrapper').width();
				$('#editor').css('margin-left', width);
				window.editor._textView._updatePage();
				localStorage.setItem("scripted.navigatorWidth", width);
			});
			
			if (window.navigator) {
				// use last size if known
				var storedWidth = localStorage.getItem("scripted.navigatorWidth");
				if (storedWidth) {
					nav.width(storedWidth);
					nav.resize();
				}
			}
			
			/*Resizable side panel*/
			var sidePanel = $('#side_panel');
			sidePanel.resizable({
				handles: "w"
			});
			
			sidePanel.resize(function(){
				var side_width = sidePanel.width();
				$('#editor').css('margin-right', side_width);
				sidePanel.css('left', '');
				
				var side_percent = (side_width / $('#editor_wrapper').width())*100;
				sidePanel.css('width', side_percent + "%");
				
				if (window.editor._textView) {
					window.editor._textView._updatePage();
					for (var i = 0; i < window.subeditors.length; i++){
						window.subeditors[i].getTextView().update();
					}
					localStorage.setItem("scripted.sideWidth", side_width);
				}
			});
			
//			// use last size if known
//			storedWidth = localStorage.getItem("scripted.sideWidth");
//			if (storedWidth) {
//				sidePanel.width(storedWidth);
//				sidePanel.resize();
//			}
		});

		//Make sure the keyhelp UI is setup. We do this asynchronously since its initially
		//invisible and its not necessary to hold up the editor for this.
		require(['scripted/keybindings/keyhelp'], function (mKeyHelp) {
			console.log('Keybindings help-panel is ready');
		});
		
		/*Side panel open/close*/
		
		$('#side_toggle').on('click', mNavHistory.toggleSidePanel);

		/*Position elements correctly on page*/
		var footer_height = $('footer').outerHeight();
		var header_height = $('header').outerHeight();
		var breadcrumb_height = $('#breadcrumb').outerHeight();
		var main_height = $(window).height() - footer_height - header_height;

		$('#main').height(main_height);
		
		$('#editor').mouseenter(function(){ $('.breadcrumb_menu').hide(); });
		$('#navigator-wrapper').mouseenter(function(){ $('.breadcrumb_menu').hide(); });
		
		$('#help_panel').css('top', header_height + "px");
		$('#editor').height($('#main').height() - breadcrumb_height);

		$(window).resize(function(e){
			var main_height = $(window).height() - footer_height - header_height;
			var console_height = ($('#console_wrapper').css('display')==='none') ? 0 : $('#console_wrapper').outerHeight() || 0;
			var editor_height = main_height - breadcrumb_height - console_height;
			
			$('#main').height(main_height);
			$('#side_panel').height(main_height);
			
			var sideHeight = $('#side_panel').height();
			var subeditorMargin = parseInt($('.subeditor_wrapper').css('margin-top'), 10);
			
			$('.subeditor_wrapper').height(sideHeight - (subeditorMargin*2));
			$('.subeditor').height(
				$('.subeditor_wrapper').height() -
				$('.subeditor_titlebar').height()
			);
				
			$('#editor').height(editor_height);
			var side_width = ($('#side_panel').css('display') === 'block') ? $('#side_panel').width() : 0;
			$('#editor').css('margin-right', side_width);

			/*
			var resizable_handle = $('#side_panel > .ui-resizable-w');
			resizable_handle.hide(); // we have to remove the resizable handle, or else it adds to scrollHeight
			resizable_handle.height( $('#side_panel')[0].scrollHeight );
			resizable_handle.show();
			
			var subeditor;
			for (var i in window.subeditors){
				subeditor = window.subeditors[i].domNode;
				subeditor.height( $('#side_panel').height() - parseInt(subeditor.css('margin-top')) - parseInt(subeditor.css('margin-bottom')) );
				window.subeditors[i].editor.getTextView().update();
			}
			*/
			if (window.editor._textView) {
				window.editor._textView._updatePage();
			}
		});
		
		$(window).bind('beforeunload', function() {
			var sidePanelOpen = window.subeditors && window.subeditors[0];
			var mainItem = mPageState.generateHistoryItem(window.editor);
			var subItem = sidePanelOpen ? mPageState.generateHistoryItem(window.subeditors[0]) : null;
			mPageState.storeBrowserState(mainItem, subItem, false);
		});
		
		$(window).bind('beforeunload', function() {
			if (window.editor.isDirty() || (window.subeditors[0] && window.subeditors[0].isDirty())) {
				return "There are unsaved changes.";
			}
		});
		
		$(document).ready(function(){
			require("scripted/exec/exec-on-load").installOn(window.fsroot);
			/* setTimeout so popstate doesn't fire on initial page load */
			window.setTimeout(function() {
				$(window).bind('popstate', mNavHistory.popstateHandler);
			}, 1);
		});
		
		//Report any errors getting the dotScripte configuration. This must be done near the end of setup
		//so we are sure that the various ui widgetry is already there.
		if (dotScripted.error) {
			mExecConsole.error("Problems getting scripted configuration:\n"+dotScripted.error);
		}
		
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// HACK sections
		// Here we do a few things that are not pretty, but is the only way to get things working in all the browsers

		////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// CHROME section
		// clears back-forward cache in chrome
		$(window).unload(function(){});
	 
		
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// FIREFOX section
		
		// Fix disappearing caret
		// if we ever add an anchor tag anywhere, we can use that instead of this fix.
		window.editor.cursorFix( $('#editor') );
		
	});
});

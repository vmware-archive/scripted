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
 ******************************************************************************/

/*global location confirm requirejs $ console window require XMLHttpRequest SockJS setTimeout document*/
/*jslint browser:true */
window.location.getPath = function(){
	var url = this.search.substr(1);
	url = url.replace(/%20/g, " "); // replace all %20's with spaces
	return url;
};

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
	SETUP : true
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
		'doctrine/doctrine' : 'lib/doctrine/doctrine'
	}
});

require(["scripted/editor/scriptedEditor", "scripted/navigator/explorer-table", "fileapi", "orion/textview/keyBinding", "orion/searchClient", "scripted/widgets/OpenResourceDialog", "jquery", "scripted/utils/fileLoader", "scripted/exec/exec-on-load"], 
	function(mEditor, mExplorerTable, mFileApi, mKeyBinding, mSearchClient, mOpenResourceDialog, mJquery, mFileLoader) {
	
	/* needs dependency on "sockjs"
	var sock = new SockJS("http://localhost:7261/echo");
	   sock.onopen = function() {
	       scriptedLogger.info('open', "SETUP");
			sock.send("helo");
	   };
	   sock.onmessage = function(e) {
	       scriptedLogger.info('message', "SETUP");
	       scriptedLogger.info(e.data, "SETUP");
	   };
	   sock.onclose = function() {
	       scriptedLogger.info('close', "SETUP");
	   };
	 */
	
	function loadConfig(scriptedconfig) {
		// Load the configuration file
		try {
			var contents = mFileApi.getContentsSync(scriptedconfig);
			scriptedLogger.info("Loading scripted configuration: "+scriptedconfig, "SETUP");
			if (contents.length!==0) {
				var commentBeginExp = new RegExp("^\\s*/\\*");
				var hasLeadingComment = commentBeginExp.test(contents);
				if (hasLeadingComment) {
				    var endBlockCommentIndex = contents.indexOf('*/');
				    if (endBlockCommentIndex!==-1) {
						contents = contents.substr(endBlockCommentIndex+2);
				    }
				}
				window.scripted.config = JSON.parse(contents);
			}
		} catch (e) {
		  scriptedLogger.error("Unable to parse JSON config block: "+e, "SETUP");
		}
		if (window.scripted.config && window.scripted.config.ui && window.scripted.config.ui.navigator===false) {
			window.scripted.navigator=false; // default is true
			$('#navigator-wrapper').hide();
		}
	}
	
	function findProjectRoot(filepath){
		// need to find the nearest .project/.scripted/.git file
		var projectRootContext = null;
		var dir = filepath.substr(0,filepath.lastIndexOf("/"));
//		var count = 0;
		var scriptedconfig;
		try {
			while (projectRootContext === null && dir.length!==0) {
				// does it contain a .project or .scripted?	
				var xhrobj = new XMLHttpRequest();
				var url = 'http://localhost:7261/fs_list/'+dir;
				//scriptedLogger.debug("url is "+url, "SETUP");
				xhrobj.open("GET",url,false); // TODO naughty? synchronous xhr
				xhrobj.send();
				if (xhrobj.status === 404) {
					// didn't find the file being asked about, carry on moving up...
				} else {
				var kids = JSON.parse(xhrobj.responseText).children;
				if (kids) {
					// Check if this is where to stop
					for (var i=0;i<kids.length;i++) {
						var n = kids[i].name;
						if (n === ".scripted" || n === ".project" || n === ".git") {
							if (n === ".scripted") {
								scriptedconfig = dir+"/"+n;
							}
							projectRootContext = dir;
						}
					}
				}
				}

				if (projectRootContext===null) {
					dir = dir.substr(0,dir.lastIndexOf("/"));
//					count++;
//					if (count===5) {
//						projectRootContext = dir;
//					}
				}
			}
		} catch (e2) {
			scriptedLogger.error("xhr failed "+e2, "SETUP");
		}
		if (projectRootContext===null) {
				projectRootContext = filepath.substr(0,filepath.lastIndexOf("/"));
		}
		// Was there a .scripted file?
		if (scriptedconfig) {
			loadConfig(scriptedconfig);
		}
	
		// Set to the root for the navigator
		window.fsroot=projectRootContext;
	}
		
	if (!window.scripted) {
		window.scripted = {};
	}

	var filepath = window.location.getPath();
	findProjectRoot(filepath);

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
	window.editor = mFileLoader.loadEditor( filepath, ($('#editor')[0]), 'main' );
	if (location.hash.length > 1) {
		mFileLoader.highlightSelection(window.editor);
	}
	
	if (!window.scriptedHistory) {
		window.scriptedHistory = [{
			filename: filepath.split('/').pop(),
			filepath: filepath,
			selection: ""
		}];
	}

	mFileLoader.initializeBreadcrumbs(filepath);
	
	if (window.scripted.navigator === undefined || window.scripted.navigator === true) {
		explorer.loadResourceList(window.fsroot/*pageParams.resource*/, false, function() {
				//	mGlobalCommands.setPageTarget(explorer.treeRoot, serviceRegistry, commandService, null, /* favorites target */explorer.treeRoot);
				// highlight the row we are using
			setTimeout(function() {explorer.highlight(filepath);},500);
		});
	} else {
		$('#editor').css('margin-left', 0);
		$('#editor').css("left","0px");
		$('#explorer-tree').remove();
	}

	require(['jquery_ui'], function(mJqueryUI){
		/*Resizable navigator*/
		var navigator_width = $('#navigator-container').width();
		$('#navigator-wrapper').resizable({
			handles: "e"
		});

		$('#navigator-wrapper').resize(function(){
			var width = $('#navigator-wrapper').width();
			$('#editor').css('margin-left', width);
			window.editor._textView._updatePage();
		});
		
		/*Resizable side panel*/
		
		$('#side_panel').resizable({
			handles: "w"
		});
		
		$('#side_panel').resize(function(){
			var side_width = $('#side_panel').width();
			$('#editor').css('margin-right', side_width);
			$('#side_panel').css('left', '');
			
			var side_percent = (side_width / $('#editor_wrapper').width())*100;
			$('#side_panel').css('width', side_percent + "%");		
			
			window.editor._textView._updatePage();
			for (var i in window.subeditors){
				window.subeditors[i].getTextView().update();
			}
		});

		/* Load keyboard shortcuts*/
		require(['jsrender'], function(mJsRender){
			var keyCodes = {};
			$.each($.ui.keyCode, function(key, value){
				keyCodes[value] = key;
			});
			
			var xhrobj = new XMLHttpRequest();
			var url = 'resources/shortcut.json';
			xhrobj.open("GET", url, false); // TODO naughty? synchronous xhr
			xhrobj.send();
			var names = JSON.parse(xhrobj.responseText).names;
			
			$.views.converters({
				toChar: function(val) {
					// non-standard keys add more as required
					switch (val) {
						case 191:
							return '/';
						case 220:
							return '\\';
						case 119:
							return 'F8';
					}
					if (keyCodes[val]) { 
						return keyCodes[val]; 
					} else { 
						return String.fromCharCode(val); 
					}
				},
				toShortcutName: function(name){
					if (names[name]) { return names[name]; }
					else { return name; }
				}
			});

			$.views.helpers({
				isMac: function(){
					return (window.navigator.platform.indexOf("Mac") !== -1);
				}
			});

			var command_file = "../resources/_command.tmpl.html";
			// use a copy so we can sort
			var keyBindings = window.editor.getTextView()._keyBindings.slice(0); 
			
			// not perfect since not all names are correct here, but pretty close
			keyBindings.sort(function(l,r) {
				var lname = names[l.name] ? names[l.name] : l.name;
				var rname = names[r.name] ? names[r.name] : r.name;
				if (lname) {
					lname = lname.toLowerCase();
				}
				if (rname) {
					rname = rname.toLowerCase();
				}
				if (lname < rname) {
					return -1;
				} else if (rname < lname) {
					return 1;
				} else {
					return 0;
				}
			});
			
			var lastShortcut = "";
			for (var i = 0; i < keyBindings.length; i++){
				if (keyBindings[i].name === lastShortcut) { keyBindings.splice(i,1); }
				lastShortcut=keyBindings[i].name;
			}
			
			var importantKeyBindings = [];
			var otherKeyBindings = [];
			
			for (i = 0; i < keyBindings.length; i++){
				if (!keyBindings[i].obvious) {
					if (keyBindings[i].predefined){
						otherKeyBindings.push(keyBindings[i]);
					} else {
						importantKeyBindings.push(keyBindings[i]);
					}
				}
			}

			$.get(command_file, null, function(template){
				var tmpl = $.templates(template);
				$('#command_list').append(tmpl.render(importantKeyBindings));
				$('#command_list').append('<li>========================</li>');				
				$('#command_list').append(tmpl.render(otherKeyBindings));
			});

			window.editor._textView._updatePage();
		});
	});	

	/*Command help panel*/
	var help_panel_width = $('#help_panel').width();
	var help_close, help_open;

	help_open = function(){
		$('#help_panel').show();
		$('#help_open').off('click');
		$('#help_open').on('click', help_close);
	};

	help_close = function(){
		$('#help_panel').hide();
		$('#help_open').off('click');
		$('#help_open').on('click', help_open);
	};
	
	$('#help_open').on('click', help_open);
	
	
	/*Side panel open/close*/
	
	$('#side_toggle').on('click', mFileLoader.toggleSidePanel);

	/*Position elements correctly on page*/
	var footer_height = $('footer').outerHeight();
	var header_height = $('header').outerHeight();
	var breadcrumb_height = $('#breadcrumb').outerHeight();
	var total_header_offset = header_height + breadcrumb_height;
	var main_height = $(window).height() - footer_height - header_height;

	$('#main').height(main_height);
	
	$('#editor').mouseenter(function(){ $('.breadcrumb_menu').hide(); });
	$('#navigator-wrapper').mouseenter(function(){ $('.breadcrumb_menu').hide(); });
	
	$('#help_panel').css('top', header_height + "px");
	$('#editor').height($('#main').height() - breadcrumb_height);

	$(window).resize(function(e){
		var main_height = $(window).height() - footer_height - header_height;
		
		$('#main').height(main_height);
		$('#side_panel').height(main_height);
		
		var sideHeight = $('#side_panel').height();
		var subeditorMargin = parseInt($('.subeditor_wrapper').css('margin-top'), 10);
		
		$('.subeditor_wrapper').height(sideHeight - (subeditorMargin*2));
		$('.subeditor').height(
			$('.subeditor_wrapper').height() -
			$('.subeditor_titlebar').height()
		);
			
		$('#editor').height($('#main').height() - breadcrumb_height);
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
		
		window.editor._textView._updatePage();
	});
	
	window.onbeforeunload = function() {
		if (window.editor.isDirty() || (window.subeditors[0] && window.subeditors[0].isDirty())) {
			return "There are unsaved changes.";
		}
	};
	
	$(window).load(function(){
		require("scripted/exec/exec-on-load").installOn(window.fsroot);
		/* setTimeout so popstate doesn't fire on initial page load */
		window.setTimeout(function(){
			$(window).on('popstate', function(event){
//				window.history.forward();
				var cont = true;
				if (window.editor.isDirty()){
					cont = confirm("Editor has unsaved changes.  Are you sure you want to leave this page?  Your changes will be lost.");
				}
				if (cont){
					return mFileLoader.backNavigation();
				} else {
					window.history.pushState(null, null,  window.location.pathname + '?' + window.editor.getFilePath());
					return false;
				}				
			});
		}, 1);
	});

	window.subeditors = [];

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// HACK secitons
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

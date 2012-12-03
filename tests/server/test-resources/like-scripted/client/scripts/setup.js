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

/*global requirejs $ console window require XMLHttpRequest*/
requirejs.config({
	packages:	[{ name: 'dojo', location: 'dojo', main:'lib/main-browser', lib:'.'},
				{ name: 'dijit',location: 'dijit',main:'lib/main',lib: '.'}], 
	paths: {
		i18n: 'requirejs/i18n',
		text: 'requirejs/text',
		fileapi: 'orion/editor/fileapi',
		jquery: 'lib/jquery-1.7.2.min',
		jquery_ui: 'lib/jquery-ui-custom',
		jsbeautify: 'orion/editor/jsbeautify',
		jsrender: 'lib/jsrender'
	}
});

require(["editor", "orion/explorer-table", "fileapi", "jquery"], 
	function(mEditor, mExplorerTable, mFileApi, mJquery) {
	
	function loadScriptedConfig(scriptedconfig) {
		// Load the configuration file
		try {
			var contents = mFileApi.getContentsSync(scriptedconfig);
			console.log("Loading scripted configuration: "+scriptedconfig);
			if (contents.length!==0) {
			    var endBlockCommentIndex = contents.indexOf('*/');
			    if (endBlockCommentIndex!==-1) {
					contents = contents.substr(endBlockCommentIndex+2);
			    }
				window.scripted.config = JSON.parse(contents);
			}
		} catch (e) {
		  console.error("Unable to parse JSON config block: "+e);
		}
		if (window.scripted.config && window.scripted.config.ui && window.scripted.config.ui.navigator===false) {
			window.scripted.navigator=false; // default is true
		}
	}

	mEditor.editor.setInput("Content",null,'Loading...');
	
	window.editor = mEditor.editor;
	// Load editor contents - asynchronous activity
	mEditor.loadContents();

	// Create new FileExplorer
	var explorer  = new mExplorerTable.FileExplorer({
		//serviceRegistry: serviceRegistry, treeRoot: treeRoot, selection: selection,
		//searcher: searcher, fileClient: fileClient, commandService: commandService,
		//contentTypeService: contentTypeService,
		parentId: "explorer-tree"
		//breadcrumbId: "location", toolbarId: "pageActions",
	    //selectionToolsId: "selectionTools", preferences: preferences
	});
	
	
	require(["orion/explorer-table"],function(mExplorerTable) {
		// From orion table.js
		if (!window.scripted) {
		  window.scripted = {};
		}
		var filetoedit = window.location.search.substr(1);
		
		// need to find the nearest .project/.scripted/.git file or at most 5 dirs up
		var projectRootContext = null;
		var dir = filetoedit.substr(0,filetoedit.lastIndexOf("/"));
		var count = 0;
        var scriptedconfig;
        try {
			while (projectRootContext === null && dir.length!==0) {
				// does it contain a .project or .scripted?	
				var xhrobj = new XMLHttpRequest();
	            var url = 'http://localhost:7261/fs_list/'+dir;
	            //console.log("url is "+url);
	            xhrobj.open("GET",url,false); // TODO naughty? synchronous xhr
	            xhrobj.send();
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
	
				if (projectRootContext===null) {
					dir = dir.substr(0,dir.lastIndexOf("/"));
					count++;
					if (count===5) {
						projectRootContext = dir;
					}
				}
            }
        } catch (e2) {
            console.log("xhr failed "+e2);
        }
        if (projectRootContext===null) {
				projectRootContext = filetoedit.substr(0,filetoedit.lastIndexOf("/"));
        }
        // Was there a .scripted file?
		if (scriptedconfig) {
			loadScriptedConfig(scriptedconfig);
		}

		if(window.scripted.navigator === false){
			$('#editor').css('margin-left', 0);
		}
		
		// Set to the root for the navigator
		window.fsroot=projectRootContext;
	
		if (window.scripted.navigator === undefined || window.scripted.navigator === true) {
			explorer.loadResourceList(projectRootContext/*pageParams.resource*/, false, function() {
					//	mGlobalCommands.setPageTarget(explorer.treeRoot, serviceRegistry, commandService, null, /* favorites target */explorer.treeRoot);
					// highlight the row we are using
					explorer.highlight(filetoedit);
			});
		} else {
			$('#editor').css("left","0px");
			$('#explorer-tree').remove();
		}
	});

	// Ugh...CSS sucks so we have to dynamically resize #main with javascript.  There has to be a CSS solution for this but most involve absolute/fixed position which breaks #editor.  

	var footer_height = $('footer').height();
	var header_height = $('header').height();

	$('#main').height(
		$(window).height() - 
		footer_height - 
		header_height
	);

	$(window).resize(function(){
		$('#main').height(
			$(window).height() - 
			footer_height - 
			header_height
		);
		window.editor._textView._updatePage();
	});
	
	require(['jquery_ui'], function(mJqueryUI){
		var navigator_width = $('#navigator-container').width();
		$('#navigator-wrapper').resizable({
			handles: "e",
			resize: function(event, ui){
				$('#editor').css('margin-left', ui.size.width);
				$('#pageToolbar').css('left', ui.size.width);
				window.editor._textView._updatePage();
			}
		});

		require(['jsrender'], function(mJsRender){

			var keyCodes = {};
			$.each($.ui.keyCode, function(key, value){
				keyCodes[value] = key;
			});

			$.views.converters({
				toChar: function(val){
					if (keyCodes[val] != null) return keyCodes[val];
					else if (val === 191) return "/";
					else if (val === 220) return "\\";
					else return String.fromCharCode(val);
				}
			});

			$.views.helpers({
				isMac: function(){
					return (window.navigator.platform.indexOf("Mac") !== -1);
				}
			});

			var command_file = "../templates/_command.tmpl.html";
			var keyBindings = window.editor._textView._keyBindings;

			$.get(command_file, null, function(template){
				var tmpl = $.templates(template);
				$('#command_list').append(tmpl.render(keyBindings));
			});

			window.editor._textView._updatePage();
		});
	});	
	
	var the_box = $('.hoverbox:first').show().clone();
	$('.hoverbox').remove();
	
	$('#the_button').on('click', function(){
		$('#hoverbox_panel').append(the_box);
		the_box = the_box.clone();
	});
	
	$('#hoverbox_panel').on('click', '.hoverbox_close', function(element){
		$(element.currentTarget.parentElement.parentElement).remove();
	});

	var help_panel_width = $('#help_panel').width();
	var hoverbox_panel_right = parseInt($('#hoverbox_panel').css('right'), 10);
	
	var help_close;

	var help_open = function(){
		$('#editor').css('margin-right', help_panel_width);
		window.editor._textView._updatePage();
		$('#hoverbox_panel').css('right', hoverbox_panel_right + help_panel_width);
		$('#help_panel').show();
		$('#help_open').off('click');
		$('#help_open').on('click', help_close);
	};

	help_close = function(){
		$('#editor').css('margin-right', '0');
		window.editor._textView._updatePage();
		$('#hoverbox_panel').css('right', hoverbox_panel_right);
		$('#help_panel').hide();
		$('#help_open').off('click');
		$('#help_open').on('click', help_open);
	};
	
	$('#help_open').click(help_open);

	//this little bit fixes the cursor disappearing problem in firefox.  probably the hackiest workaround i've come up with, but it works.  
	//if we ever add an anchor tag anywhere, we can use that instead of this fix.  
	$('header').append('<a href="#" id="cursor_fix">.</a>');
	$('#cursor_fix').focus().remove();
});

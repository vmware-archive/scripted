/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andrew Eisenberg
 *     Brian Cavalier
 ******************************************************************************/
define(['require', "jquery", "scripted/utils/navHistory", "scripted/utils/pageState", "scripted/utils/editorUtils", "scripted/utils/storage",
"scripted/exec/exec-on-load"],

function(require, $, mNavHistory, mPageState, editorUtils, storage, execOnLoad) {

	return {

		doLayout: function(fileExplorer, pageState) {
			// TODO do the same for other dom nodes
			var editorNode = $(this.editorNode);
			mNavHistory.setupPage(pageState, false);

//			require(['jquery_ui'], function() {
				/*Resizable navigator*/
				var nav = $('#navigator-wrapper');
				nav.resizable({
					handles: "e"
				});

				nav.resize(function() {
					var width = $('#navigator-wrapper').width();
					editorNode.css('margin-left', width);
					editorUtils.getMainEditor().getTextView()._updatePage();
					storage.unsafeStore("scripted.navigatorWidth", width);
				});

				if (window.navigator) {
					// use last size if known
					var storedWidth = storage.get("scripted.navigatorWidth");
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

				sidePanel.resize(function() {
					var side_width = sidePanel.width();
					editorNode.css('margin-right', side_width);
					sidePanel.css('left', '');

					var side_percent = (side_width / $('#editor_wrapper').width()) * 100;
					sidePanel.css('width', side_percent + "%");

					if (editorUtils.getMainEditor()) {
						editorUtils.getMainEditor().getTextView()._updatePage();
						var subEditor = editorUtils.getSubEditor();
						if (subEditor) {
							subEditor.getTextView().update();
						}
						storage.unsafeStore("scripted.sideWidth", side_width);
					}
				});

				//Make sure the keyhelp UI is setup. We do this asynchronously since its initially
				//invisible and its not necessary to hold up the editor for this.
				require(['scripted/keybindings/keyhelp'], function(mKeyHelp) {
					//console.log('Keybindings help-panel is ready');
				});


				$('#side_toggle').on('click', mNavHistory.toggleSidePanel);

				/*Position elements correctly on page*/
				var footer_height = $('footer').outerHeight();
				var header_height = $('header').outerHeight();
				var breadcrumb_height = $('#breadcrumb').outerHeight();
				var main_height = $(window).height() - footer_height - header_height;

				$('#main').height(main_height);

				editorNode.mouseenter(function() {
					$('.breadcrumb_menu').hide();
				});
				$('#navigator-wrapper').mouseenter(function() {
					$('.breadcrumb_menu').hide();
				});

				$('#help_panel').css('top', header_height + "px");
				editorNode.height($('#main').height() - breadcrumb_height);

				$(window).resize(function(e) {
					var main_height = $(window).height() - footer_height - header_height;
					var console_height = ($('#console_wrapper').css('display') === 'none') ? 0 : $('#console_wrapper').outerHeight() || 0;
					var editor_height = main_height - breadcrumb_height - console_height;

					$('#main').height(main_height);
					$('#side_panel').height(main_height);

					var sideHeight = $('#side_panel').height();
					var subeditorMargin = parseInt($('.subeditor_wrapper').css('margin-top'), 10);

					$('.subeditor_wrapper').height(sideHeight - (subeditorMargin * 2));
					$('.subeditor').height(
					$('.subeditor_wrapper').height() - $('.subeditor_titlebar').height());

					editorNode.height(editor_height);
					var side_width = ($('#side_panel').css('display') === 'block') ? $('#side_panel').width() : 0;
					editorNode.css('margin-right', side_width);

					if (editorUtils.getMainEditor()) {
						editorUtils.getMainEditor().getTextView()._updatePage();
					}
				});

				$(window).bind('beforeunload', function() {
					var subEditor = editorUtils.getSubEditor();
					var mainItem = mPageState.generateHistoryItem(editorUtils.getMainEditor());
					var subItem = subEditor ? mPageState.generateHistoryItem(subEditor) : null;
					mPageState.storeBrowserState(mainItem, subItem, false);
				});

				$(window).bind('beforeunload', function() {
					if (editorUtils.getMainEditor().isDirty() || (editorUtils.getSubEditor() && editorUtils.getSubEditor().isDirty())) {
						return "There are unsaved changes.";
					}
				});

				$(document).ready(function() {
					execOnLoad.installOn(window.fsroot);
					/* setTimeout so popstate doesn't fire on initial page load */
					window.setTimeout(function() {
						$(window).bind('popstate', mNavHistory.popstateHandler);
					}, 1);
				});

				////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
				// HACK sections
				// Here we do a few things that are not pretty, but is the only way to get things working in all the browsers

				////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
				// CHROME section
				// clears back-forward cache in chrome
				$(window).unload(function() {});


				////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
				// FIREFOX section

				// Fix disappearing caret
				// if we ever add an anchor tag anywhere, we can use that instead of this fix.
				editorUtils.getMainEditor().cursorFix(editorNode);
//			});
		},
		
		setNavigatorHidden : function(doit, fileExplorer) {
			if (doit) {
				window.scripted.navigator=false; // default is true
				$('#navigator-wrapper').hide();
				this.editorNode.css('margin-left', 0);
				this.editorNode.css("left", "0px");
				$('#explorer-tree').remove();
			} else {
				var pageState = mPageState.extractPageStateFromUrl(window.location.toString());
				fileExplorer.loadResourceList(window.fsroot /*pageParams.resource*/ , false, function() {
					// highlight the row we are using
					setTimeout(function() {
						fileExplorer.highlight(pageState.main.path);
					}, 500);
				});
			}
		}
		
	};
});
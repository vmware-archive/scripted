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
define(['require', "jquery", "scripted/utils/navHistory", "scripted/utils/pageState",
		"scripted/utils/editorUtils", "scripted/utils/storage", "scripted/exec/exec-on-load"],
function(require, $, mNavHistory, mPageState, editorUtils, storage, execOnLoad) {

	// Initialize navigator state
	var navigatorVisible = false;
	navigatorVisible = storage.getBoolean(storage.preferenceNavigatorVisible);
	if (typeof navigatorVisible === 'undefined') {
		navigatorVisible = true;
		storage.safeStoreBoolean(storage.preferenceNavigatorVisible,navigatorVisible);
	}

	// parameter is optional. No parameter = switch state. Parameter = force state.
	var toggleNavigatorVisible = function(isVisible) {
		if (typeof isVisible !== 'undefined' ) {
			navigatorVisible = isVisible;
		} else {
			navigatorVisible = !navigatorVisible;
		}
		storage.safeStoreBoolean(storage.preferenceNavigatorVisible,navigatorVisible);
		this.updatePageElements();
	};

	/* Position the pieces of the page */
	var updatePageElements =  function() {

		var editorNode = $(this.editorNode);  // injected through wire
		var breadcrumb = $('#breadcrumb');
		var nav = $('#navigator-wrapper');
		var helpPanel = $('#help_panel');
		var main = $('#main');

		var footer_height = $('footer').outerHeight();
		var header_height = $('header').outerHeight();
		var breadcrumb_height = $('#breadcrumb').outerHeight();
		var main_height = $(window).height() - footer_height - header_height;

		main.height(main_height);
		helpPanel.css('top', header_height + "px");
		editorNode.height(main.height() - breadcrumb_height);
		if (navigatorVisible) {
			nav.show();
			// use last size if known
			var storedWidth = storage.get(storage.preferenceNavigatorWidth);
			if (!storedWidth) {
				storedWidth = 200;
			}
			nav.width(storedWidth);
			nav.resize();
//			breadcrumb.width(editorNode.width());
			breadcrumb.css('margin-left',editorNode.css('margin-left'));
			breadcrumb.trigger('widthchange');
		} else {
			nav.hide();
			editorNode.css('margin-left', 0);
			editorNode.css("left", "0px");
//			breadcrumb.width(editorNode.width());
			breadcrumb.css('margin-left',editorNode.css('margin-left'));
			breadcrumb.trigger('widthchange');
		}
	};


	return {

		toggleNavigatorVisible: toggleNavigatorVisible,

		/*
		 * Positions the components based on the current configuration. Can be called when something
		 * has caused a change, for example the navigator being hidden/shown.
		 */
		updatePageElements: updatePageElements,

		doLayout: function(fileExplorer, pageState) {
			var editorNode = $(this.editorNode);  // injected through wire
			var breadcrumb = $('#breadcrumb');
			mNavHistory.setupPage(pageState, false);

			/*Resizable navigator*/
			var nav = $('#navigator-wrapper');
			nav.resizable({
				handles: "e"
			});

			nav.resize(function() {
				var width = $('#navigator-wrapper').width();
				editorNode.css('margin-left', width);
				// TODO not the right way to do this
				editorUtils.getMainEditor().getTextView()._update();
				storage.unsafeStore(storage.preferenceNavigatorWidth, width);
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

				$('.subeditor_titlebar').trigger('widthchange');
				if (editorUtils.getMainEditor()) {
					// TODO proper way to do this
					editorUtils.getMainEditor().getTextView()._update();
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

			// add live reloading support
			require(['scripted/application-manager']);

			require(['scripted/editor/themeManager']);

			$('#side_toggle').on('click', mNavHistory.toggleSidePanel);

			var footer_height = $('footer').outerHeight();
			var header_height = $('header').outerHeight();
			var breadcrumb_height = $('#breadcrumb').outerHeight();
			this.updatePageElements();

			editorNode.mouseenter(function() {
				$('.breadcrumb_menu').hide();
			});
			$('#navigator-wrapper').mouseenter(function() {
				$('.breadcrumb_menu').hide();
			});

			var that = this;

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
			//	breadcrumb.width(editorNode.width());
				breadcrumb.css('margin-left',editorNode.css('margin-left'));
				breadcrumb.trigger('widthchange');
				var side_width = ($('#side_panel').css('display') === 'block') ? $('#side_panel').width() : 0;
				editorNode.css('margin-right', side_width);

				if (editorUtils.getMainEditor()) {
					editorUtils.getMainEditor().getTextView()._update();
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
		}

	};
});

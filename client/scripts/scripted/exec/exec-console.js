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
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/

/*global $*/

///////////////////////////////////////////////////////////////////////////////////
// This module is supposed to provide a console-like api for displaying messages.
// as well as some basic operations to reveal/hide the console.

//TODO: We are now also using this console to display error messages. For example
// when problems parsing .scripted file.

//So 'exec-console' is not a good name for this module.

define(["jquery", "jquery_ui"], function () {

	/**
	 * Maximum number of log entries in the console. If more entries are
	 * added then the oldest entries are automatically deleted.
	 */
	var MAX_ENTRIES = 10;

	/**
	 * The id of the dom element to which we append console output.
	 */
	var CONSOLE_DISPLAY = "#console_display";
	
	/**
	 * The id of the dom element that represents the entire console UI.
	 */
	var CONSOLE_WRAPPER = "#console_wrapper";

	var initialized = false;
	
	/**
	 * A helper method that creates a dom element to display a given msg.
	 * For now all we know how to render is plain text messages.
	 */
	function render(msg, cssClass) {
		var elem = $('<div>', {text: msg});
		if (cssClass) {
			elem.addClass(cssClass);
		}
		return elem;
	}
	
	///// Managing the entries in the log (so we can limit their number) //////////////
	
	var entries = []; //Array with at most MAX_ENTRIES entries.
	var newEntryPos = 0; // next place to put an element, cycles around if running past the end.
	
	function addEntry(e) {
		var oldest = entries[newEntryPos];
		if (oldest) {
			oldest.remove();
		}
		entries[newEntryPos] = e;
		newEntryPos = (newEntryPos+1) % MAX_ENTRIES;
	}

	//////////////////// Public API ///////////////////////////////////////////////////

	/**
	 * Change the width and vertical position of the console UI to line up properly with
	 * the editor.
	 */
	function updateWidth() {
		var c = $(CONSOLE_WRAPPER);
		var e = $("#editor");
		function copyCss() {
			for (var i = 0; i < arguments.length; i++) {
				var name = arguments[i];
				c.css(name, e.css(name));
			}
		}
		copyCss('margin-left', 'margin-right', 'width');
	}

	/**
	 * This method should be called by the editor setup at a good time (i.e. when editor has
	 * mostly been setup.
	 */
	function initialize() {
		if (!initialized) {
			initialized = true;
			$(CONSOLE_WRAPPER).resizable({
				handles: "n"
			});
			$(CONSOLE_WRAPPER).resize(function (event, ui) {
				var console_height = ui.size.height;
				var breadcrumb_height = $('#breadcrumb').outerHeight();
				var editor_height = $('#main').height() - breadcrumb_height - console_height;
				$(CONSOLE_WRAPPER).css('top', '0px'); //I think JQuery resizable is changing this from 0 but it messes things up.
				$(CONSOLE_WRAPPER).height(console_height);
				$("#editor").height(editor_height);
				window.editor._textView._updatePage();
				updateWidth();
			});
			$("#navigator-wrapper").resize(updateWidth);
			$("#side_panel").resize(updateWidth);
		}
	}
	
	function isVisible() {
		return $(CONSOLE_WRAPPER).css('display')!=='none';
	}
	
	function show() {
		initialize();
		var c = $(CONSOLE_WRAPPER);
		var e = $("#editor");
		if (!isVisible()) { 
			//TODO: should remember previous size not reset to 1/3 of the screen.
			//If the console is presently hidden...
			var editor_height = e.height();
			var console_height = $(CONSOLE_WRAPPER).height() || (editor_height / 3);
			editor_height = editor_height - console_height;
			
			var overhead = c.outerHeight() - c.height();
			
			c.css('display', 'block');
			c.height(console_height-overhead);
			e.height(editor_height);
			c.resizable({
				disabled: false
			});

			window.editor._textView._updatePage();
			updateWidth();
		}
	}
	
	function hide() {
		if (isVisible()) {
			var c = $(CONSOLE_WRAPPER);
			var e = $("#editor");
			var console_height = c.outerHeight();
			c.css('display', 'none');
			c.resizable({
				disabled: true
			});
			e.height(e.height()+console_height);
			window.editor._textView._updatePage();
		}
	}
	
	function toggle() {
		if (isVisible()) {
			hide();
		} else {
			show();
		}
	}
	
	function scrollToBottom() {
		var c = $(CONSOLE_DISPLAY);
		var scrollH = c.prop("scrollHeight");
		var H = c.height();
		if (H < scrollH) {
			c.scrollTop(scrollH-H);
		}
	}
	
	/**
	 * Append a message to the console.
	 * An optional cssClass parameter allows tagging the
	 * element in the view with a specific cssClass. (so that it's
	 * look can be customized via css).
	 *
	 * @param String msg
	 * @param String cssClass
	 */
	function log(msg, cssClass) {
		cssClass = cssClass || 'log';
		show();
		var e = render(msg, cssClass);
		$(CONSOLE_DISPLAY).append(e);
		addEntry(e);
		scrollToBottom();
	}
	
	$(document).ready(function () {
		$('#console_toggle').on('click', toggle);
		$('#side_panel').bind('open', updateWidth);
		$('#side_panel').bind('close', updateWidth);
		$(window).resize(updateWidth);
	});

	return {
		log: log,
		error: function (msg) {
			log(msg, 'error');
		}
	};

});


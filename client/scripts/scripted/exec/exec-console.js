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

///////////////////////////////////////////////////////////////////////////////////
// This module is supposed to provide a console-like api for displaying messages.
// as well as some basic operations to reveal/hide the console.

define(["jquery", "jquery_ui"], function () {

	/**
	 * The id of the dom element to which we append console output.
	 */
	var CONSOLE_DISPLAY = "#console_wrapper"; 

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

	//////////////////// Public API ///////////////////////////////////////////////////

	/**
	 * This method should be called by the editor setup at a good time (i.e. when editor has
	 * mostly been setup.
	 */
	function initialize() {
		if (!initialized) {
			initialized = true; 
			$(CONSOLE_DISPLAY).resizable({
				handles: "n"
			});
			$(CONSOLE_DISPLAY).resize(function (event, ui) {
				var console_height = ui.size.height;
				var breadcrumb_height = $('#breadcrumb').outerHeight();
				var editor_height = $('#main').height() - breadcrumb_height - console_height;
				$(CONSOLE_DISPLAY).css('top', '0px'); //I think JQuery resizable is changing this from 0 but it messes things up.
				$(CONSOLE_DISPLAY).height(console_height);
				$("#editor").height(editor_height);
				window.editor._textView._updatePage();
			});
		}
	}
	
	function show() {
		initialize();
		var c = $(CONSOLE_DISPLAY);
		var e = $("#editor");
		if (c.css('display')==='none') { 
			//If the console is presently hidden...
			var editor_height = e.height();
			var console_height = editor_height / 3;
			editor_height = editor_height - console_height;
			
			var overhead = c.outerHeight() - c.height();
			
			c.css('display', 'block');
			c.height(console_height-overhead);
			e.height(editor_height);
			window.editor._textView._updatePage();
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
		scrollToBottom();
	}

	function hide() {
	//TODO: this code is not really correct.
//		var c = $(CONSOLE_DISPLAY);
//		var e = $("#editor");
//		if (c.css('display')==='block') { 
//			//If the console is presently shown...
//			var editor_height = e.height();
//			var console_height = c.outerHeight();
//			var padding = consoleHeig
//			editor_height = editor_height - console_height;
//			
//			c.css('display', 'block');
//			c.height(console_height);
//			e.height(editor_height);
//			window.editor._textView._updatePage();
//		}
	}

	return {
		log: log,
		error: function (msg) {
			log(msg, 'error');
		}
	};

});


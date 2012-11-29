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
 *     Kris De Volder
 ******************************************************************************/
/*global $*/

// Self contained implementation of the help panel.
// should be loaded by the main app somehow.
// When loaded it sets itself up without requiring any further help
// from the main app.

define(['jsrender', 'jquery', './keybinder', './keystroke', './keyedit'],
function (mJsRender, mJquery, mKeybinder, mKeystroke, mKeyedit) {

	var attachKeyEditor = mKeyedit.attachKeyEditor;

	var names = (function () {
		/* Load keyboard shortcuts*/
		var xhrobj = new XMLHttpRequest();
		var url = '/resources/shortcut.json';
		xhrobj.open("GET", url, false); // TODO naughty? synchronous xhr
		xhrobj.send();
		return JSON.parse(xhrobj.responseText).names;
	}());

	function getSortedKeybindings() {
		// use a copy so we can sort
		var keyBindings = window.editor.getTextView()._keyBindings.filter(function (kb) { return kb.name; });
		
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

		//This code removes duplicates, i.e. actions that are bound to more than one
		//key are reported only once. Arguably this is wrong... since that means
		//we won't be able to see the alternate keybindings in the help panel!
//		for (var i = 0; i < keyBindings.length; i++){
//			if (keyBindings[i].name === lastShortcut) {
//				keyBindings.splice(i,1);
//			}
//			lastShortcut=keyBindings[i].name;
//		}
		
		return keyBindings;
	}
	
	/**
	 * Render or re-render the current keybindings to the help side panel.
	 */
	function renderKeyHelp() {
	
		$.views.converters({
			toKeystroke: mKeystroke.fromKeyBinding,
			toShortcutName: function(name){
				if (names[name]) { return names[name]; }
				else { return name; }
			}
		});

		var command_file = "/resources/_command.tmpl.html";
		
		var keyBindings = getSortedKeybindings();
		
		var importantKeyBindings = [];
		var otherKeyBindings = [];
		
		for (var i = 0; i < keyBindings.length; i++){
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
			
			function render(it, into) {
				if (Array.isArray(it)) {
					for (var i = 0; i < it.length; i++) {
						render(it[i], into);
					}
				} else {
				    var element = $(tmpl.render(it));
				    attachKeyEditor(element, it.name, mKeystroke.fromKeyBinding(it.keyBinding));
					into.append(element);
				}
			}
		
			var cl = $('#command_list');
			
			cl.empty();
			render(importantKeyBindings, cl);
			cl.append('<li><hr /></li>');
			render(otherKeyBindings, cl);
			cl.append('<li><hr /></li>');
			render(
				mKeybinder.getUnboundActionNames(window.editor).map(function (name) {
					return {
						name: name
					};
				}),
				cl
			);
			
		});

		window.editor._textView._updatePage();
	}
	
	/*Command help panel*/
	var help_close, help_open;
	
	var isOpen = false;

	help_open = function (){
		renderKeyHelp();
		isOpen = true;
		$('#help_panel').show();
		$('#help_open').off('click');
		$('#help_open').on('click', help_close);
	};

	help_close = function(){
		$('#command_list').empty(); //destroy... saves memory?
		isOpen = false;
		$('#help_panel').hide();
		$('#help_open').off('click');
		$('#help_open').on('click', help_open);
	};
	
	$('#help_open').on('click', help_open);
	$('#help_panel').on('refresh', function () {
		if (isOpen) { //Don't bother to render if the panel is not visible.
			renderKeyHelp();
		}
	});
	
});
		

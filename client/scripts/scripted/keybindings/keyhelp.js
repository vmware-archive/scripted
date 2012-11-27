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

define(['jsrender', 'jquery', './keybinder', './keystroke'],
function (mJsRender, mJquery, mKeybinder, mKeystroke) {

	/**
	 * Render or re-render the current keybindings to the help side panel.
	 */
	function renderKeyHelp() {
		/* Load keyboard shortcuts*/
		var xhrobj = new XMLHttpRequest();
		var url = '/resources/shortcut.json';
		xhrobj.open("GET", url, false); // TODO naughty? synchronous xhr
		xhrobj.send();
		var names = JSON.parse(xhrobj.responseText).names;
		
		$.views.converters({
			toKeystroke: mKeystroke.fromKeyBinding,
			toShortcutName: function(name){
				if (names[name]) { return names[name]; }
				else { return name; }
			}
		});

		var command_file = "/resources/_command.tmpl.html";
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
			var cl = $('#command_list');
			cl.empty();
			cl.append(tmpl.render(importantKeyBindings));
			cl.append('<li><hr /></li>');
			cl.append(tmpl.render(otherKeyBindings));
			cl.append('<li><hr /></li>');
			cl.append(tmpl.render(
				mKeybinder.getUnboundActionNames(window.editor).map(function (name) {
					return {
						name: name
					};
				})
			));
		});

		window.editor._textView._updatePage();
	}
	
	/*Command help panel*/
	var help_close, help_open;

	help_open = function (){
		renderKeyHelp();
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
	
});
		

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
 *   Kris De Volder
 ******************************************************************************/

//
// A plugin that contributes an 'action' to scripted.
//
// An action is something that can be executed on an editor. It is typically bound
// to some keybinding. To bind it... the keybinder UI (or API?) must be used. We are not
// providing the means to bind keys to actions here, we only provide the means to define
// the actions themselves.

define(function(require) {

	var editorApi = require('scripted/api/editor-extensions');

	//Defines an editor action.
	editorApi.setAction('allCaps', {
		name: 'All Caps', // readable description
		handler: function (editor) {
			var sel = editor.getSelection();
			var text = editor.getText(sel.start, sel.end);
			text = text.toUpperCase();
			editor.setText(text, sel.start, sel.end);
		}
	});


});
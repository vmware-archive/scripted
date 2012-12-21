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
 *     Kris De Volder
 ******************************************************************************/

//
// This module provides a function to obtain a reference to the 'current'
// editor.
//

/*global $*/

define(['scripted/pane/paneFactory', 'jquery'], function (mPaneFactory) {

	var lastEditor = null;

	//This is an event published by scriptedEditor.js
	$(document).on('editorFocus', function (evt, editor) {
		//console.log('editorFocus: '+t);
		lastEditor = editor;
	});
	
	function isOk(editor) {
		var tv = editor && editor.getTextView();
		return tv && !tv.isDestroyed();
	}

	return {
		/**
		 * Get a reference to the 'current' editor. This is the last editor that got focus.
		 * If this editor has since been detroyed, then it is the main editor.
		 * <p>
		 * If this function gets called before any editor got created then this may
		 * return undefined
		 *
		 * @return {Editor}
		 */
		getCurrentEditor : function() {
			return isOk(lastEditor) && lastEditor || this.getMainEditor();
		},
		
		getMainEditor : function() {
			var main = mPaneFactory.getMainPane();
			return main ? main.editor : null;
		},
	
		getSubEditor : function() {
			var sub = mPaneFactory.getPane("scripted.editor");
			return sub ? sub.editor : null;
		}
	};
});
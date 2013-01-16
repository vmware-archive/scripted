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

	function getMainEditor() {
		var main = mPaneFactory.getMainPane();
		return main ? main.editor : null;
	}
	
	function getSubEditors() {
		return mPaneFactory.getPanes("scripted.editor").map(function (pane) {
			return pane.editor;
		});
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
		getMainEditor :getMainEditor,
		getSubEditor : function() {
			var sub = mPaneFactory.getPane("scripted.editor");
			return sub ? sub.editor : null;
		},
		getSubEditors : getSubEditors,
		/**
		 * Do something with each editor (the main editor and all subeditors).
		 * The 'iteration' can be aborted prematurely by returning a true value
		 * from the doFun. If so, then the true value will be returned as
		 * a result of the iteration as well.
		 */
		eachEditor: function (doFun) {
			var abort = doFun(getMainEditor());
			if (abort) {
				return abort;
			}
			var subeditors = getSubEditors();
			if (subeditors) {
				for (var i = 0; i < subeditors.length; i++) {
					abort = doFun(subeditors[i]);
					if (abort) {
						return abort;
					}
				}
			}
			return abort;
		},
		
		/**
		 * Sets the focus on an editor
		 * @param Boolean isSub if truthy, set focus on sub editor if one exists.  If falsy, set focus to main editor
		 */
		setFocus : function(isSub) {
			var editorPane;
			if (isSub) {
				editorPane = mPaneFactory.getPane("scripted.editor");
			} else {
				editorPane = mPaneFactory.getMainPane();
			}
			if (editorPane) {
				editorPane.setFocus();
			}
		}
	};
});
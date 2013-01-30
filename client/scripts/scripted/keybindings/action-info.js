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
// This module provides some operations to retrieve certain kinds of
// information about 'actions' that are registered with the scripted
// editor.

define(function (require) {

	var editorUtils = require('scripted/utils/editorUtils');
	
	/**
	 * This map contains additional information that we(scripted) want to
	 * associate with orions actions without modifying orion code.
	 */
	var descriptions = {
		//Note: orion now has a facility for attaching a readable name to an editor action
		// when it is defined... but not all orion-defined actions actually have readable
		// names. So here we keep our own readable names for the missing ones.
		
		"charNext": "Next Character",
		"charPrevious": "Previous Character",
		"deleteNext": "Delete Next Character",
		"deletePrevious": "Delete Previous Character",
		"deleteWordNext": "Delete Next Word",
		"deleteWordPrevious": "Delete Previous Word",
		"enter": "Enter",
		"enterAfter": "Insert Newline at End of line",
		"lineDown": "Line Down",
		"lineEnd": "Line End",
		"lineStart": "Line Start",
		"lineUp": "Line Up",
		"pageDown": "Page Down",
		"pageUp": "Page Up",
		"selectAll": "Select All",
		"selectCharNext": "Select Next Character",
		"selectCharPrevious": "Select Previous Character",
		"selectLineDown": "Select Line Down",
		"selectLineEnd": "Select Line End",
		"selectLineStart": "Select Line Start",
		"selectLineUp": "Select Line Up",
		"selectPageDown": "Select Page Down",
		"selectPageUp": "Select Page Up",
		"selectTextEnd": "Select Text End",
		"selectTextStart": "Select Text Start",
		"selectWholeLineDown" : "Select Whole Line Down",
		"selectWholeLineUp" : "Select Whole Line Up",
		"selectWordNext": "Select Next Word",
		"selectWordPrevious": "Select Previous Word",
		"tab": "Tab",
		"textEnd": "Go To End",
		"textStart": "Go To Beginning",
		"wordNext": "Next Word",
		"wordPrevious": "Previous Word",
		"scrollPageUp": "Scroll Page Up",
		"scrollPageDown": "Scroll Page Down",
		"centerLine": "Center Editor on Line",
		"deleteLineStart": "Delete to Start of Line",
		"deleteLineEnd": "Delete to End of Line",
		"enterNoCursor": "Insert Newline after Cursor",
		"copy": "Copy",
		"cut": "Cut",
		"paste": "Paste",
		
		//New?? Orion 1.0
		"toggleTabMode" : "Toggle Tab Mode",
		"toggleWrapMode" : "Toggle Wrap Mode",
		"scrollTextStart": "Scroll To Start",
		"scrollTextEnd": "Scroll To End",
		
		"scriptedKeyHelp": "Configure Key Bindings"
		//TODO: Most scripted specific keybindings are just using the readable description as
		// the action ID. Maybe this should be cleaned up.
		
//		"selectAll": "Select All",


	};

	/**
	 * Any action in this list is considered' global.
	 * Since in the current infrastructur, all keybinding actions are registered with
	 * an editor, these actions will simply be delegated to the
	 * (main) editor.
	 */
	 var globalActions = {
//		'lineUp',
//		'lineDown',
//		'charPrevious',
//		'charNext',
//		'pageUp',
//		'pageDown',
//		'lineStart',
//		'lineEnd',
//		'wordPrevious',
//		'wordNext',
//		'textStart',
//		'textEnd',
//		'lineUp',
//		'lineDown',
//		'selectLineUp',
//		'selectLineDown',
//		'selectCharPrevious',
//		'selectCharNext',
//		'selectPageUp',
//		'selectPageDown',
//		'selectWholeLineUp',
//		'selectWholeLineDown',
//		'selectLineStart',
//		'selectLineEnd',
//		'selectWordPrevious',
//		'selectWordNext',
//		'selectTextStart',
//		'selectTextEnd',
//		'deletePrevious',
//		'deletePrevious',
//		'deleteNext',
//		'deleteWordPrevious',
//		'deleteWordPrevious',
//		'deleteWordNext',
//		'tab',
//		'enter',
//		'enterAfter',
//		'selectAll',
//		'copy',
//		'paste',
//		'cut',
//		'Undo',
//		'Redo',
//		'Content Assist',
//		'Find...',
//		'Find Next Occurrence',
//		'Find Previous Occurrence',
//		'Incremental Find',
//		'Unindent Lines',
//		'Move Lines Up',
//		'Move Lines Down',
//		'Copy Lines Up',
//		'Copy Lines Down',
//		'Delete Lines',
//		'Goto Line...',
//		'Last Edit Location',
//		'Toggle Line Comment',
//		'Add Block Comment',
//		'Remove Block Comment',
		'Command Help': true,
//		'Format text',
		'Save' : true,
//		'Cancel Current Mode',
		'Find File Named...' : true,
//		'Show Outline',
//		'Open declaration in same editor',
//		'Open declaration in new tab',
//		'Open declaration in other editor',
		'Look in files' : true,
//		'Switch Subeditor and Main Editor',
		'Toggle Subeditor' : true
	 };
	
	/**
	 * Retrieve a 'user friendly' description for an internal action name.
	 * This is the text that will be used to identify the action in the
	 * help panel and keybinding UI.
	 */
	function getActionDescription(actionID) {
		var editor = editorUtils.getMainEditor();
		if (editor) {
			var orionDesc = editor.getTextView().getActionDescription(actionID);
			orionDesc = orionDesc && orionDesc.name;
			return orionDesc || descriptions[actionID] || actionID;
		}
		return actionID;
	}
	
	/**
	 * Fetch 'Set' of global actions associated with an editor. The properties of the map
	 * are all action names registered with the editor that are marked as global actions.
	 * Note that an action can be
	 * marked as global either by setting a 'global' property on the action handler
	 * or by having its name configured in the 'globalActions' constant defined above.
	 */
	function getGlobalActions(editor) {
		var result = {};
		//TODO: use public api in the orion editor? There's now a getActions method.
		// Also orion actions have a 'description' object in which we may be able to
		// tag actions as global.
		var actions = editor.getTextView()._actions;
		for (var i = 0; i < actions.length; i++) {
			var a = actions[i];
			if (a.name) {
				//Two ways to mark actions global, either in the 'globalActions' table
				//or by having a 'global' property on the action's userHandler.
				if (globalActions[a.name] || a.userHandler && a.userHandler.global) {
					result[a.name] = a; // We only need 'true' but maybe the action object
					                    // may be useful somehow.
				}
			}
		}

		return result;
	}
	
	
	return {
		getActionDescription: getActionDescription,
		getGlobalActions: getGlobalActions
		//isGlobalAction: isGlobalAction
	};

});
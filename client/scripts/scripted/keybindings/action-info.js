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

define([], function () {

	/**
	 * This map contains additional information that we(scripted) want to
	 * associate with orions actions without modifying orion code.
	 */
	var descriptions = {
		"charPrevious": "Previous Character",
		"charNext": "Next Character",
		"centerLine": "Center Editor on Line",
		"deletePrevious": "Delete Previous Character",
		"deleteNext": "Delete Next Character",
		"deleteWordPrevious": "Delete Previous Word",
		"deleteWordNext": "Delete Next Word",
		"deleteLineStart": "Delete to Start of Line",
		"deleteLineEnd": "Delete to End of Line",
		"enter": "Enter",
		"enterAfter": "Insert Newline at End of line",
		"enterNoCursor": "Insert Newline after Cursor",
		"lineUp": "Line Up",
		"lineDown": "Line Down",
		"lineStart": "Line Start",
		"lineEnd": "Line End",
		"pageUp": "Page Up",
		"pageDown": "Page Down",
		"scrollPageUp": "Scroll Page Up",
		"scrollPageDown": "Scroll Page Down",
		"selectAll": "Select All",
		"selectLineUp": "Select Line Up",
		"selectLineDown": "Select Line Down",
		"selectWholeLineDown" : "Select Whole Line Down",
		"selectWholeLineUp" : "Select Whole Line Up",
		"selectCharPrevious": "Select Previous Character",
		"selectCharNext": "Select Next Character",
		"selectPageUp": "Select Page Up",
		"selectPageDown": "Select Page Down",
		"selectLineStart": "Select Line Start",
		"selectLineEnd": "Select Line End",
		"selectWordPrevious": "Select Previous Word",
		"selectWordNext": "Select Next Word",
		"selectTextStart": "Select Text Start",
		"selectTextEnd": "Select Text End",
		"tab": "Tab",
		"textStart": "Go To Beginning",
		"textEnd": "Go To End",
		"wordPrevious": "Previous Word",
		"wordNext": "Next Word"
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
//		'Exec: echo intercepted ctr...',
//		'Exec: node releng/copychec...',
//		'Exec: date',
//		'Exec: ls -la',
		'Find File Named...' : true,
//		'Show Outline',
//		'Open declaration in same editor',
//		'Open declaration in new tab',
//		'Open declaration in other editor',
		'Look in files' : true
//		'Switch Subeditor and Main Editor',
//		'Toggle Subeditor',
	 };
	
	/**
	 * Retrieve a 'user friendly' description for an internal action name.
	 * This is the text that will be used to identify the action in the
	 * help panel and keybinding UI.
	 */
	function getActionDescription(actionName) {
		return descriptions[actionName] || actionName;
	}
	
	/**
	 * Determine if an action registered with the editor
	 * is 'global' which means we would expect it to work even when the
	 * editor does not have focus.
	 */
	function isGlobalAction(actionName) {
		return globalActions[actionName] || false;
	}
	
	return {
		getActionDescription: getActionDescription,
		isGlobalAction: isGlobalAction
	};

});
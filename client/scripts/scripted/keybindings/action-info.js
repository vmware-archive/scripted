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

	//Set this to true to show action ids instead of readable descriptions in the
	//keybinder UI. This is very helpful while editing the various lists defined in
	//this js file.
	var SHOW_ACTION_IDS_IN_UI = false;

	var eachEditor = require('scripted/utils/editorUtils').eachEditor;
	require('jquery');

	var deref = require('scripted/utils/deref');
	var editorUtils = require('scripted/utils/editorUtils');

	var actions = {};

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
		"tab": "Tab / Indent Lines",
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
	 * last editor that had focus before.
	 */
	 var globalActions = [
		'scriptedKeyHelp',
		'Save',
		'Find File Named...',
		'Look in files',
		'Toggle Subeditor'
	 ];

	/**
	 * Actions marked as 'trivial' by putting their ids in this list will be
	 * moved into the lower half of the keybinder UI.
	 */
	 var trivialActions = [
		'lineUp', 'lineDown',
		'charNext', 'charPrevious',
		'lineEnd', 'lineStart',
		'pageUp', 'pageDown',
		'redo', 'undo', 'selectAll',
		'selectCharNext', 'selectCharPrevious',
		'textEnd', 'textStart',
		'lastEdit',
		'selectLineDown',
		'selectLineEnd',
		'selectLineStart',
		'selectLineUp',
		'selectPageDown',
		'selectPageUp',
		'selectTextEnd',
		'selectTextStart',
		'selectWholeLineDown',
		'selectWholeLineUp',
		'selectWordNext',
		'selectWordPrevious',
		'wordNext',
		'wordPrevious',
		'deleteLines',
		'deleteWordNext',
		'deleteWordPrevious',
		'enterAfter',
		'tab',
		'shiftTab',
		'scriptedKeyHelp',
		'copyLinesUp',
		'copyLinesDown',
		'nextAnnotation',
		'previousAnnotation',
		'moveLinesUp',
		'moveLinesDown',
		'gotoLine'
	 ];

	/**
	 * Actions in this list will not
	 * be shown in the keybinding ui.
	 */
	 var hiddenActions = [
		'cut', 'copy', 'paste', 'enter',
		'collapseAll', 'collapse', 'expand', 'expandAll',
		'cancelMode', 'lineDown', 'lineUp',
		'deleteNext', 'deletePrevious',
		'charNext', 'charPrevious',
		'toggleTabMode', //TODO: Actually this one should not just be 'hidden' but forcibly
						// unbound. This mode produces weird effects should user accidentally deactivate
						// and then press 'Tab' key.

		//these are only active in the search popup window, can't currently rebind:
		'findNext', 'findPrevious'
	 ];

	 //TODO: Add a list of 'invalid' (for stuff like 'toggleTabMode')

	/**
	 * Write an value at the end of a chain of properties in a nested
	 * object structure. If the objects on the path of the chain don't
	 * exist yet, empty objects will be created.
	 */
	function put(object, props, val) {
		if (val!==undefined) {
			for (var i = 0; i < props.length; i++) {
				var p = props[i];
				if (i===props.length-1) {
					//last property in chain of props. Set it here.
					object[p] = val;
				} else {
					//middle property... follow prop chain and force creation of an
					//empty object if it its not there already.
					var next = object[p];
					if (!next) {
						next = {};
						object[p] = next;
					}
					object = next;
				}
			}
		}
	}

	function initActions() {
		for (var id in descriptions) {
			put(actions, [id, 'name'], descriptions[id]);
		}
		globalActions.forEach(function (id) {
			put(actions, [id, 'global'], true);
		});
		trivialActions.forEach(function (id) {
			put(actions, [id, 'category'], 'trivial');
		});
		hiddenActions.forEach(function (id) {
			put(actions, [id, 'category'], 'hidden');
		});
	}

	initActions();

	/**
	 * Retrieve a 'user friendly' description for an internal action name.
	 * This is the text that will be used to identify the action in the
	 * help panel and keybinding UI.
	 */
	function getActionDescription(actionID) {
		//TODO: Rename this to avoid confusion with orion's getActionDescription which returns
		// an optional info object rather than a String.
		var editor = editorUtils.getMainEditor();
		if (editor) {
			var orionDesc = editor.getTextView().getActionDescription(actionID);
			return deref(actions, [actionID, 'name']) || deref(orionDesc, ['name']) || actionID;
		}
		return actionID;
	}

	/**
	 * Action id's can be categorized into special categories. May imply some
	 * special treatment is required. Currently there are 2 categories that have
	 * special meaning. Any other categories or a missing category will be treated
	 * as a 'normal' action.
	 *
	 *  'hidden' actions are automatically filtered from the scripted keybinding UI.
	 *  'trivial' actions are shown in the bottom part of the keybinding UI.
	 *
	 * @return {String|undefined}
	 */
	function getCategory(actionID) {
		return deref(actions, [actionID, 'category']);
	}

	function setOf(strings) {
		var result = {};
		for (var i=0; i<strings.length; i++) {
			result[strings[i]] = true;
		}
		return result;
	}

	/**
	 * Fetch 'Set' of global actions associated with an editor. The properties of the map
	 * are all action names registered with the editor that are marked as global actions.
	 * Note that an action can be
	 * marked as global either by setting a 'global' property on the action handler
	 * or by having global property set in our own 'actions' table.
	 */
	function getGlobalActions(editor) {
		var tv = editor.getTextView();
		var actionIDs = tv.getActions(true);
		return setOf(actionIDs.filter(function(action) {
			return deref(actions, [action, 'global']) || deref(tv.getActionDescription(action), ['global']);
		}));
	}

	var handlers = {}; // All action handlers registered by plugins go in here.

	function setEditorAction(editor, actionID, handler) {
		var tv = editor.getTextView();
		var action = function() {
			handler(editor);
			return true; //stop event propagation.
		};
		tv.setAction(actionID, action);
	}

	function setAction(actionID, spec) {
		var handler = spec.handler;
		var options = spec;
		actions[actionID] = spec; //Erases any prior info associated with the action.
		handlers[actionID] = handler; //Keeping handlers separate... so we don't have to search for them
			                           // in the actions table. Not all actions in the table have user
			                           // defined handlers.
		eachEditor(function (editor) {
			setEditorAction(editor, actionID, handler, options);
		});
		$('#help_panel').trigger('refresh'); //TODO: correct way to do this would
		                                     // be to publish an event that means actions have changed
		                                     // not prod every UI element that might be interested.
	}

	$(document).on('paneCreated', function(event, pane) {
		var editor = pane.editor;
		if (editor) {
			for (var actionID in handlers) {
				if (handlers.hasOwnProperty(actionID)) {
					setEditorAction(editor, actionID, handlers[actionID]);
				}
			}
		}
	});

	return {
		setAction: setAction,
		getActionDescription: getActionDescription,
		getGlobalActions: getGlobalActions,
		getCategory: getCategory
		//isGlobalAction: isGlobalAction
	};

});
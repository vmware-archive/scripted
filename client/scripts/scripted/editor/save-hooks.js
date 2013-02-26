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

/*global define*/

//
// This module plays as an intermediary between 'scriptedEditor' and 'scripted/api/editor-extensions'
// So we don't have to expose low-level api via scripted/api modules.
//
// Both api/editor-extensions and scriptedEditor require this module. The api registers hook functions and
// the editor calls the hook function.
//

define(function(require) {

	var when = require('when');
	//var sequence = require('when/sequence');

	var preSaveHandlers = [];
	var isSorted = false; //Tracks whether the preSaveHandlers have already been sorted
						// based on priority.

	/**
	 * Ensures that handlers are sorted according to their numeric priority.
	 */
	function sort() {
		if (!isSorted) {
			preSaveHandlers.sort(function (a, b) {
				var ap = a.priority || 0;
				var bp = b.priority || 0;
				return bp - ap;
			});
			isSorted = true;
		}
	}

	/**
	 * This function should be called by the editor just before it is going to save
	 * the buffer contents. Receives a reference to the editor.
	 *
	 * If it returns a rejected promise or throws an exception then the editor should abort the save
	 * and display some type of error message somewhere.
	 */
	function preSaveHook(editor) {
		sort();

		//Call each of the handlers one by one in sequence until one of them
		//rejects. The preSaveHook returns a promise that rejects if any
		//of the promises where rejected.
		return when.reduce(preSaveHandlers,
			function (acc, handler, i) {
				return when(acc, function () {
					//console.log('handle index: '+i);
					return handler(editor, editor.getFilePath());
				});
			},
			true //IMPORTANT: may be anything except undefined...
				// because reduce behaves differently if no inital value is suplied!
		);
	}

	function onPreSave(handler) {
	    if (typeof(handler)!=='function') {
	        console.trace('onPreSave handler is not a function: '+handler);
	        return;
	    }
		isSorted = false; // handlers may no longer be sorted.
		preSaveHandlers.push(handler);
	}

	return {
		preSaveHook: preSaveHook,
		onPreSave: onPreSave
	};


});


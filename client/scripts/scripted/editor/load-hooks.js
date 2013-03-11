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

define(function(require) {

	//TODO: extract and reuse hook support from save-hooks (needed mostly if we need a
	// way to enforce order/sequenctiality on hook execution. Otherwise not so important.

	var eachCurrentAndFutureEditor = require('scripted/utils/editorUtils').eachCurrentAndFutureEditor;

	/**
	 * Add an editor hook function that should be executed exactly once on any existing and
	 * future editor after its contents is loaded.
	 *
	 * This works a lot like an event listener. I.e. it gets invoked when
	 * an 'editorLoaded' event fires. However, it also gets fired once on any existing
	 * editors that where already loaded up before the hook function got registered.
	 */
	function afterEditorLoaded(hookFun) {
		eachCurrentAndFutureEditor(function (editor) {
			editor.editorLoadedPromise.then(function () {
				hookFun(editor);
			});
		});
	}

	return {
		afterEditorLoaded: afterEditorLoaded
	};

});
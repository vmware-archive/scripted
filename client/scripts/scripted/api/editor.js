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
 *     Kris De Volder (VMWare) - initial API and implementation
 ******************************************************************************/

//
// This is meant to be or become a 'nice' and easy to use
// api for contributing functionality to the scripted editor.
//

define(function (require) {

	var when = require('when');

	console.log('Editor api loaded!');

	var saveHooks = require('scripted/editor/save-hooks');

	return {
		onSaveTransform: function (transformFun) {
			//Use lower-level preSave hook to grab editor text, apply transformFun
			//and put contents back into the editor.
			saveHooks.onPreSave(function (editor, path) {
				return when(undefined, function () {
					return transformFun(editor.getText(), path);
				}).otherwise(function (err) {
					//If something went wrong with this transform
					//don't reject the save. Just ignore that transform.
					if (err) {
						if (err.stack) {
							console.log(err.stack);
						} else {
							console.error(err);
						}
					}
					return when.resolve();
				}).then(function(newText) {
					if (typeof(newText)==='string') {
						//TODO: work harder at preserving selection even if text has shifted ?
						var oldSelection = editor.getSelection();
						//console.dir(oldSelection);
						editor.setText(newText);
						editor.setSelection(oldSelection.start, oldSelection.end);
					}
				});
			});
		},
		action: function (spec) {
			console.log('Someone is trying to define a custom action:');
			console.log(JSON.stringify(spec, null, '  '));

		}
	};

});
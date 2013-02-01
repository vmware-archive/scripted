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
	var deref = require('scripted/utils/deref');
	var actions = require('scripted/keybindings/action-info');

	console.log('Editor api loaded!');

	var saveHooks = require('scripted/editor/save-hooks');

	/**
	 * Create an accessor function to easily navigate a typical JSON like
	 * configuration object. The function acceps a variable number of arguments,
	 * each argument a property to navigate in the object. Navigation is 'safe'
	 * and returns the first 'falsy' value that is accessed in the navigation
	 * path.
	 */
	function makeConfigFunction(object) {
		return function() {
			var props = arguments;
			return deref(object, arguments);
		};
	}

	return {
		onSaveTransform: function (transformFun) {
			//TODO: there's no real guarantee the config is initialized by now
			// but mostly it will be ok unless someone saves really early on in the lifecycle.
			var config = makeConfigFunction(deref(window, ['scripted', 'config' ]));

			//Use lower-level preSave hook to grab editor text, apply transformFun
			//and put contents back into the editor.
			saveHooks.onPreSave(function (editor, path) {
				return when(undefined, function () {
					return transformFun(editor.getText(), path, config);
				}).otherwise(function (err) {
					//If something went wrong with this transform
					//don't reject the save. Just ignore that transform.
					if (err) {
						if (err.stack) {
							console.log(err);
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
						var oldScroll = editor.getScroll();

						editor.setText(newText);
						editor.setSelection(oldSelection.start, oldSelection.end);
						editor.setScroll(oldScroll);
					}
				});
			});
		},
		/**
		 * @param {{name:String,handler:Function,isGlobal:Boolean}} spec
		 */
		action: function (spec) {
			actions.setAction(spec.actionID || spec.name, spec.handler, spec);
		}
	};

});
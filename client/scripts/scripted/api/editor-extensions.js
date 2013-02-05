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

/*global define window require console */

//
// This is meant to be or become a 'nice' and easy to use
// api for contributing functionality to the scripted editor.
//

define(function (require) {

	var when = require('when');
	var deref = require('scripted/utils/deref');
	var actions = require('scripted/keybindings/action-info');

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

		/**
		 * Add a save transform function. The function is called just prior to
		 * saving the contents of the editor and is given a chance to transform the text
		 * in the editor.
		 *
		 * @param {function(text:String, path:String, configuration:function(...[String]):Object):[String]}
		 */
		addSaveTransform: function (transformFun) {

			//Use lower-level preSave hook to grab editor text, apply transformFun
			//and put contents back into the editor.
			saveHooks.onPreSave(function (editor, path) {
				//TODO: there's no real guarantee the config is initialized by now
				// but mostly it will be ok unless someone saves really early on in the lifecycle.
				var config = makeConfigFunction(deref(window, ['scripted', 'config' ]));
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
						//TODO: work harder at preserving selection relative to text
						// even if text has shifted ?
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
		 * Associate a handler function with a given actionID for all existing and future
		 * scripted editors. Any prior handlers assigned to the id are overwritten.
		 * <p>
		 * A readable 'name' option can be provided. This name will be used in places
		 * like the help side panel instead of the actionID.
		 * <p>
		 * A 'global' flag option can be provided. If set to a true value, then keybindings
		 * triggering this action will also trigger even if an editor does not have focus.
		 * Globally triggered actions will be redirected to the last editor that had
		 * focus.
		 *
		 * @param {String} actionID
		 * @param {{handler:function(Editor),name:?String,global:?Boolean}} spec
		 */
		setAction: function (actionID, spec) {
			actions.setAction(actionID, spec);
		}
	};

});
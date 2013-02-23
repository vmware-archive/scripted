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

	var editorUtils = require('scripted/utils/editorUtils');
	var annotationModule = require('orion/textview/annotations');

	var annotationManager = require('scripted/editor/annotationManager');

	var EditorAPI = require('scripted/api/editor-wrapper');

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
		 * @param {function(text:String, path:String, configuration:function(...String):Object):String?} transformFun
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
			var spectAdapter = Object.create(spec, {
				handler : { writable:false, configurable:false, enumerable: true,
					value: function(editor) {
						return spec.handler(new EditorAPI(editor));
				} }
			});
			actions.setAction(actionID, spectAdapter);
		},

		/**
		 * Load the supplied css data.
		 *
		 * @param {String} css
		 */
		loadCss: function(css) {
			var textnode = document.createTextNode(css);
			var cssref = document.createElement("style");
			cssref.setAttribute("rel","stylesheet");
			cssref.setAttribute("type","text/css");
			cssref.appendChild(textnode);
			document.getElementsByTagName("head")[0].appendChild(cssref);
		},

		/**
		 * Register a new annotation type. The name should use a dotted form, e.g. example.foo
		 * and the 'foo' will be used as a class for associated styling.
		 * The optional lineStyling determines if occurrences of this annotation will
		 * style the entire line or just a range on a line.
		 *
		 * @param {String} annotationTypeName
		 * @param {Boolean} [lineStyling] true if this annotation styles the line
		 */
		registerAnnotationType: function(annotationTypeName, lineStyling) {
			annotationManager.registerAnnotationType(annotationTypeName,lineStyling);
		},

		// TODO this API feels a little odd, maybe it would be better if it took two lists of annotations
		// but that means the caller will have to mess around locating them.
		// TODO this api doesn't belong here. It is an operation on an editor instance.
		// This api here is more of a place to add hooks to the editor 'class' that uniformally affect
		// all current and future editors behavior rather than the state of a single editor instance.
		// In this respect also, using 'getCurrentEditor' may be fragile and actions may not be added to
		// the right editor.
		/**
		 * Remove existing annotations of the specified types and add the new supplied annotations.
		 *
		 * @param [String] existingTypes array of names of existing annotation types to be removed
		 * @param [{text:String,type:String,start:?Number,end:?Number,line:?Number}] newAnnotations the array of new annotations to add
		 */
		replaceAnnotations: function(existingTypes, newAnnotations) {
			var editor = editorUtils.getCurrentEditor();
			annotationManager.ensureEditorConfiguredWithAnnotations(editor);
			var annotationModel = editor.getAnnotationModel();
			var textModel = annotationModel.getTextModel();
			var toRemove = [];
			if (existingTypes) {
				var existingIter = annotationModel.getAnnotations(0,textModel.getCharCount());
				while (existingIter.hasNext()) {
					var existingAnno = existingIter.next();
					for (var e=0; e<existingTypes.length; e++) {
						if (existingAnno.type===existingTypes[e]) {
							toRemove.push(existingAnno);
							break;
						}
					}
				}
			}
			var orionAnnotations = [];
			for (var a =0;a<newAnnotations.length;a++) {
				var annotation = newAnnotations[a];
				var start,end;
				if (annotation.start) {
					start = annotation.start;
					if (annotation.end) {
						end = annotation.end;
					} else {
						end = start+1;
					}
				} else {
					start = textModel.getLineStart(annotation.line-1);
					end = start+1;
				}
				orionAnnotations.push(annotationModule.AnnotationType.createAnnotation(annotation.type,start,end,annotation.text));
			}
			annotationModel.replaceAnnotations(toRemove,orionAnnotations);
		}

	};

});

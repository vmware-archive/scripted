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
// All api provided in here should not provide direct access to
// perform operations on specific / individual editor instances
// but rather register callback to extend the behavior of
// all editor instances.
//
// Operations on individual editor instances are provided
// via the apis in 'editore-wrapper.js'. Typically callbacks registered
// with the 'editor-extensions' api will get access to a specific
// editor instance.

define(function (require) {

	//Priorities determine the order in which hook methods registered with the same hook
	// will execute.
	// Higher priority hooks will be executed first.

	var MARKER_PRIORITY = -100; // Typically 'marker computers' will create marker annotations
								// but don't modify the text. Since text modification may obliterate
								// annotations in the text, marker creators should execute after
								// things that modify the contents of the editor.
	var TEXT_TRANSFORM_PRIORITY = 100; //Text transforms modify the contents of editor so typically
										// should execute before things that add annotations.

	var when = require('when');
	var deref = require('scripted/utils/deref');
	var actions = require('scripted/keybindings/action-info');

	var saveHooks = require('scripted/editor/save-hooks');

	var editorUtils = require('scripted/utils/editorUtils');
	var annotationModule = require('orion/textview/annotations');
	var annotationManager = require('scripted/editor/annotationManager');

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

	function logError(err) {
		console.log(err);
		if (err.stack) {
			console.log(err.stack);
		}
	}

	return {

		/**
		 * Add an annotation computer function. The computer function
		 * is given access to an editor instance and is expected return
		 * an array of marker's to be shown in that editor.
		 * <p>
		 * The marker computer may be called at different stages in the
		 * editor's lifetime. Currently this is 'on load' when the contents
		 * of the editor is first loaded from file and 'on save' when
		 * the contents of the editor is saved by the user.
		 * <p>
		 * The computer does not need to worry about the marker's life time
		 * any marker created by the same computer on the current editor on a
		 * previous run will be erased from the annotations model each time the
		 * computer is executed.
		 */
		addAnnotationComputer: function (computer) {

			function managedAnnotationComputer(editor) {

				return when(undefined, function () {
					//Exception thrown by this function will become a 'rejected' promise.
					return computer(editor.getScriptedProxy());
				}).then(function (newAnnotations) {

					if (!newAnnotations) {
						//Assume a falsy return/resolve value means 'leave markers alone'.
						//The computer should explicitly return [] to say 'clear markers'.
						return;
					}

					annotationManager.ensureEditorConfiguredWithAnnotations(editor);
					var annotationModel = editor.getAnnotationModel();
					var textModel = annotationModel.getTextModel();

					//Check the existing annotations for any that where created by us (i.e. this very
					// same hookfun! These are supposed to be managed by us and so should be removed when
					// we recomputed our markers.
					var toRemove = [];
					var existingIter = annotationModel.getAnnotations(0, textModel.getCharCount());
					while (existingIter.hasNext()) {
						var existingAnno = existingIter.next();
						if (managedAnnotationComputer === existingAnno.scriptedCreatedBy) {
							toRemove.push(existingAnno);
						}
					}

					var orionAnnotations = [];
					for (var a = 0; a < newAnnotations.length; a++) {
						var annotation = newAnnotations[a];
						var start, end;
						if (annotation.start) {
							start = annotation.start;
							if (annotation.end) {
								end = annotation.end;
							} else {
								end = start + 1;
							}
						} else {
							start = textModel.getLineStart(annotation.line - 1);
							end = start + 1;
						}
						var orionAnnot = annotationModule.AnnotationType.createAnnotation(annotation.type, start, end, annotation.text);
						orionAnnot.scriptedCreatedBy = managedAnnotationComputer; //so we can recognize our own annotations and remove them.
						orionAnnotations.push(orionAnnot);
					}

					annotationModel.replaceAnnotations(toRemove, orionAnnotations);
				}).otherwise(function (err) {
					//Annotation computer misbehaved? Log an error but
					//don't reject the whole operation! Should give other hooks
					//a chance to still do their thing.
					logError(err);
				});
			}
			managedAnnotationComputer.priority = MARKER_PRIORITY;

			saveHooks.onPreSave(managedAnnotationComputer);
		},

		/**
		 * Add a save transform function. The function is called just prior to
		 * saving the contents of the editor and is given a chance to transform the text
		 * in the editor.
		 *
		 * The transformFun receives only one parameter, a reference to the editor.
		 * The editor instance can be used to retrieve the text in the editor, and
		 * important context information such as the filepath of the file in the editor
		 * and configuration data read from the .scripted file.
		 *
		 * Upon returning the transformfun is expected to return a string to replace
		 * the current contents of the editor. It may also return undefined in which
		 * case the text is left unchanged.
		 *
		 * Note that it is also possible to call operations such as 'setText' on the
		 * editor but such uses are discouraged.
		 *
		 * @param {function(editor:Editor):Object):String?} transformFun
		 */
		addSaveTransform: function (transformFun) {
			function textTransformHook(editor) {
				//TODO: there's no real guarantee the config is initialized by now
				// but mostly it will be ok unless someone saves really early on in the lifecycle.
				var config = makeConfigFunction(deref(window, ['scripted', 'config' ]));
				return when(undefined, function () {
					return transformFun(editor.getScriptedProxy());
				}).otherwise(function (err) {
					//If something went wrong with this transform
					//don't reject the save. Just ignore that transform.
					if (err) {
						logError(err);
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
			}

			textTransformHook.priority = TEXT_TRANSFORM_PRIORITY;

			//Use lower-level preSave hook to grab editor text, apply transformFun
			//and put contents back into the edito
			saveHooks.onPreSave(textTransformHook);
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
				handler : {
					writable:false, configurable:false, enumerable: true,
					value: function(editor) {
						return spec.handler(editor.getScriptedProxy());
					}
				}
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
		}

	};

});

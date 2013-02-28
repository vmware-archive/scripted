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
 *   Andy Clement - Initial implementation
 *   Kris De Volder - Use specific 'annotationComputer' API.
 ******************************************************************************/

/**
 * Plugin sample: marker-adding-plugin
 * This plugin shows how to add new annotations to the text.
 *
 * Notes:
 * - annotations have a type name, expressed via a dotted notation.
 * - the lifecycle of annotations is managed by the annotationComputer api.
 *   When a annotationComputer returns new annotations for a particular editor, the
 *   previous annotations it created will be removed automatically.
 * - the annotation computer may be invoked at different points in the editor
 *   lifecycle. Presently it is only called on 'save' but it probably also
 *   makes sense to call it on 'load' to produce initial annotations when a file is opened.
 * - the styling is done via a few lines of css. See styling.css:
 */
define(function (require) {

	var editorApi = require('scripted/api/editor-extensions');

	var pathExp = new RegExp('.*\\.js$');

	// Register the new annotation type
	editorApi.registerAnnotationType('example.message');

	// Load the styling for our annotation
	editorApi.loadCss(require('text!./styling.css'));

	// Register an 'annotation computer'.
	// This will locate the names of fruits in the text and
	// mark them by adding annotations to the editor.
	editorApi.addAnnotationComputer(function (editor) {
		// Only interested in .js files
		var path = editor.getFilePath();
		if (!path || !pathExp.test(path)) {
			return;
		}
		var text = editor.getText();
		var fruits = ['apple', 'banana', 'kiwi', 'orange'];

		var annotations=[];
		for (var f=0; f<fruits.length; f++) {
			var fruit = fruits[f];
			var index = text.indexOf(fruit);
			while (index!=-1) {
				annotations.push({
					type:'example.message',
					start:index,
					end:index+fruit.length,
					text:'Found '+fruit
				});
				index = text.indexOf(fruit,index+1);
			}
		}
		return annotations;
	});

	console.log('Annotation adding sample plugin');

});

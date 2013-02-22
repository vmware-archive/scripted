/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Andy Clement
 *******************************************************************************/

// TODO could introduce the notion of annotation types only for some file suffixes
/**
 * This modules maintains a list of non-standard annotations that could be shown in an editor.
 */
define(function(require) {

	var annotationModule = require('orion/textview/annotations');

	var _annotationTypes = [];

	/**
	 * @param {String} annotationType the new annotation type, should be a dotted name with at least two components.
	 */
	var registerAnnotationType = function (annotationTypeName, lineStyling) {
		// annotationType will be a string, e.g. 'plugin.example.foo'

		// Build the orion form annotation type and register it
		var index = annotationTypeName.lastIndexOf('.');
		var suffix = annotationTypeName.substring(index+1);
		var properties = {
			title: suffix,
			style: {styleClass: "annotation "+suffix},
			html: "<div class='annotationHTML "+suffix+"'></div>",
			overviewStyle: {styleClass: "annotationOverview "+suffix}
		};
		if (lineStyling) {
			properties.lineStyle = {styleClass: "annotationLine " + suffix}; //$NON-NLS-0$
		} else {
			properties.rangeStyle = {styleClass: "annotationRange " + suffix}; //$NON-NLS-0$
		}
		annotationModule.AnnotationType.registerType(annotationTypeName,properties);
		_annotationTypes.push(annotationTypeName);
	};

	/**
	 * Ensure the annotation types are registered with the three important
	 * areas of the editor. The main body, the left hand annotation ruler
	 * and the right hand overview ruler.
	 */
	var ensureEditorConfiguredWithAnnotations = function (editor) {
		var annotationStyler = editor.getAnnotationStyler();
		var annotationRuler = editor.getAnnotationRuler();
		var annotationOverviewRuler = editor.getOverviewRuler();
		for (var i=0;i<_annotationTypes.length;i++) {
			var annotationType = _annotationTypes[i];
			if (!editor.getAnnotationStyler().isAnnotationTypeVisible()) {
				annotationStyler.addAnnotationType(annotationType);
				annotationRuler.addAnnotationType(annotationType);
				annotationOverviewRuler.addAnnotationType(annotationType);
			}
		}
	};

	return {
		registerAnnotationType: registerAnnotationType,
		ensureEditorConfiguredWithAnnotations: ensureEditorConfiguredWithAnnotations
	};
});

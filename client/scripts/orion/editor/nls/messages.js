/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/

/*global define*/

define(['orion/textview/i18n!orion/editor/nls/messages'], function(bundle) {
	var result = {
		root: {
			"Comment": "Comment",
			"Flat outline": "Flat outline",
			"incrementalFind": "Incremental find: ${0}",
			"incrementalFindNotFound": "Incremental find: ${0} (not found)",
			"find": "Find...",
			"undo": "Undo",
			"redo": "Redo",
			"cancelMode": "Cancel Current Mode",
			"findNext": "Find Next Occurrence",
			"findPrevious": "Find Previous Occurrence",
			"incrementalFindKey": "Incremental Find",
			"indentLines": "Indent Lines",
			"unindentLines": "Unindent Lines",
			"moveLinesUp": "Move Lines Up",
			"moveLinesDown": "Move Lines Down",
			"copyLinesUp": "Copy Lines Up",
			"copyLinesDown": "Copy Lines Down",
			"deleteLines": "Delete Lines",
			"gotoLine": "Goto Line...",
			"gotoLinePrompty": "Goto Line:",
			"nextAnnotation": "Next Annotation",
			"prevAnnotation": "Previous Annotation",
			"expand": "Expand",
			"collapse": "Collapse",
			"expandAll": "Expand All", 
			"collapseAll": "Collapse All",
			"lastEdit": "Last Edit Location",
			"toggleLineComment": "Toggle Line Comment",
			"addBlockComment": "Add Block Comment",
			"removeBlockComment": "Remove Block Comment",
			"linkedModeEntered": "Linked Mode entered",
			"linkedModeExited": "Linked Mode exited",
			"syntaxError": "Syntax Error",
			"contentAssist": "Content Assist",
			"lineColumn": "Line ${0} : Col ${1}"
		}
	};
	Object.keys(bundle).forEach(function(key) {
		if (typeof result[key] === 'undefined') {
			result[key] = bundle[key];
		}
	});
	return result;
});

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

define(['orion/textview/i18n!orion/textview/nls/messages'], function(bundle) {
	var result = {
		root: {
			"multipleAnnotations": "Multiple annotations:", //$NON-NLS-1$ //$NON-NLS-0$
			"line": "Line: ${0}", //$NON-NLS-1$ //$NON-NLS-0$
			"breakpoint": "Breakpoint", //$NON-NLS-1$ //$NON-NLS-0$
			"bookmark": "Bookmark", //$NON-NLS-1$ //$NON-NLS-0$
			"task": "Task", //$NON-NLS-1$ //$NON-NLS-0$
			"error": "Error", //$NON-NLS-1$ //$NON-NLS-0$
			"warning": "Warning", //$NON-NLS-1$ //$NON-NLS-0$
			"matchingSearch": "Matching Search", //$NON-NLS-1$ //$NON-NLS-0$
			"currentSearch": "Current Search", //$NON-NLS-1$ //$NON-NLS-0$
			"currentLine": "Current Line", //$NON-NLS-1$ //$NON-NLS-0$
			"matchingBracket": "Matching Bracket", //$NON-NLS-1$ //$NON-NLS-0$
			"currentBracket": "Current Bracket", //$NON-NLS-1$ //$NON-NLS-0$
			// SCRIPTED
			"markOccurrences": "Occurrence"
		}
	};
	Object.keys(bundle).forEach(function(key) {
		if (typeof result[key] === 'undefined') { //$NON-NLS-0$
			result[key] = bundle[key];
		}
	});
	return result;
});
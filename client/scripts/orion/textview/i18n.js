/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define */
define({
	load: function(name, parentRequire, onLoad, config) {
		if (parentRequire.specified && parentRequire.specified("orion/bootstrap")) { //$NON-NLS-0$
			parentRequire(["orion/i18n!" + name], function(languages) { //$NON-NLS-0$
				onLoad(languages);
			});
		} else {
			onLoad({});
		}
	}
});
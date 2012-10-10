/*******************************************************************************
 * @license
 * Copyright (c) 2011 VMware Inc and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: VMware Inc. - initial API and implementation
 ******************************************************************************/

/**
 * This module defines a wrapper for commonjs style assertions so that they can be used with qunit.
 * The wrapper list is not complete.  Add more as needed.
 */
/*global define assert window start */
define({
	equal : assert.equal,
	notEqual : assert.notEqual,
	ok : assert.ok,
	fail : function(msg) { this.ok(false, msg); },
	deepEqual : assert.deepEqual,
	start : start
});

// ensures that the indexerWorker is not initialized
window.isTest = true;
/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define */
/*jslint browser:true*/

/**
 * Provides common functions (dojo bug workarounds) for Orion dialogs.
 */

define(['dojo', 'dijit'], function(dojo, dijit) {

dojo.declare("scripted.widgets._OrionDialogMixin", null, {
	postMixInProperties : function() {
		this.inherited(arguments);
		this.title = this.options.title || "Information Needed";
		this.buttonCancel = "Cancel";
	},
	postCreate: function() {
		this.inherited(arguments);
		dojo.connect(this, "onKeyPress", dojo.hitch(this, function(evt) {
			if (evt.keyCode === dojo.keys.ENTER) {
				this._onSubmit();
			}
		}));
	},
	onHide: function() {
		// This assumes we don't reuse the dialog
		this.inherited(arguments);
		setTimeout(dojo.hitch(this, function() {
			// Workaround for dojo bug #12534
			// Remove the focus from my nodes before destroying.
			// Remove this workaround in dojo 1.7 when bug #12534 is fixed
			if (dojo.isDescendant(dijit._curFocus, this.domNode)) {
				dijit._curFocus = null;
			}
			if (dojo.isDescendant(dijit._prevFocus, this.domNode)) {
				dijit._prevFocus = null;
			}
			this.destroyRecursive(); 
		}), this.duration);   
	}
});

});

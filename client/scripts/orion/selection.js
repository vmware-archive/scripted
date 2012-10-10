/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
 /*global define */
 
define(["dojo"], function(dojo){

	/**
	 * Constructs a new selection service. Clients should obtain a selection service
	 * by requesting the service <tt>orion.page.selection</tt> from the service registry.
	 * This service constructor is only intended to be used by page service registry
	 * initialization code.
	 * @name orion.selection.Selection
	 * @class Can provide one or more selections describing objects of interest.  Used to
	 * establish input and output relationships between components.  For example, the selection
	 * in one component can serve as the input of another component.
	 */	
	function Selection(serviceRegistry, selectionServiceId) {
		if (!selectionServiceId)
			selectionServiceId = "orion.page.selection";
		
		this._serviceRegistry = serviceRegistry;
		if (serviceRegistry) {
			this._serviceRegistration = serviceRegistry.registerService(selectionServiceId, this);
		}
		this._selections = [];
	}
	 
	Selection.prototype = /** @lends orion.selection.Selection.prototype */ {
		/**
		 * Obtains the current single selection and passes it to the provided function.
		 * @param onDone The function to invoke with the selection
		 */
		getSelection : function(onDone) {
			//TODO this should return a promise rather than having an onDone parameter
			onDone(this._getSingleSelection());
		},
		
		/**
		 * Obtains all current selections and passes them to the provided function.
		 * @param onDone The function to invoke with the selections
		 */
		getSelections: function(onDone) {
			onDone(this._selections);
		},
		
		_getSingleSelection: function() {
			if (this._selections && this._selections.length > 0) {
				return this._selections[0];
			} 
			return null;
		},
		
		/**
		 * Sets the current selection
		 * @param itemOrArray A single selected item or an array of selected items
		 */
		setSelections: function(itemOrArray) {
			if (dojo.isArray(itemOrArray)) {	
				this._selections = itemOrArray;
			} else if (itemOrArray) {
				this._selections = [itemOrArray];
			} else {
				this._selections = null;
			}
			this._serviceRegistration.dispatchEvent("selectionChanged", this._getSingleSelection(), this._selections);
		}
	};
	Selection.prototype.constructor = Selection;

	//return module exports
	return {Selection: Selection};
});

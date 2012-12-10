/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

// A factory for creating different kinds of panes

// Interface:
//    functions:
//    registerPane(id, cb)
//    createPane(id, kind) : pane  (kind is either main or side)
//    destroyPane(pane)
//    events:
//    paneCreated
//    paneDestroyed

/*jslint browser:true */
/*global define scriptedLogger */

define(['jquery'], function() {
	var paneRegistry = {};
	
	var panes = [];
	
	return {
		registerPane : function(id, callback) {
			paneRegistry[id] = callback;
		},
		
		createPane : function(id, kind, options) {
			if (!paneRegistry.hasOwnProperty(id)) {
				throw new Error("Unknown pane kind: " + id);
			}
			try {
				if (!options) {
					options = { kind : kind };
				} else if (!options.kind) {
					options.kind = kind;
				}
				var pane = paneRegistry[id](options);
				panes.push(pane);
				pane.paneId = id;
				
				if (kind === "main") {
					pane.isMain = true;
					
					// TODO perform a check to ensure only one main at a time
				}
				
				$(document).trigger('paneCreated', pane);
			} catch (e) {
				scriptedLogger.error(e.message, "PANE");
				return null;
			}
		},
		
		getMainPane : function() {
			for (var i = 0; i < panes.length; i++) {
				if (panes[i].isMain) {
					return panes[i];
				}
			}
		},
		
		getSubPanes : function() {
			var subPanes = [];
			for (var i = 0; i < panes.length; i++) {
				if (!panes[i].isMain) {
					subPanes.push(panes[i]);
				}
			}
			return subPanes;
		},
		
		getPanes : function(id) {
			if (!id) {
				return panes;
			} else {
				return panes.filter(function(item) {
					if (item.paneId === id) {
						return item;
					} else {
						return undefined;
					}
				});
			}
		},
		
		/**
		 * Shortcut for getting the first pane of the given kind
		 * null if doesn't exist
		 */
		getPane : function(id, isMain) {
			for (var i = 0; i < panes.length; i++) {
				if (panes[i].paneId === id && ((!isMain) !== (!panes[i].isMain))) {
					return panes[i];
				}
			}
			return null;
		},
		
		destroyPane : function(pane) {
			var found = false;
			for (var i = 0; i < panes.length; i++) {
				if (panes[i] === pane) {
					panes.slice(i, 1);
					if (typeof pane.destroy === 'function') {
						pane.destroy();
						found = true;
						break;
					}
				}
			}
			
			if (found) {
				$(document).trigger('paneDestroyed', pane);
			} else {
				throw new Error("Tried to remove a pane that doesn't exist");
			}
		}
	};
});
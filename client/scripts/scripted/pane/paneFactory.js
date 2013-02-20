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
//    getMainPane : returns just the main pane
//    getPanes(id) : returns all panes as an array if id is included, only returns panes with the given id
//    getPane(id,isMain) : returns the first pane with the given id
//    getSidePanes : returns all side panes as an array
//    events:
//    paneCreated
//    paneDestroyed

/*jslint browser:true */
/*global define confirm */

define(['scriptedLogger', 'jquery'], function(scriptedLogger) {
	var paneRegistry = {};

	var panes = [];

	// sustom confirm navigation support.  Usable for testing to disable popups
	var confirmer;

	return {
		registerPane : function(id, callback) {
			paneRegistry[id] = callback;
		},

		createPane : function(id, kind, options) {
			if (!paneRegistry.hasOwnProperty(id)) {
				throw new Error("Unknown pane kind: " + id);
			}
			try {
				if (!kind) {
					kind = "main";
				}
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
				return pane;
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

		getSidePanes : function() {
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
					return item.paneId === id;
				});
			}
		},

		/**
		 * Shortcut for getting the first pane of the given kind
		 * null if doesn't exist.  If isMain, then returns only the main
		 * pane if it matches the id.  Else ignores the main pane and
		 * only looks at side panes.
		 *
		 * @param {String} id the id of the pane to retrieve
		 * @param {Boolean} isMain (optional).  If true, then only look for the main pane, if false, then only look for sub panes.
		 * @return {{id:String,isMain:Boolean,isDirty:function():Boolean,confirm:function():Boolean,destroy:function()}} the pane matching the id and the isMain setting.  Will return null if no panes are found.  If multiple panes of same
		 * id exist, will only return one of them.
		 */
		getPane : function(id, isMain) {
			for (var i = 0; i < panes.length; i++) {
				if (panes[i].paneId === id && ((!isMain) === (!panes[i].isMain))) {
					return panes[i];
				}
			}
			return null;
		},

		destroyPane : function(pane, confirm) {
			var found = false;
			for (var i = 0; i < panes.length; i++) {
				if (panes[i] === pane) {
					found = true;
					if (!confirm || this.confirmNavigation(pane)) {
						panes.splice(i, 1);
						if (typeof pane.destroy === 'function') {
							pane.destroy();
						}
					}
					break;
				}
			}

			if (found) {
				$(document).trigger('paneDestroyed', pane);
			} else {
				throw new Error("Tried to remove a pane that doesn't exist");
			}
		},

		_setNavigationConfirmer : function(callback) {
			confirmer = callback;
		},

		/**
		 * If the pane is dirty, pop-up a message to confirm navigation away from the pane
		 * @param {{contfirm:function():boolean}} pane the pane
		 * @return boolean true iff navigation should occur
		*/
		confirmNavigation : function(pane) {
			if (pane && typeof pane.isDirty === 'function' && pane.isDirty()) {
				if (confirmer) {
					// non-blocking mode for tests
					confirmer(true);
					return true;
				} else {
					// TODO don't use confirm.  use a custom dialog for this
					return typeof pane.confirm === 'function' ?
						pane.confirm() :
						confirm("Editor has unsaved changes.  Are you sure you want to leave this page?  Your changes will be lost.");
				}
			} else {
				if (confirmer) {
					confirmer(false);
				}
				return true;
			}
		}
	};
});
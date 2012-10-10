/*******************************************************************************
 * Copyright (c) 2010, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 *		Silenio Quarti (IBM Corporation) - initial API and implementation
 ******************************************************************************/
 
/*global define */
define("orion/textview/eventTarget", [], function() {
	/** 
	 * Constructs a new EventTarget object.
	 * 
	 * @class 
	 * @name orion.textview.EventTarget
	 */
	function EventTarget() {
	}
	/**
	 * Adds in the event target interface into the specified object.
	 *
	 * @param {Object} object The object to add in the event target interface.
	 */
	EventTarget.addMixin = function(object) {
		var proto = EventTarget.prototype;
		for (var p in proto) {
			if (proto.hasOwnProperty(p)) {
				object[p] = proto[p];
			}
		}
	};
	EventTarget.prototype = /** @lends orion.textview.EventTarget.prototype */ {
		/**
		 * Adds an event listener to this event target.
		 * 
		 * @param {String} type The event type.
		 * @param {Function|EventListener} listener The function or the EventListener that will be executed when the event happens. 
		 * @param {Boolean} [useCapture=false] <code>true</code> if the listener should be trigged in the capture phase.
		 * 
		 * @see #removeEventListener
		 */
		addEventListener: function(type, listener, useCapture) {
			if (!this._eventTypes) { this._eventTypes = {}; }
			var state = this._eventTypes[type];
			if (!state) {
				state = this._eventTypes[type] = {level: 0, listeners: []};
			}
			var listeners = state.listeners;
			listeners.push({listener: listener, useCapture: useCapture});
		},
		/**
		 * Dispatches the given event to the listeners added to this event target.
		 * @param {Event} evt The event to dispatch.
		 */
		dispatchEvent: function(evt) {
			if (!this._eventTypes) { return; }
			var type = evt.type;
			var state = this._eventTypes[type];
			if (state) {
				var listeners = state.listeners;
				try {
					state.level++;
					if (listeners) {
						for (var i=0, len=listeners.length; i < len; i++) {
							if (listeners[i]) {
								var l = listeners[i].listener;
								if (typeof l === "function") {
									l.call(this, evt);
								} else if (l.handleEvent && typeof l.handleEvent === "function") {
									l.handleEvent(evt);
								}
							}
						}
					}
				} finally {
					state.level--;
					if (state.compact && state.level === 0) {
						for (var j=listeners.length - 1; j >= 0; j--) {
							if (!listeners[j]) {
								listeners.splice(j, 1);
							}
						}
						if (listeners.length === 0) {
							delete this._eventTypes[type];
						}
						state.compact = false;
					}
				}
			}
		},
		/**
		 * Returns whether there is a listener for the specified event type.
		 * 
		 * @param {String} type The event type
		 * 
		 * @see #addEventListener
		 * @see #removeEventListener
		 */
		isListening: function(type) {
			if (!this._eventTypes) { return false; }
			return this._eventTypes[type] !== undefined;
		},		
		/**
		 * Removes an event listener from the event target.
		 * <p>
		 * All the parameters must be the same ones used to add the listener.
		 * </p>
		 * 
		 * @param {String} type The event type
		 * @param {Function|EventListener} listener The function or the EventListener that will be executed when the event happens. 
		 * @param {Boolean} [useCapture=false] <code>true</code> if the listener should be trigged in the capture phase.
		 * 
		 * @see #addEventListener
		 */
		removeEventListener: function(type, listener, useCapture){
			if (!this._eventTypes) { return; }
			var state = this._eventTypes[type];
			if (state) {
				var listeners = state.listeners;
				for (var i=0, len=listeners.length; i < len; i++) {
					var l = listeners[i];
					if (l && l.listener === listener && l.useCapture === useCapture) {
						if (state.level !== 0) {
							listeners[i] = null;
							state.compact = true;
						} else {
							listeners.splice(i, 1);
						}
						break;
					}
				}
				if (listeners.length === 0) {
					delete this._eventTypes[type];
				}
			}
		}
	};
	return {EventTarget: EventTarget};
});

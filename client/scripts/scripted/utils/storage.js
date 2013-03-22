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
 *     Andrew Eisenberg - initial API and implementation
 *         Andy Clement
 ******************************************************************************/
 /*global */
 /*jshint browser:true */

/**
 * This module handles all requests for localStorage.  It properly clears out storage
 * when required.
 */
define(["scriptedLogger"], function(scriptedLogger) {

	var thresholds = [
		{ text: "two days", time: 1000 * 60 * 60 * 24 * 2 },
		{ text: "one day", time: 1000 * 60 * 60 * 24 },
		{ text: "six hours", time: 1000 * 60 * 60 * 6 },
		{ text: "one hour", time: 1000 * 60 * 60 },
		{ text: "two minutes", time: 1000 * 60 * 2 }
	];

	return {

		preferenceNavigatorVisible: "scripted.preference.navigatorVisible",
		preferenceNavigatorWidth: "scripted.navigatorWidth",

		/**
		 * Adds a key/value pair into local storage.  If quota is exceeded, then storage will be partially purged
		 * to make room for the new entry
		 */
		safeStore: function(key, value, includeTimestamp, depth) {
			try {
				depth = depth ? depth : 0;
				if (depth < thresholds.length) {
					localStorage.setItem(key, value);
				} else {
					scriptedLogger.warn("Tried to add to local storage: " + key, "STORAGE");
					scriptedLogger.warn("Tried too many times. Ignoring request.", "STORAGE");
				}
			} catch (e) {
				if (e.name.indexOf('QUOTA')>=0 || e.name === "QuotaExceededError") { // Chrome: "QUOTA_EXCEEDED_ERR" or "QuotaExceededError", FireFox: "NS_ERROR_DOM_QUOTA_REACHED", other browsers
					scriptedLogger.warn("Tried to add to local storage: " + key + " : " + value.toString().length+ " bytes", "STORAGE");
					scriptedLogger.warn("Local storage quota exceeded. Purging parts of local storage and trying again", "STORAGE");
					if (thresholds[depth]) {
						var threshold = thresholds[depth];
						scriptedLogger.warn("Purging keys that are " + threshold.text + " old or later", "STORAGE");
						this.purgeByTimestamp(threshold.time);
						this.safeStore(key, value, includeTimestamp, depth+1);
					} else {
						// last try or else warn that there was a failure
						this.unsafeStore(key, value);
					}
				} else {
					scriptedLogger.error(e);
				}
			}
		},

		safeStoreBoolean: function(key, value, includeTimestamp, depth) {
			if (typeof value !== 'boolean') {
				throw "safeStoreBoolean is for boolean values";
			}
			var toStore = value?'true':'false';
			this.safeStore(key,toStore,includeTimestamp,depth);
		},

		get : function(key) {
			return localStorage.getItem(key);
		},

		getBoolean : function(key) {
			var value = this.get(key);
			if (value) {
				if (value==='true') {
					return true;
				} else {
					return false;
				}
			}
			// return undefined
		},
		/**
		 * Adds a key/value pair into local storage.  If quota is exceeded, then this request will be ignored
		 */
		unsafeStore : function(key, value) {
			try {
				localStorage.setItem(key, value);
			} catch (e) {
				if (e.name === "QUOTA_EXCEEDED_ERR") {
					scriptedLogger.warn("Tried to add to local storage: " + key + " : " + value, "STORAGE");
					scriptedLogger.warn("Local storage quota exceeded. Ignoring request", "STORAGE");
				}
			}
		},

		// TODO FiXADE should be a call to the server to get the server time
		generateTimeStamp : function() {
			return new Date().getTime();
		},

		/**
		 * Specifically purges keys corresponding to index entries and their timestamps
		 */
		purgeByTimestamp : function(threshold) {
			// anything over the threshold is considered stale
			function isStale(val, currentTime) {
				var ts = parseInt(val, 10);
				if (ts) {
					return (currentTime - ts) > threshold;
				} else {
					return true;
				}
			}

			var len = localStorage.length;
			var keysToPurge = [];
			var currentTime = this.generateTimeStamp();
			for (var i = 0; i < len; i++) {
				var key = localStorage.key(i);
				if (key.indexOf('-ts') === key.length - '-ts'.length && isStale(localStorage[key], currentTime)) {
					keysToPurge.push(key);
					var otherKey = key.substring(0, key.length-'-ts'.length);
					if (localStorage[otherKey]) {
						keysToPurge.push(otherKey);
					}
				}
			}

			scriptedLogger.warn("Purging " + keysToPurge.length + " keys from local storage", "STORAGE");
			for (i = 0; i < keysToPurge.length; i++) {
				localStorage.removeItem(keysToPurge[i]);
			}
		},

		/**
		 * Warning...this method is time consuming and is only meant for testing
		 */
		storageSize : function() {
			return JSON.stringify(localStorage).length;
		}
	};
});
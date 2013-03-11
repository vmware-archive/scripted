/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *   Kris De Volder
 ******************************************************************************/
(function (define) {

define(function(require) {

	function debug_log(msg) {
		//console.log(msg);
	}

	var ALL_WHITE_SPACE = /^\s*$/;
	var JSON5 = require('json5');

	function configure(filesystem) {

		var getContents = filesystem.getContents;

		/**
		 * Tries to read data from a file and parse it as JSON data.
		 * Returns a promise. The promise resolves with the resulting data.
		 * If any part of this operation fails, the promise will still resolve
		 * with at least an empty object. All errors will be logged
		 * to the console.
		 * <p>
		 * Errors deemed serious enough to be brought to the user's attention
		 * (i.e. problems parsing the config file) will be 'reported'
		 * by adding an explanation to the object in a property called 'error'.
		 */
		function parseJsonFile(handle, callback) {
			var promise = getContents(handle).then(function (contents) {
				var data = null;
				if (!ALL_WHITE_SPACE.test(contents)) {
					try {
						data = JSON5.parse(contents);
					} catch (e) {
						data = {
							error: "Couldn't parse (JSON5) '"+handle+"'\nERROR: " + e
						};
					}
				}
				data = data || {};
				return data;
			}).otherwise(function (err) {
				debug_log(err);
				return {};
			});
			//Also support callback form so we don't have to convert all clients
			//of this function to deferred style
			if (callback) {
				promise.then(callback);
			}
			return promise;
		}

		return parseJsonFile;
	}

	return {
		configure: configure
	};
});

})(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); });
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
 
 /*global define */
 define([], function() {
	/** @type {{mockContents:{}, mockDGraph:{}}} */
	var mocks = { };
 
	// These are the signatures of the real jsdepend client
	var exports = {
		getContents: function(file, callback) { 
			callback ( mocks.mockContents ? mocks.mockContents[file] : null ); 
		},
		getDGraph: function(file, callback) {
			callback ( mocks.mockDGraph ? mocks.mockDGraph[file] : null ); 
		}
	};
	
	/**
	 * @param {Object} contents associative array mapping file paths to their contents
	 */
	exports.populateContents= function(contents) {
		mocks.mockContents = contents;
	};
	
	/**
	 * Populates the jsdpend client with data for a test
	 * @param {{files:}} mockDGraph the dependency graph to populate with
	 */
	exports.populateDGraph = function(mockDGraph) {
		mocks.mockDGraph = mockDGraph;
	};
	
	/** Clears all mocked content */
	exports.clear = function() {
		try {
			delete mocks.mockContents;
		} catch (e1) { /* ignore */ }
		try {
			delete mocks.mockDGraph;
		} catch (e3) { /* ignore */ }
	};
	
	return exports;
});
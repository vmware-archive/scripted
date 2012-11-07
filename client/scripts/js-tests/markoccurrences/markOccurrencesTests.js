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

// Tests for the mark occurrences functionality

define(["scripted/markoccurrences", "orion/assert"], function(mMarkOccurrences, assert) {
	var tests = {};
	
	var matcher = new mMarkOccurrences.SelectionMatcher();
	
	tests.testMarkOccurrences1 = function() {
		var buffer = "a";
		var res = matcher.findMatches(0, 0, buffer);
		var actualResults = {matches : [0], word : 'a'};
		
		assert.deepEqual(res, actualResults);
	};
	
	tests.testMarkOccurrences2 = function() {
		var buffer = "a";
		var res = matcher.findMatches(1, 1, buffer);
		var actualResults = {matches : [0], word : 'a'};
		
		assert.deepEqual(res, actualResults);
	};
	
	tests.testMarkOccurrences3 = function() {
		var buffer = "aaa aa";
		var res = matcher.findMatches(1, 1, buffer);
		var actualResults = {matches : [0], word : 'aaa'};
		
		assert.deepEqual(res, actualResults);
	};
	
	tests.testMarkOccurrences4 = function() {
		var buffer = "aaa aa";
		var res = matcher.findMatches(1, buffer.length, buffer);
		var actualResults = {matches : null, word : null};
		
		assert.deepEqual(res, actualResults);
	};
	tests.testMarkOccurrences5 = function() {
		var buffer = "aaa-aa";
		var res = matcher.findMatches(1, 1, buffer);
		var actualResults = {matches : [0], word : 'aaa'};
		
		assert.deepEqual(res, actualResults);
	};
	
	tests.testMarkOccurrences6 = function() {
		var buffer = "aaa-aaa";
		var res = matcher.findMatches(1, 1, buffer);
		var actualResults = {matches : [0, 4], word : 'aaa'};
		
		assert.deepEqual(res, actualResults);
	};
	
	tests.testMarkOccurrences7 = function() {
		var buffer = "aaa_aaa";
		var res = matcher.findMatches(1, 1, buffer);
		var actualResults = {matches : [0], word : 'aaa_aaa'};
		
		assert.deepEqual(res, actualResults);
	};
	
	return tests;
});
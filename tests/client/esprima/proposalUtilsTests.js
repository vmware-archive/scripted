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

// tests for proposal utils, text manipulation and matching
/*global define */
define(["plugins/esprima/proposalUtils", "orion/assert"], function(utils, assert) {

	var tests = [];
	
	
	tests['test isUpper'] = function() {
		assert.ok(utils.isUpper('A'));
		assert.ok(utils.isUpper('Z'));
		assert.ok(!utils.isUpper('a'));
		assert.ok(!utils.isUpper('z'));
		assert.ok(!utils.isUpper('0'));
	};
	tests['test startsWith'] = function() {
		assert.ok(utils.startsWith('Aaa', ''));
		assert.ok(utils.startsWith('Aaa', 'A'));
		assert.ok(utils.startsWith('Aaa', 'Aaa'));
		assert.ok(!utils.startsWith('Aaa', 'Aaaa'));
	};
	tests['test toCamelCaseParts'] = function() {
		assert.equal(utils.toCamelCaseParts('aaa'), ['aaa']);
		assert.equal(utils.toCamelCaseParts('aaaAaa'), ['aaa', 'Aaa']);
		assert.equal(utils.toCamelCaseParts('aaaAAaa'), ['aaa', 'A', 'Aaa']);
		assert.equal(utils.toCamelCaseParts('AAAA'), ['A', 'A', 'A', 'A']);
		assert.equal(utils.toCamelCaseParts('A0A1A2Aa'), ['A0', 'A1', 'A2', 'A3']);
		assert.equal(utils.toCamelCaseParts(''), ['']);
	};
	tests['test looselyMatches'] = function() {
		assert.ok(utils.looselyMatches('aaa', 'aaa'));
		assert.ok(utils.looselyMatches('a', 'aaa'));
		assert.ok(utils.looselyMatches('aAa', 'aAa'));
		assert.ok(utils.looselyMatches('aAa', 'a123Aa123'));
		assert.ok(utils.looselyMatches('SoLoWo', 'SomeLongWord'));
		// lower-case matching works too
		assert.ok(utils.looselyMatches('somelon', 'SomeLongWord'));

		assert.ok(!utils.looselyMatches('SoLoWo', 'SomeOtherLongWord'));
		assert.ok(!utils.looselyMatches('somElon', 'SomeLongWord'));
	};
});
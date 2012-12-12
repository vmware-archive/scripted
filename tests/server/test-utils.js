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
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/
 
/*global exports*/
function assertContains(test, snippet, string) {
	if (arguments.length === 1) {
		// being called as a unit test
		test.done();
		return;
	}
	
	
	test.ok(string.indexOf(snippet)!==-1,
		"Expected snippet: '"+snippet+"' not found in '"+string+"'"
	);

}

function assertEqualArrays(test, _a1, _a2) {
	var a1 = _a1.slice(); a1.sort();
	var a2 = _a2.slice(); a2.sort();
	test.equals(JSON.stringify(a1, null, '  '), JSON.stringify(a2, null, '  '));
}

exports.assertContains = assertContains;
exports.assertEqualArrays = assertEqualArrays;
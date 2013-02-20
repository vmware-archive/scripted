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
 *     Andy Clement
 ******************************************************************************/

/**
 * Some tests can tweak the default behaviour to reduce amount of asynchronous stuff going on, making them
 * easier to write (assuming they are not testing for the async behaviour)
 */
define(function() {

	var asyncBreadcrumbConstruction = true;
	var asyncEditorContentLoading = true;

	var getAsyncBreadcrumbConstruction = function() {
		return asyncBreadcrumbConstruction;
	};
	var getAsyncEditorContentLoading = function() {
		return asyncEditorContentLoading;
	};
	var setAsyncBreadcrumbConstruction = function(b) {
		asyncBreadcrumbConstruction = b;
	};
	var setAsyncEditorContentLoading = function(b) {
		asyncEditorContentLoading = b;
	};

	return {
		getAsyncBreadcrumbConstruction: getAsyncBreadcrumbConstruction,
		getAsyncEditorContentLoading: getAsyncEditorContentLoading,
		setAsyncBreadcrumbConstruction: setAsyncBreadcrumbConstruction,
		setAsyncEditorContentLoading: setAsyncEditorContentLoading
	};
});

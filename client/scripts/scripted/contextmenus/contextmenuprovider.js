/*******************************************************************************
 * @license Copyright (c) 2012 VMware, Inc. All Rights Reserved. THIS FILE IS
 *          PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 *          ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 *          CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT. You can obtain a
 *          current copy of the Eclipse Public License from
 *          http://www.opensource.org/licenses/eclipse-1.0.php
 * 
 * Contributors: Nieraj Singh - initial implementation
 ******************************************************************************/

define(
		[ 'scripted/utils/navHistory',
				'scripted/contextmenus/resourcesDialogue',
				'servlets/filesystem-client', 'jquery' ],

		function(navHistory, resourcesDialogue, fileOperationsClient) {

			var isNavigatorContext = function(context) {

			};

			var getResource = function(location) {

				var isDirectory = null;

				return {
					isDirectory : isDirectory,
					location : location
				};

			};
			var getResourceFromContextSelection = function(selectionContext) {

				if (selectionContext) {
					var target = selectionContext.currentTarget;

					if (target && $(target).size()) {
						var resource = $(target).attr('id');
						return getResource(resource);
					}
				}
			};

			var getParentPath = function(resourcePath) {

				if (typeof resourcePath === 'string') {

					var lastIndexPath = resourcePath.lastIndexOf('/');

					if (lastIndexPath > 0) {
						var parentPath = resourcePath.substr(0, lastIndexPath);
						return parentPath;
					}
				}
			};

			var getNavigatorContextMenus = function(resource) {
				var add = {
					name : "New File...",
					handler : function(selectionContext) {
						var resourceLocation = getResourceFromContextSelection(selectionContext);
						resourcesDialogue.addResource(function(
								resourceName) {
							var urlNewResource = resourceLocation.location
									+ (resourceName ? "/" + resourceName
											: "/untitled");

							navHistory.navigateToURL(urlNewResource);
							window.explorer.highlight(urlNewResource);
							alert("Resource created:" + urlNewResource);
						});
					}
				};

				var rename = {
					name : "Rename...",
					handler : function(selectionContext) {
						var resourceLocation = getResourceFromContextSelection(selectionContext);
						if (resourceLocation && resourceLocation.location) {
							resourcesDialogue
									.renameResource(function(
											resourceName) {

										var parentPath = getParentPath(resourceLocation.location);
										if (parentPath) {
											fileOperationsClient.rename(
													resourceLocation.location,
													parentPath + "/"
															+ resourceName);
											alert("Resource renamed:"
													+ resourceName);
										}

									});
						}
					}

				};

				var del = {
					name : "Delete",
					handler : function(selectionContext) {
						var resourceLocation = getResourceFromContextSelection(selectionContext);
						if (resourceLocation && resourceLocation.location) {
							resourcesDialogue
									.deleteResource(function(value) {
										fileOperationsClient
												.deleteResource(resourceLocation.location);
									});
						}
					}

				};

				return [ add, rename, del ];

			};

			var getContextMenusForSelection = function(context,
					selectionContext) {

				// get the location from the selectionContext
				var resourceLocation = getResourceFromContextSelection(selectionContext);

				return getNavigatorContextMenus(resourceLocation);
			};

			return {
				getContextMenusForSelection : getContextMenusForSelection

			};

		});
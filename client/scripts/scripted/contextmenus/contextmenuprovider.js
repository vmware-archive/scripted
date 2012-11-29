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
['scripted/utils/navHistory', 'scripted/contextmenus/resourcesDialogue', 'servlets/filesystem-client', 'scripted/utils/pathUtils', 'jquery'],

function(navHistory, resourcesDialogue, fileOperationsClient, pathUtils) {


	var getResource = function(location, isDirectory) {

			return {
				isDirectory: isDirectory,
				location: location
			};

		};

	var getResourceFromContextSelection = function(selectionContext) {

			if (selectionContext) {
				var target = selectionContext.currentTarget;

				if (target && $(target).size()) {
					var resource = $(target).attr('id');
					var type = $(target).attr('type');
					var isDir = type && type === "dir";
					return getResource(resource, isDir);
				}
			}
		};

	var getNavigatorContextMenus = function(resource) {
			var add = {
				name: "New File...",
				handler: function(selectionContext) {
					var resource = getResourceFromContextSelection(selectionContext);
					var fileCreationPath = !resource.isDirectory ? pathUtils.getDirectory(resource.location) : resource.location;
					resourcesDialogue.createDialogue(fileCreationPath).addResource(function(
					resourceName) {
						var urlNewResource = fileCreationPath + (resourceName ? '/' + resourceName : "/untitled");
						navHistory.navigateToURL(urlNewResource);
						window.explorer.highlight(urlNewResource);
					});
				}
			};

			var rename = {
				name: "Rename...",
				handler: function(selectionContext) {
					var resourceLocation = getResourceFromContextSelection(selectionContext);
					if (resourceLocation && resourceLocation.location) {
						var toRename = pathUtils.getLastSegmentFromPath(resourceLocation.location);

						if (toRename) {
							resourcesDialogue.createDialogue(toRename).renameResource(function(
							renamedResource) {

								var parentPath = pathUtils.getDirectory(resourceLocation.location);
								if (parentPath) {
									fileOperationsClient.rename(
									resourceLocation.location,
									parentPath + '/' + renamedResource);
								}
							});
						}
					}
				}

			};

			var del = {
				name: "Delete",
				handler: function(selectionContext) {
					var resourceLocation = getResourceFromContextSelection(selectionContext);
					if (resourceLocation && resourceLocation.location) {
						resourcesDialogue.createDialogue(resourceLocation.location).deleteResource(function(value) {
							fileOperationsClient.deleteResource(resourceLocation.location);
						});
					}
				}
			};

			return [add, rename, del];

		};

	var getContextMenusForSelection = function(context,
		selectionContext) {

			// get the location from the selectionContext
			var resourceLocation = getResourceFromContextSelection(selectionContext);

			return getNavigatorContextMenus(resourceLocation);
		};

	return {
		getContextMenusForSelection: getContextMenusForSelection

	};

});
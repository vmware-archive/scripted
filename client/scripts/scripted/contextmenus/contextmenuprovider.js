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


      var loggingCategory = "CONTEXT_MENU";

      var pathSeparator = pathUtils.getPathSeparator();

      var doNavigatorRefresh = function(resourceToNavigate) {
		window.explorer.fullRefresh(function() {
				if (resourceToNavigate) {
					navHistory.navigateToURL(resourceToNavigate);
					window.explorer.highlight(resourceToNavigate);
			}
		});

	};

		var performNavigatorRefreshOperation = function(operationPromise, resourceToSelect) {

				if (operationPromise) {

					// On a successful promise result, refresh navigator, and if specified, highlight and navigate
					// to a resource
					var resolveCallBack = function() {
						doNavigatorRefresh(resourceToSelect);
					};

					var errorCallBack = function(err) {
						scriptedLogger.error(err, loggingCategory);
					};

					operationPromise.then(resolveCallBack, errorCallBack);
				}
			};


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

/**
 *
 */
var getNavigatorContextMenus = function(resource) {

		var actions = [];

		var addFile = {
			name: "New File...",
			handler: function(selectionContext) {

				var fileCreationPath = !resource.isDirectory ? pathUtils.getDirectory(resource.location) : resource.location;
				resourcesDialogue.createDialogue(fileCreationPath).addResource(function(
				resourceName) {
					var urlNewResource = fileCreationPath + pathSeparator + (resourceName ? resourceName : "untitled");
					var promise = fileOperationsClient.createFile(urlNewResource);
					performNavigatorRefreshOperation(promise, urlNewResource);

				});
			}
		};
		actions.push(addFile);

		var addFolder = {
			name: "New Folder...",
			handler: function(selectionContext) {

				var folderCreationPath = !resource.isDirectory ? pathUtils.getDirectory(resource.location) : resource.location;
				resourcesDialogue.createDialogue(folderCreationPath).addResource(function(
				resourceName) {
					var urlNewResource = folderCreationPath + pathSeparator + (resourceName ? resourceName : "untitledFolder");
					var promise = fileOperationsClient.mkdir(urlNewResource);
					performNavigatorRefreshOperation(promise, urlNewResource);
				});
			}
		};
		actions.push(addFolder);

		var rename = {
			name: "Rename...",
			handler: function(selectionContext) {
				var toRename = pathUtils.getLastSegmentFromPath(resource.location);

				if (toRename) {
					resourcesDialogue.createDialogue(toRename).renameResource(function(
					renamedResource) {

						var parentPath = pathUtils.getDirectory(resource.location);
						if (parentPath) {
							var urlNewResource = parentPath + pathSeparator + renamedResource;
							var promise = fileOperationsClient.rename(
							resource.location,
							urlNewResource);
							performNavigatorRefreshOperation(promise, urlNewResource);
						}
					});
				}
			}

		};
		actions.push(rename);
        
        // For now only support deletion on files.
		if (!resource.isDirectory) {
			var del = {
				name: "Delete",
				handler: function(selectionContext) {
					
					var parent = pathUtils.getDirectory(resource.location);
					
					resourcesDialogue.createDialogue(resource.location).deleteResource(function(value) {
						var promise = fileOperationsClient.deleteResource(resource.location);
						// Navigate to parent folder.
						performNavigatorRefreshOperation(promise, parent);
					});
				}
			};
			actions.push(del);
		}


		return actions;

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
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

					if (resource) {
						var type = $(target).attr('resourceType');
						// If resourcetype is not defined, then its not
						// a navigator element context, therefore no resource can be resolved at this stage
						if (type) {
							var isDir = type === "dir";
							return getResource(resource, isDir);
						}
					}
				}
			}
		};


	/**
	 *
	 */
	var getNavigatorContextMenus = function(selectionContext) {

			var contextResource = getResourceFromContextSelection(selectionContext);

			var resourceCreationPath = function() {

					if (contextResource) {
						return !contextResource.isDirectory ? pathUtils.getDirectory(contextResource.location) : contextResource.location;

					} else {
						// Use the file system root
						return window.fsroot;
					}
				}();

			var actions = [];

			var addAction = function(action) {
					if (action) {
						actions.push(action);
					}
				};

			var getActions = function() {
					return actions;
				};

			var getMenusActions = function() {

					addAction({
						name: "New File...",
						handler: function(selectionContext) {

							resourcesDialogue.createDialogue(resourceCreationPath).addResource(function(
							resourceName) {
								var urlNewResource = resourceCreationPath + pathSeparator + (resourceName ? resourceName : "untitled");
								var promise = fileOperationsClient.createFile(urlNewResource);
								performNavigatorRefreshOperation(promise, urlNewResource);
							});
						},
						isEnabled: function() {
							return typeof resourceCreationPath !== "undefined";
						}
					});

					addAction({
						name: "New Folder...",
						handler: function(selectionContext) {

							resourcesDialogue.createDialogue(resourceCreationPath).addResource(function(
							resourceName) {
								var urlNewResource = resourceCreationPath + pathSeparator + (resourceName ? resourceName : "untitledFolder");
								var promise = fileOperationsClient.mkdir(urlNewResource);
								performNavigatorRefreshOperation(promise, urlNewResource);
							});
						},
						isEnabled: function() {
							return typeof resourceCreationPath !== "undefined";
						}
					});

					addAction({
						name: "Rename...",
						handler: function(selectionContext) {
							var toRename = pathUtils.getLastSegmentFromPath(contextResource.location);

							if (toRename) {
								resourcesDialogue.createDialogue(toRename).renameResource(function(
								renamedResource) {

									var parentPath = pathUtils.getDirectory(contextResource.location);
									if (parentPath) {
										var urlNewResource = parentPath + pathSeparator + renamedResource;
										var promise = fileOperationsClient.rename(
										contextResource.location,
										urlNewResource);
										performNavigatorRefreshOperation(promise, urlNewResource);
									}
								});
							}
						},
						isEnabled: function() {
							return typeof contextResource !== "undefined";
						}

					});

					addAction({
						name: "Delete",
						handler: function(selectionContext) {

							var parent = pathUtils.getDirectory(contextResource.location);
							var resourceNameToDelete = pathUtils.getLastSegmentFromPath(contextResource.location);
							resourcesDialogue.createDialogue(resourceNameToDelete).deleteResource(function(value) {
								var promise = fileOperationsClient.deleteResource(contextResource.location);
								// Navigate to parent folder.
								performNavigatorRefreshOperation(promise, parent);
							});
						},
						isEnabled: function() {
							return typeof contextResource !== "undefined";
						}
					});

					return getActions();

				};


			return {
				getMenusActions: getMenusActions
			};

		};

	var getContextMenusForSelection = function(context,
		selectionContext) {
			return getNavigatorContextMenus(selectionContext).getMenusActions();
		};

	return {
		getContextMenusForSelection: getContextMenusForSelection
	};

});
/*******************************************************************************
 * @license Copyright (c) 2012 - 2013 VMware, Inc. All Rights Reserved. THIS FILE IS
 *          PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 *          ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 *          CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT. You can obtain a
 *          current copy of the Eclipse Public License from
 *          http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors: Nieraj Singh - initial implementation
 ******************************************************************************/

/*global define window $*/

define(
['scripted/utils/navHistory', 'scripted/contextmenus/resourcesDialogue', 'servlets/filesystem-client', 'scripted/utils/pathUtils', 'scripted/pane/paneFactory', 'scripted/pane/sidePanelManager', 'scripted/utils/pageState', 'scriptedLogger', 'jquery'],

function(navHistory, resourcesDialogue, fileOperationsClient, pathUtils, paneFactory, sidePanelManager, pageState, scriptedLogger) {


	var loggingCategory = "CONTEXT_MENU";
	/**
	 * Pass in the URL to the resource to navigate as well as optionally the editor type to open the resource (main or sub).
	 * If no editor type is specified, it will open in main editor by default
	 */

	function ExplorerProvider(providerContext) {

		this.explorer = providerContext && providerContext.part;
		this.pathSeparator = pathUtils.getPathSeparator();

	}

	ExplorerProvider.prototype.constructor = ExplorerProvider;


	/**
	 * Wrapper call around an operation promise that performs a navigator refresh upon a promise resolve, or error logging on reject.
	 */
	ExplorerProvider.prototype.navigatorRefreshHandler = function(operationPromise, resourceToSelect, explorer) {

		if (operationPromise && operationPromise.then) {

			// On a successful promise result, refresh navigator, and if specified, highlight and navigate
			// to a resource
			var resolveCallBack = function() {
					if (explorer) {
						explorer.fullRefresh(function() {
							if (resourceToSelect) {
								navHistory.navigateToURL(resourceToSelect);
								explorer.highlight(resourceToSelect);
							}
						});
					}
				};


			var errorCallBack = function(err) {
					scriptedLogger.error(err, loggingCategory);
				};

			operationPromise.then(resolveCallBack, errorCallBack);
		}

	};

	/**
	 * Returns: { isDirectory : isDirectory, location: resourceLocation}, or null if no resource location was parsed from the given node context
	 */
	ExplorerProvider.prototype.getResourceFromContextSelection = function(nodeContext) {
		if (nodeContext && $(nodeContext).size()) {
			var resource = $(nodeContext).attr('id');

			if (resource) {
				var type = $(nodeContext).attr('resourceType');
				// If resourcetype is not defined, then its not
				// a navigator element context, therefore no resource can be resolved at this stage
				if (type) {
					var isDir = type === "dir";

					return {
						isDirectory: isDir,
						location: resource
					};
				}
			}
		}
	};


	/**
	* This API is used by the context menu to perform some action when the context menu is about to be opened on a context selection
	*/
	ExplorerProvider.prototype.onContextMenuOpen = function(nodeContext) {
		var resourceType = this.getResourceFromContextSelection(nodeContext);
		if (this.explorer && resourceType && resourceType.location) {
		       // Highlight but do not expand directory selections
		       this.explorer.highlight(resourceType.location, false);
		}
	};


	/**
	 * This API gets invoked by the context menu. The argument is a node context in the navigator element
	 */
	ExplorerProvider.prototype.getContextMenusForSelection = function(nodeContext) {

		var contextResource = this.getResourceFromContextSelection(nodeContext);

		var navigatorRefreshHandler = this.navigatorRefreshHandler;

		var explorer = this.explorer;

		var pathSeparator = this.pathSeparator;

		var resourceCreationPath = null;
		if (contextResource) {
			resourceCreationPath = !contextResource.isDirectory ? pathUtils.getDirectory(contextResource.location) : contextResource.location;

		} else {
			// Use the file system root
			resourceCreationPath = window.fsroot;
		}

		var actions = [];

		var addAction = function(action) {
				if (action) {
					actions.push(action);
				}
			};


		addAction({
			name: "New File...",
			handler: function(contextEvent) {

				resourcesDialogue.createDialogue(resourceCreationPath).addFile(function(
				resourceName) {
					var urlNewResource = resourceCreationPath + pathSeparator + (resourceName ? resourceName : "untitled");

					// pass '' as contents to avoid undefined new file
					var promise = fileOperationsClient.createFile(urlNewResource, '');

					navigatorRefreshHandler(promise, urlNewResource, explorer);

					return promise;
				});
			},
			isEnabled: function() {
				return typeof resourceCreationPath !== "undefined";
			}
		});

		addAction({
			name: "New Folder...",
			handler: function(contextEvent) {

				resourcesDialogue.createDialogue(resourceCreationPath).addFolder(function(
				resourceName) {
					var urlNewResource = resourceCreationPath + pathSeparator + (resourceName ? resourceName : "untitledFolder");
					var promise = fileOperationsClient.mkdir(urlNewResource);
					// Do not navigate to the new folder as to not close existing editors. Just refresh the navigator
					navigatorRefreshHandler(promise, urlNewResource, explorer);
					return promise;
				});
			},
			isEnabled: function() {
				return typeof resourceCreationPath !== "undefined";
			}
		});

		addAction({
			name: "Rename...",
			handler: function(contextEvent) {
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


							promise.then(function() {
								// only refresh the main editor IF the renamed file is in the main editor
								var targetPane = paneFactory.getPane("scripted.editor", true);
								var mainEditorPathToNavigate = null;

								if (targetPane) {
									var mainEditorPath = targetPane.editor.getFilePath();

									if (mainEditorPath === contextResource.location) {

										// navigate to the renamed resource if the main editor was showing the old file
										mainEditorPathToNavigate = urlNewResource;
									}
								}

								// Also check the side panel. Refresh it if the renamed file was opened in the side panel
								targetPane = paneFactory.getPane("scripted.editor", false);

								if (targetPane) {
									var paneFilePath = targetPane.editor.getFilePath();
									if (paneFilePath === contextResource.location) {
										navHistory.navigateToURL(urlNewResource, "sub");
									}
								}

								navigatorRefreshHandler(promise, mainEditorPathToNavigate, explorer);

							    pageState.removeHistoryEntry(contextResource.location);
							});

							return promise;
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
			handler: function(contextEvent) {

				var parent = pathUtils.getDirectory(contextResource.location);
				var resourceNameToDelete = pathUtils.getLastSegmentFromPath(contextResource.location);
				resourcesDialogue.createDialogue(resourceNameToDelete).deleteResource(function(value) {
					var promise = fileOperationsClient.deleteResource(contextResource.location);
					// Navigate to parent folder, if and only if the main editor is the file that is being deleted

					promise.then(function() {

						// Check if it is open in the side panel. If so, close it.
						var targetPane = paneFactory.getPane("scripted.editor", false);

						if (targetPane) {
							var paneFilePath = targetPane.editor.getFilePath();
							if (paneFilePath === contextResource.location) {
								sidePanelManager.closeSidePanel();
							}
						}

						targetPane = paneFactory.getPane("scripted.editor", true);
						var pathToNavigate = null;
						if (targetPane) {
							var mainEditorPath = targetPane.editor.getFilePath();
							if (mainEditorPath === contextResource.location) {

								// navigate to the parent if the main editor is the file that got deleted
								pathToNavigate = parent;
							}
						}
						navigatorRefreshHandler(promise, pathToNavigate, explorer);

						// Remove the old name from local history
						pageState.removeHistoryEntry(contextResource.location);
					});
					return promise;
				});
			},
			isEnabled: function() {
				return typeof contextResource !== "undefined";
			}
		});

		return actions;
	};


	/**
	 * provider context gives the provider registry to create a context menu provider that may require references to other editor parts. providerContext.part should be used
	 * pass a part that may be needed by the context menu actions. For example, providerContext.part can be set to the file explorer.
	 */
	var getContextMenuProvider = function(providerContext) {
			// Explorer provider for now. Eventually this may be a plugin framework.
			return new ExplorerProvider(providerContext);
		};

	return {
		getContextMenuProvider: getContextMenuProvider
	};

});
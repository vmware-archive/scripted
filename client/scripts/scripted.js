/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andrew Eisenberg
 *     Brian Cavalier
 ******************************************************************************/
define([
		 "scripted/utils/pageState", "servlets/jsdepend-client",
		 "scripted/exec/exec-console", "when", "scripted/editor/jshintdriver", "scripted/utils/storage",
		 "scripted/contextmenus/contextmenu", 'scripted/processConfiguration', 'scripted/utils/jshintloader'],

function(
	mPageState, mJsdepend, mExecConsole, when, mJshintDriver, storage, contextMenu, processConfiguration, jshintloader) {

	var pageState = mPageState.extractPageStateFromUrl(window.location.toString());
	return {

			init: function() {
				window.scripted = {};

				var d;

				d = when.defer();
				// TODO why is getConf on jsdepend?
				mJsdepend.getConf(pageState.main.path, function(dotScripted) {
					// Fulfill the promise with both pageState and dotScripted
					d.resolve(dotScripted);
				});

				this.configReady = d.promise;
			},

			ready : function(sLogger, fileExplorer, layoutManager) {

				this.configReady.then(function (dotScripted) {
					window.scripted.config = dotScripted;
					window.fsroot = dotScripted.fsroot;

					// Start the search for .jshintrc
					// must be called inside of configReady since jshint relies on dotScripted

					when.chain(loadJshintrc(dotScripted.jshint,pageState),jshintloader.getDeferred().resolver);
					
					var v = getNavigatorConfiguredValue(dotScripted);
					if (typeof v !== 'undefined') {
						layoutManager.toggleNavigatorVisible(v);
					}

					// Whether on screen or not, let's initialize it (could be smarter here but
					// want it to appear quickly when requested).
					initializeNavigator(fileExplorer);

					processConfiguration(dotScripted);

					// Perform navigator context menu hook-up
					contextMenu.initContextMenus('#navigator-wrapper');

					$("#navigator-header").append(document.createTextNode(window.fsroot));

					/*Side panel open/close*/
					layoutManager.doLayout(fileExplorer, pageState);

					//Report any errors getting the dotScripte configuration. This must be done near the end of setup
					//so we are sure that the various ui widgetry is already there.
					if (dotScripted.error) {
						mExecConsole.error("Problems getting scripted configuration:\n"+dotScripted.error);
					}
				});
				
				function initializeNavigator(fileExplorer) {
					var pageState = mPageState.extractPageStateFromUrl(window.location.toString());
					fileExplorer.loadResourceList(window.fsroot /*pageParams.resource*/ , false, function() {
						// highlight the row we are using
						setTimeout(function() {
							fileExplorer.highlight(pageState.main.path);
						}, 500);
					});
				}

				// Detach configReady so that it and its fulfillment value
				// can be garbage collected;
				delete this.configReady;

				function getNavigatorConfiguredValue(dotScripted) {
					if (dotScripted && dotScripted.ui) {
						var v = dotScripted.ui.navigator;
						if (typeof v !== 'undefined') {
							return v;
						}
					}
					// return undefined
				}
				
				/* Locate the nearest .jshintrc. It will look relative to the initially opened
				 * location - so ok if the .jshintrc is at the project root. But if the file is
				 * elsewhere in the tree it sometimes won't find it depending on what is opened.
				 */
				function loadJshintrc(jshintConfig, pageState) {
					// TODO fix it up to do a better job of finding it
					// TODO return value shouldn't be trampling on the config object itself, should be an object in
					// which the config is a member.
					// TODO a timing window problem does exist here - where if the .jshintrc file isn't
					// found quickly enough the first linting will not respect it. fix it!
					var deferred = when.defer();
					mJsdepend.retrieveNearestFile(pageState.main.path, window.fsroot, '.jshintrc', function(jshintrc) {
						if (jshintrc && jshintrc.fsroot) {
							// it was found at that location
							sLogger.info("Found .jshintrc at "+jshintrc.fsroot);
							if (jshintrc.error) {
								sLogger.error(jshintrc.error);
							} else {
								mJshintDriver.resolveConfiguration(jshintrc, jshintConfig);
							}
						} else {
							sLogger.info("No .jshintrc found");
							mJshintDriver.resolveConfiguration({},jshintConfig);
						}
						// FIXME: Add a call to deferred.reject() *somewhere*
						// Perhaps wrap the guts of this function in a try/catch?
						// If an exception occurs in this function, the promise
						// will remain pending forever.
						deferred.resolve();
					});
					return deferred.promise;
				}
			}
		};

	});

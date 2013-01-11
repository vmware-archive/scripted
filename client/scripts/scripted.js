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
		 "scripted/contextmenus/contextmenu"],
 
function(

	mPageState, mJsdepend, mExecConsole, when, mJshintDriver, storage, contextMenu) {

	var pageState = mPageState.extractPageStateFromUrl(window.location.toString());
	var deferred;
	return {
	
		init: function() {
			deferred = when.defer();
			mJsdepend.getConf(pageState.main.path, deferred.resolve);
		},
		
		ready : function(sLogger, fileExplorer, layoutManager) {
			deferred.then(function() {
				window.scripted = {};
				// Start the search for .jshintrc
			
				// TODO why is getConf on jsdepend?
				mJsdepend.getConf(pageState.main.path, function (dotScripted) {
					window.fsroot = dotScripted.fsroot;
					window.scripted.config = dotScripted;

					// must be called inside of getConf since jshint relies on dotScripted
					window.scripted.promises = { "loadJshintrc": loadJshintrc(pageState)};
				
					layoutManager.setNavigatorHidden(
						dotScripted &&
						dotScripted.ui &&
						dotScripted.ui.navigator===false, fileExplorer);
				
					processConfiguration(dotScripted);
				
					// Perform navigator context menu hook-up
					contextMenu.initContextMenus('#navigator-wrapper');

					/*Side panel open/close*/
					layoutManager.doLayout(fileExplorer, pageState);
				
					//Report any errors getting the dotScripte configuration. This must be done near the end of setup
					//so we are sure that the various ui widgetry is already there.
					if (dotScripted.error) {
						mExecConsole.error("Problems getting scripted configuration:\n"+dotScripted.error);
					}
				});
			});

			// Detach configReady so that it and its fulfillment value
			// can be garbage collected;
			delete this.configReady;

			function hasNavigator(dotScripted) {
				return dotScripted && dotScripted.ui && dotScripted.ui.navigator===false;
			}

			/* Locate the nearest .jshintrc. It will look relative to the initially opened
			 * location - so ok if the .jshintrc is at the project root. But if the file is
			 * elsewhere in the tree it sometimes won't find it depending on what is opened.
			 */
			function loadJshintrc(pageState) {
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
							mJshintDriver.resolveConfiguration(jshintrc);
						}
					} else {
						sLogger.info("No .jshintrc found");
						mJshintDriver.resolveConfiguration({});
					}
					deferred.resolve();
				});
				return deferred.promise;
			}
			
			/**
			 * This function will perform checks on the configuration and where appropriate ensure options are consistent.
			 * Currently, it:
			 * 1) ensures if formatter indentation is configured, it sets editor indentation options, and vice versa
			 */
			function processConfiguration(dotScripted) {

				// 1. Ensuring consistency of options across formatter and editor configuration
				// formatter configuration options:
				//  formatter.js.indent_size (number)
				//  formatter.js.indent_char (string)
				// editor configuration options:
				//  editor.expandtab (boolean)
				//  editor.tabsize (number)
				// rule: if possible (compatible), copy one config to the other
				var editor_expandtab_set = dotScripted.editor && dotScripted.editor.expandtab !== null;
				var editor_tabsize_set = dotScripted.editor && dotScripted.editor.tabsize !== null;
				var formatter_js_indent_size_set = dotScripted.formatter && dotScripted.formatter.js && dotScripted.formatter.js.indent_size !== null;
				var formatter_js_indent_char_set = dotScripted.formatter && dotScripted.formatter.js && dotScripted.formatter.js.indent_char !== null;

				// Just do the common cases for now:
				if (editor_expandtab_set || editor_tabsize_set) {
					if (!(formatter_js_indent_size_set || formatter_js_indent_char_set)) {
						if (editor_expandtab_set && dotScripted.editor.expandtab && !formatter_js_indent_char_set) {
							// Set the indent char to space
							if (!dotScripted.formatter) {
								dotScripted.formatter = {
									"js": {
										"indent_char": " "
									}
								};
							} else if (!dotScripted.formatter.js) {
								dotScripted.formatter.js = {
									"indent_char": " "
								};
							} else {
								dotScripted.formatter.js.indent_char = " ";
							}
						}
						if (editor_tabsize_set && !formatter_js_indent_size_set) {
							// Set the indent size to match the tabsize
							var tabsize = dotScripted.editor.tabsize;
							if (!dotScripted.formatter) {
								dotScripted.formatter = {
									"js": {
										"indent_size": tabsize
									}
								};
							} else if (!dotScripted.formatter.js) {
								dotScripted.formatter.js = {
									"indent_size": tabsize
								};
							} else {
								dotScripted.formatter.js.indent_size = tabsize;
							}
						}
					}
				} else {
					if (formatter_js_indent_size_set || formatter_js_indent_char_set) {
						var indent_char_isspace = formatter_js_indent_char_set && dotScripted.formatter.js.indent_char === " ";
						if (indent_char_isspace) {
							// Set the expandtab if we can
							if (!dotScripted.editor) {
								dotScripted.editor = {
									"expandtab": true
								};
							} else {
								dotScripted.editor.expandtab = true;
							}
							if (formatter_js_indent_size_set) {
								// Set the tabsize to match the indent size
								var indentsize = dotScripted.formatter.js.indent_size;
								if (!dotScripted.editor) {
									dotScripted.editor = {
										"tabsize": indentsize
									};
								} else {
									dotScripted.editor.tabsize = indentsize;
								}
							}
						}
					}
				}

			}
		}
	};

});
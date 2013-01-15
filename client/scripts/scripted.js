define(function(require) {

	var mNavHistory, mPageState, mJsdepend, mExecConsole, mWhen,
		mJshintDriver, contextMenu, processConfiguration;

	mWhen = require('when');

	mNavHistory = require('scripted/utils/navHistory');
	mPageState = require('scripted/utils/pageState');
	mJsdepend = require('servlets/jsdepend-client');
	mExecConsole = require('scripted/exec/exec-console');
	mJshintDriver = require('scripted/editor/jshintdriver');
	contextMenu = require('scripted/contextmenus/contextmenu');
	processConfiguration = require('scripted/processConfiguration');

	return {
	
		init: function() {
			window.scripted = {};

			var d, pageState;

			pageState = mPageState.extractPageStateFromUrl(window.location.toString());

			d = mWhen.defer();
			// TODO why is getConf on jsdepend?
			mJsdepend.getConf(pageState.main.path, function(dotScripted) {
				// Fulfill the promise with both pageState and dotScripted
				d.resolve({
					pageState: pageState,
					dotScripted: dotScripted
				});
			});
			
			this.configReady = d.promise;
		},
		
		ready : function(sLogger, fileExplorer, layoutManager) {

			this.configReady.then(function (config) {
				var dotScripted, pageState;

				dotScripted = config.dotScripted;
				window.scripted.config = dotScripted;
				window.fsroot = dotScripted.fsroot;

				pageState = config.pageState;

				// Start the search for .jshintrc
				// must be called inside of getConf since jshint relies on dotScripted

				window.scripted.promises = {
					"loadJshintrc": loadJshintrc(dotScripted.jshint, pageState)
				};

				layoutManager.setNavigatorHidden(hasNavigator(dotScripted), fileExplorer);
				
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
			function loadJshintrc(jshintConfig, pageState) {
				// TODO fix it up to do a better job of finding it
				// TODO return value shouldn't be trampling on the config object itself, should be an object in
				// which the config is a member.
				// TODO a timing window problem does exist here - where if the .jshintrc file isn't
				// found quickly enough the first linting will not respect it. fix it!
				var deferred = mWhen.defer();
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
						mJshintDriver.resolveConfiguration({});
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
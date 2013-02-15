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
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

// manages the side panel.  Opens, closes, etc

/*global confirm */

define(['scripted/utils/pageState', 'scripted/pane/paneFactory', "scripted/utils/storage", "scripted/utils/editorUtils", 'jquery'], function(mPageState, mPaneFactory, storage, editorUtils) {

	var sidePanel = $('#side_panel');
	
	var closeSidePanel = function() {
		if ( sidePanel.css('display') === 'none') {
			return false;
		}
		// here, go into the pane factory and destroy all panes
		var sidePanes = mPaneFactory.getSidePanes();
		var destroyed = true;
		sidePanes.forEach(function(pane) {
			destroyed = destroyed && mPaneFactory.confirmNavigation(pane);
		});
		if (destroyed) {
			sidePanel.hide();
			sidePanel.trigger('close');
			
			$(document).trigger('sidePanelClosed', sidePanel);
			sidePanes.forEach(function(pane) {
				mPaneFactory.destroyPane(pane);
			});
			$(window).resize();
			editorUtils.setFocus(false);
		}
		
		return destroyed;
	};

	var showSidePanel = function() {
		if (sidePanel.css('display') === 'block') {
			return false;
		}
		sidePanel.show();
		// restore last size if known
		var storedWidth = storage.get("scripted.sideWidth");
		if (storedWidth) {
			sidePanel.width(storedWidth);
			sidePanel.resize();
		}
		sidePanel.trigger('open');
		$(document).trigger('sidePanelShown', sidePanel);
		$(window).resize();
		editorUtils.setFocus(true);
		return true;
	};
	
	var isSidePanelOpen = function() {
		return sidePanel.css('display') !== 'none';
	};
	
	var confirmAll = function() {
		var panes = mPaneFactory.getPanes();
		var confirmed = true;
		for (var i = 0; i < panes.length; i++) {
			confirmed = mPaneFactory.confirmNavigation(panes[i]);
			if (!confirmed) {
				break;
			}
		}
		return confirmed;
	};
	

	return {
		isSidePanelOpen : isSidePanelOpen,
		showSidePanel: showSidePanel,
		closeSidePanel: closeSidePanel,
		confirmAll: confirmAll
	};
});
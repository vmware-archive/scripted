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

define(['scripted/utils/pageState', 'scripted/pane/paneFactory', 'jquery'], function(mPageState, mPaneFactory) {

	var sidePanel = $('#side_panel');
	
	var closeSidePanel = function() {
		if ( sidePanel.css('display') === 'none') {
			return false;
		}
		sidePanel.hide();
		$('#editor').css('margin-right', '0');
		sidePanel.trigger('close');
		
		$(document).trigger('sidePanelClosed', sidePanel);
		// here, go into the pane factory and destroy all panes
		if (window.subeditors && window.subeditors[0] &&
			confirmNavigation(window.subeditors[0])) {
			$('.subeditor_wrapper').remove();
			window.subeditors.pop();


			// this part should happen in an event
			// might be the dom element 'editor' or the actual editor so check for getTextview
			var editor = window.editor;
			if (editor && editor._textView) {
				editor._textView._updatePage();
				editor.getTextView().focus();
			}
		}
		return true;
	};

	var showSidePanel = function() {
		if (sidePanel.css('display') === 'block') {
			return false;
		}
		sidePanel.show();
		// restore last size if known
		var storedWidth = localStorage.getItem("scripted.sideWidth");
		if (storedWidth) {
			sidePanel.width(storedWidth);
			sidePanel.resize();
		}
		$('#editor').css('margin-right', sidePanel.width());
		sidePanel.trigger('open');
		$(document).trigger('sidePanelShown', sidePanel);
		
		return true;
	};
	
	var isSidePanelOpen = function() {
		return sidePanel.css('display') === 'none';
	}
	
	var confirmer;
	var _setNavigationConfirmer = function(callback) {
		confirmer = callback;
	};

	/**
	 * If the pane is dirty, pop-up a message to confirm navigation away from the pane
	 * @param {{contfirm:function():boolean}} pane the pane
	 * @return boolean true iff navigation should occur
	*/
	var confirmNavigation = function(pane) {
		if (pane && typeof pane.isDirty === 'function' && pane.isDirty()) {
			if (confirmer) {
				// non-blocking mode for tests
				confirmer(true);
				return true;
			} else {
				// TODO don't use confirm.  use a custom dialog for this
				return typeof pane.confirm === 'function' ?
					pane.confirm() :
					confirm("Editor has unsaved changes.  Are you sure you want to leave this page?  Your changes will be lost.");
			}
		} else {
			if (confirmer) {
				confirmer(false);
			}
			return true;
		}
	};
	
	
	
	return {
		// private function that are only exported to help with testing
		_setNavigationConfirmer : _setNavigationConfirmer,
		isSidePanelOpen : isSidePanelOpen,
		showSidePanel: showSidePanel,
		toggleSidePanel: toggleSidePanel,
		closeSidePanel: closeSidePanel,
		confirmNavigation : confirmNavigation
	};
});
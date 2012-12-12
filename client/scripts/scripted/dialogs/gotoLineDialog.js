/*******************************************************************************
 * @license
 * Copyright (c) 2012 - 2012 VMware and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Andy Clement
 *******************************************************************************/
/*global define window $*/
/*jslint browser:true*/

/*
 * The goto line dialog
 */
define(["scripted/dialogs/dialogUtils","text!scripted/dialogs/gotoLineDialog.html"],function(dialogUtils,dialogText) {
				
	/**
	 * Show (or resize) the mask and a particular dialog (e.g. '#dialog_goto_line'). The sizes are computed
	 * such that the mask fills the screen.
	 */
	var popupOrResizeMaskAndDialog = function(dialogId) {
		// get the screen height and width
	    var maskHeight = $(document).height();
	    var maskWidth = $(document).width();
	     
	    // calculate the values for center alignment
	    var dialogTop =  (maskHeight/3) - ($(dialogId).height());
	    var dialogLeft = (maskWidth/2) - ($(dialogId).width()/2);
	     
	    // assign values to the overlay and dialog box
	    $('#dialog_mask').css({height:maskHeight, width:maskWidth}).show();
	    $(dialogId).css({top:dialogTop, left:dialogLeft}).show();
	};
	
	// One off event registration (doesn't need to be repeated):
	
	// Clicking in the dialog will focus the line number field
	$('#dialog_open_resource').on('click.dialogs',function() {
		 $('#goto_line_number').focus();
		 return false;
	});

	var closeDialog = function () {
		$('#dialog_mask').hide();
		$("#dialogs").empty();
		$(this.activeElement).focus();
	};


	var openDialog = function(line, onclose) {
		this.activeElement = document.activeElement;
		
		var that = this;
		$("#dialogs").append('<div id="dialog_mask"></div>');
		$("#dialogs").append(dialogText);
		
		// Clicking the mask will hide it and the dialog
		$('#dialog_mask').off('click.dialogs');
		$('#dialog_mask').on('click.dialogs',function() {
			closeDialog();
			return false;
		});
		
		// Handle ENTER and ESCAPE keypresses on the dialog
		$('#dialog_gotoline').off('keydown.dialogs');
		$('#dialog_gotoline').on('keydown.dialogs',function( e ) {
			// Pressing ENTER triggers the button click
		    if( e.keyCode === $.ui.keyCode.ENTER ) {
		      $('#dialog_gotoline_buttonok').trigger( 'click' );
		    }
		    // Pressing ESCAPE closes the dialog (and mask) and refocuses to the original element
		    if (e.keyCode === $.ui.keyCode.ESCAPE ) {
				closeDialog.bind(that)();
		    }
		});
		
		// Handle button clicks
		$('#dialog_gotoline_buttonok').off('click.dialogs');
		$('#dialog_gotoline_buttonok').on('click.dialogs',function() {
			var line = parseInt($('#dialog_gotoline_linenumber').val(),10);
			onclose(line);
			closeDialog.bind(that)();
			return false;
		});
		
		// Handle resize events - adjust size of mask and dialog
		$(window).off('resize.dialogs');
		$(window).on('resize.dialogs',function() {
			if (!$('#dialog_mask').is(':hidden')) {
				popupOrResizeMaskAndDialog('#dialog_gotoline');
			}
		});
		
		popupOrResizeMaskAndDialog("#dialog_gotoline");
	    $('#dialog_gotoline_linenumber').val(line);
	    $('#dialog_gotoline_linenumber').focus();
	    $('#dialog_gotoline_linenumber').select();
	};

	return {
		openDialog: openDialog
	};
});

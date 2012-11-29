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

/**
 * This module is responsible for dialogs - creating them, positioning them, showing/hiding them.
 */
define([],function() {
				
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
	$('#dialog_goto_line').on('click.dialogs',function() {
		 $('#goto_line_number').focus();
		 return false;
	});

	var openDialog_gotoLine = function(line, onclose) {
		var activeElement = document.activeElement;
		
		// Clicking the mask will hide it and the dialog
		$('#dialog_mask').off('click.dialogs');
		$('#dialog_mask').on('click.dialogs',function() {
			$('#dialog_mask').hide();
			$('#dialog_goto_line').hide();
			$(activeElement).focus();
			return false;
		});
		
		// Handle ENTER and ESCAPE keypresses on the dialog
		$('#dialog_goto_line').off('keyp.dialogs');
		$('#dialog_goto_line').on('keyup.dialogs',function( e ) {
			// Pressing ENTER triggers the button click
		    if( e.keyCode === $.ui.keyCode.ENTER ) {
		      $('#dialog_goto_line_button').trigger( 'click' );
		    }
		    // Pressing ESCAPE closes the dialog (and mask) and refocuses to the original element
		    if (e.keyCode === $.ui.keyCode.ESCAPE ) {
				$('#dialog_mask,#dialog_goto_line').hide();
				$(activeElement).focus();
		    }
		});
		
		// Handle button clicks
		$('#dialog_goto_line_button').off('click.dialogs');
		$('#dialog_goto_line_button').on('click.dialogs',function() {
			var line = parseInt($('#goto_line_number').val(),10);
			$('#dialog_mask,#dialog_goto_line').hide();
			onclose(line);
			$(activeElement).focus();
			return false;
		});
		
		// Handle resize events - adjust size of mask and dialog
		$(window).off('resize.dialogs');
		$(window).on('resize.dialogs',function() {
			if (!$('#dialog_mask').is(':hidden')) {
				popupOrResizeMaskAndDialog('#dialog_goto_line');
			}
		});
		
		popupOrResizeMaskAndDialog("#dialog_goto_line");
	    $('#goto_line_number').val(line);
	    $('#goto_line_number').focus();
	    $('#goto_line_number').select();
	};

	return {
		openDialog_gotoLine: openDialog_gotoLine
	};
});

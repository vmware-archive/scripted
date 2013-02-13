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
 *     Nieraj Singh
 *******************************************************************************/
/*global define window $*/
/*jslint browser:true*/

/**
 * This module is responsible for dialogs - creating them, positioning them,
 * showing/hiding them.
 */
define(['text!scripted/contextmenus/addResourceDialogue.html', 'text!scripted/contextmenus/renameResourceDialogue.html', 'text!scripted/contextmenus/deleteResourceDialogue.html', 'when', 'jquery'], function(
addResourceDialogue, renameResourceDialogue, deleteResourceDialogue, when, $) {

	/**
	 * Show (or resize) the mask and a particular dialog. The sizes are computed
	 * such that the mask fills the screen.
	 */
	var popupOrResizeMaskAndDialog = function(dialogId) {
			// get the screen height and width
			var maskHeight = $(document).height();
			var maskWidth = $(document).width();

			// calculate the values for center alignment
			var dialogTop = (maskHeight / 3) - ($(dialogId).height());
			var dialogLeft = (maskWidth / 2) - ($(dialogId).width() / 2);

			// assign values to the overlay and dialog box
			$('#dialog_mask').css({
				height: maskHeight,
				width: maskWidth
			}).show();
			$(dialogId).css({
				top: dialogTop,
				left: dialogLeft
			}).show();
		};

	var removeDialogue = function(dialogueID) {
			$('#dialogs').empty();
			/*
			$('#dialog_mask').hide();
			$(dialogueID).remove();
			*/
		};
		
	var displayError = function(message) {
			if ($('#dialog_error_message').length > 0) {
				if (message) {
					$('#dialog_error_message').text(message);
				} else {
					$('#dialog_error_message').text("");
				}

			}
		};

	/**
	 * Operations should contain an onClose handler that returns a when promise. The promise
	 * is used to determine whether the dialogue should remain open while an operation is being performed (e.g.
	 *  waiting for a response from a server, and display the error message if one is obtained). If no promise
	 * is returned, or the promise is resolved, the dialogue will close after the onClose handler is invoked.
	 */
	var openDialogue = function(dialogueID, dialogue, operations /*should contain an onClose function that returns a promise*/ ) {

			var activeElement = document.activeElement;

			$("#dialogs").append('<div id="dialog_mask"></div>');
			$("#dialogs").append(dialogue);

			// Clicking the mask will close the dialogue (acts the same way as cancelling or escaping)
			$('#dialog_mask').off('click.dialogs');
			$('#dialog_mask').on('click.dialogs', function() {
				$('#dialog_mask').hide();
				$(dialogueID).remove();
				$(activeElement).focus();
				return false;
			});


			// Handle ENTER and ESCAPE keypresses on the dialog
			$(window).off('keyup.dialogs');
			$(window).on('keyup.dialogs', function(e) {
				// Pressing ENTER triggers the button click
				if (e.keyCode === 13/*ENTER*/) {
					$('#dialogue_ok_button').trigger('click');
				}
				// Pressing ESCAPE closes the dialog (and mask) and refocuses to the
				// original element
				if (e.keyCode === 27/*ESCAPE*/) {
					removeDialogue(dialogueID);
					$(activeElement).focus();
				}
			});

			// Handle button clicks
			$('#dialogue_ok_button').off('click.dialogs');
			$('#dialogue_ok_button').on('click.dialogs', function() {
				var value = operations.onOK ? operations.onOK() : null;
				
				// Clear error messages first
				displayError(null);

				if (operations.onClose) {

					when(operations.onClose(value)).then(function() {
						removeDialogue(dialogueID);
					}, function(err) {
						displayError(err);
					});
				}

				$(activeElement).focus();
				return false;
			});

			$('#dialogue_cancel_button').on('click.dialogs', function() {
				removeDialogue(dialogueID);
				$(activeElement).focus();
				return false;
			});

			$(window).off('resize.dialogs');
			$(window).on('resize.dialogs', function() {
				if (!$('#dialog_mask').is(':hidden')) {
					popupOrResizeMaskAndDialog(dialogueID);
				}
			});

			popupOrResizeMaskAndDialog(dialogueID);

			if (operations.onOpen) {
				operations.onOpen();
			}
		};

	var modifyResourceDialogue = function(dialogueElementName, dialogue, onClose, initialValue) {

			var onOK = function() {
					return $("#dialogue_file_name").val();
				};

			var onOpen = function() {
					if (initialValue) {
						$('#dialogue_file_name').val(initialValue);
					}
					$('#dialogue_file_name').focus();
					$('#dialogue_file_name').select();
				};

			var operations = {
				onOK: onOK,
				onOpen: onOpen,
				onClose: onClose
			};

			openDialogue(dialogueElementName, dialogue, operations);
		};


    /**
    * Returns various operations that can be performed after a dialogue is created. For example, adding a resource.
    * Each operation has the option of taking a callback function that is performed when the user closes the dialogue.
    * The callback should return a promise that when resolved, will result in the actual dialogue being closed, or if rejected,
    * will keep the dialogue open and display the rejection error. If no callback is specified, the dialogue will close immediately
    * after a user selects to close it.
    */
	var createDialogue = function(initialValue) {

			var addFile = function(onClose) {
					modifyResourceDialogue("#dialog_add_resource", addResourceDialogue, onClose, null);

					$('#dialog_message > p').text("Enter the name of the new file. Note that existing files in the same folder with the new name will be replaced.");
				};

			var addFolder = function(onClose) {
					modifyResourceDialogue("#dialog_add_resource", addResourceDialogue, onClose, null);

					$('#dialog_message > p').text("Enter the name of the new folder:");
				};

			var renameResource = function(onClose) {
					modifyResourceDialogue("#dialog_rename_resource", renameResourceDialogue, onClose, initialValue);
				};

			var deleteResource = function(onClose) {

					var operations = {
						onClose: onClose
					};

					openDialogue("#dialog_delete_resource", deleteResourceDialogue, operations);

					if (initialValue) {
						$("#dialog_message_resource_to_delete").text(initialValue);
					}

				};

			return {
				addFile: addFile,
				addFolder: addFolder,
				renameResource: renameResource,
				deleteResource: deleteResource
			};

		};

	return {
		createDialogue: createDialogue
	};
});